/**
 * game.js — socket bridge between the client and the GameRoom engine.
 *
 * Public API:
 *   startGame(io, roomId, socketIds)   → called by the lobby once a match is
 *                                         made. Loads decks, boots GameRoom,
 *                                         joins both sockets to the socket.io
 *                                         room, and emits the first state.
 *   registerGameHandlers(io, socket)   → wires the per-socket game:* events.
 *
 * Internal state:
 *   rooms          Map<roomId, GameRoom>
 *   socketToRoom   Map<socketId, roomId>    (reverse index for O(1) lookup)
 */

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import jwt from 'jsonwebtoken'
import { v4 as uuid } from 'uuid'

import GameRoom from '../game/GameRoom.js'
import { MAX_MONSTERS } from '../game/constants.js'
import { query } from '../src/db.js'

// ─── Card registry ────────────────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url))
const CARDS_PATH = join(__dirname, '../../shared/cards/registry/cards.json')
const allCards = JSON.parse(readFileSync(CARDS_PATH, 'utf-8'))
const cardsById = new Map(allCards.map((c) => [c.id, c]))

// ─── Auth ─────────────────────────────────────────────────────────────────────

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-only-change-me'

function getUserIdFromSocket(socket) {
  const token = socket?.handshake?.auth?.token
  if (!token || typeof token !== 'string') return null
  try {
    const payload = jwt.verify(token, JWT_SECRET)
    const userId = Number(payload.sub)
    return Number.isInteger(userId) ? userId : null
  } catch {
    return null
  }
}

// ─── Shared state ─────────────────────────────────────────────────────────────

/** @type {Map<string, import('../game/GameRoom.js').default>} */
const rooms = new Map()
/** @type {Map<string, string>} */
const socketToRoom = new Map()

/**
 * Pending disconnect timers, keyed by roomId. When a player's socket drops
 * we schedule the "opponent wins" emit after a grace period so a quick
 * reconnect (tab refresh, Lobby→Game socket churn) doesn't instantly end
 * the match. Cleared by `game:join`.
 * @type {Map<string, NodeJS.Timeout>}
 */
const disconnectTimers = new Map()
/** Milliseconds a player has to reconnect before the opponent is declared winner. */
const RECONNECT_GRACE_MS = 15000

function ts() {
  return new Date().toISOString()
}

function log(event, ...args) {
  console.log(`[${ts()}] [game] ${event}`, ...args)
}

// ─── Deck hydration ───────────────────────────────────────────────────────────

/**
 * Load the active saved deck for a user and inflate each cardId into a
 * CardInstance (CardDefinition fields spread + unique instanceId).
 */
async function loadDeckForUser(userId) {
  if (!userId) return []

  const rows = await query(
    'SELECT card_ids FROM decks WHERE user_id = ? AND is_active = 1 ORDER BY id DESC LIMIT 1',
    [Number(userId)],
  )
  if (!rows[0]) return []

  const raw = rows[0].card_ids
  const cardIds =
    typeof raw === 'string'
      ? JSON.parse(raw)
      : Array.isArray(raw)
        ? raw
        : []

  const deck = []
  for (const cardId of cardIds) {
    const def = cardsById.get(cardId)
    // Silently skip unknown card IDs — means the registry changed after the
    // deck was saved. Better to start with a smaller deck than to crash.
    if (!def) continue
    deck.push({
      instanceId: uuid(),
      cardId: def.id,
      isEssence: false,
      ...def,
    })
  }
  return deck
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getRoom(socket) {
  const roomId = socketToRoom.get(socket.id)
  if (!roomId) return null
  return rooms.get(roomId) ?? null
}

function getPlayerIndex(socket, room) {
  if (!room) return -1
  if (room.state.players[0].id === socket.id) return 0
  if (room.state.players[1].id === socket.id) return 1
  return -1
}

function destroyRoom(roomId) {
  const room = rooms.get(roomId)
  if (!room) return
  for (const p of room.state.players) {
    if (p.id) socketToRoom.delete(p.id)
  }
  const pendingTimer = disconnectTimers.get(roomId)
  if (pendingTimer) {
    clearTimeout(pendingTimer)
    disconnectTimers.delete(roomId)
  }
  rooms.delete(roomId)
  log('roomDestroyed', { roomId })
}

/**
 * Validate the common preconditions (room exists, socket is a player,
 * socket's turn), run `handler`, and translate thrown errors into
 * `game:error` messages. The handler receives `(room, playerIndex)`.
 */
function guardAction(socket, handler) {
  const room = getRoom(socket)
  if (!room) {
    socket.emit('game:error', { message: 'Room not found' })
    return
  }

  const playerIndex = getPlayerIndex(socket, room)
  if (playerIndex === -1) {
    socket.emit('game:error', { message: 'Not a player in this room' })
    return
  }

  if (playerIndex !== room.state.activePlayer) {
    socket.emit('game:error', { message: 'Not your turn' })
    return
  }

  try {
    handler(room, playerIndex)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    socket.emit('game:error', { message })
  }
}

// ─── Public: startGame ────────────────────────────────────────────────────────

/**
 * Boot a new GameRoom for a matched pair of sockets. Idempotent by roomId —
 * if a room already exists for this id, the call is a no-op.
 *
 * @param {import('socket.io').Server} io
 * @param {string} roomId
 * @param {[string, string]} socketIds
 */
export async function startGame(io, roomId, socketIds) {
  if (rooms.has(roomId)) return

  const [id0, id1] = socketIds
  const socket0 = io.sockets.sockets.get(id0)
  const socket1 = io.sockets.sockets.get(id1)

  const userId0 = socket0 ? getUserIdFromSocket(socket0) : null
  const userId1 = socket1 ? getUserIdFromSocket(socket1) : null

  let deck0 = []
  let deck1 = []
  try {
    ;[deck0, deck1] = await Promise.all([
      loadDeckForUser(userId0),
      loadDeckForUser(userId1),
    ])
  } catch (err) {
    log('deckLoadFailed', { roomId, error: err instanceof Error ? err.message : err })
  }

  const room = new GameRoom(roomId)
  // userIds are the stable key for reconnect rebinding via `game:join`.
  room.initGame(id0, id1, [deck0, deck1], [userId0, userId1])
  rooms.set(roomId, room)
  socketToRoom.set(id0, roomId)
  socketToRoom.set(id1, roomId)

  socket0?.join(roomId)
  socket1?.join(roomId)

  log('startGame', {
    roomId,
    players: socketIds,
    userIds: [userId0, userId1],
    deckSizes: [deck0.length, deck1.length],
  })
  // The initial emit may race with the client's Lobby→Game navigation. That's
  // OK: clients explicitly re-request the state with `game:join` on mount.
  io.to(roomId).emit('game:stateUpdate', room.state)
}

// ─── Reconnect helpers ────────────────────────────────────────────────────────

function clearDisconnectTimer(roomId) {
  const t = disconnectTimers.get(roomId)
  if (t) {
    clearTimeout(t)
    disconnectTimers.delete(roomId)
  }
}

// ─── Public: registerGameHandlers ─────────────────────────────────────────────

/**
 * @param {import('socket.io').Server} io
 * @param {import('socket.io').Socket} socket
 */
export function registerGameHandlers(io, socket) {
  // ── game:join — reconnect / rebind the current socket to its slot ────────
  //
  // This is what makes the Lobby→Game transition actually work. The Lobby
  // socket closes during navigation (React unmount), the client opens a fresh
  // socket for the Game page, and that socket has a different id than the
  // one baked into `room.state.players[i].id`. Without this event the server
  // has no way to map the new socket back to the right slot and the client
  // sits on "Connecting…" forever.
  socket.on('game:join', (payload = {}) => {
    const { roomId } = payload
    if (!roomId || typeof roomId !== 'string') {
      socket.emit('game:error', { message: 'game:join: roomId required' })
      return
    }

    const room = rooms.get(roomId)
    if (!room) {
      socket.emit('game:error', { message: 'Room not found' })
      return
    }

    const userId = getUserIdFromSocket(socket)

    // Prefer stable userId matching; fall back to socket.id (covers dev /
    // unauthenticated flows) and finally an empty slot (initial claim).
    let slotIndex = -1
    if (userId !== null) {
      slotIndex = room.state.players.findIndex((p) => p.userId === userId)
    }
    if (slotIndex === -1) {
      slotIndex = room.state.players.findIndex((p) => p.id === socket.id)
    }
    if (slotIndex === -1) {
      slotIndex = room.state.players.findIndex((p) => !p.id)
    }

    if (slotIndex === -1) {
      socket.emit('game:error', { message: 'Not a player in this room' })
      log('join:notAPlayer', { roomId, socketId: socket.id, userId })
      return
    }

    // Free the previous socket→room binding if the slot was held by a
    // different (now stale) socket id.
    const prevSocketId = room.state.players[slotIndex].id
    if (prevSocketId && prevSocketId !== socket.id) {
      socketToRoom.delete(prevSocketId)
    }

    room.state.players[slotIndex].id = socket.id
    // First authenticated join also claims the userId for the slot (covers
    // the race where startGame finished before the client's auth was parsed).
    if (userId !== null && room.state.players[slotIndex].userId == null) {
      room.state.players[slotIndex].userId = userId
    }
    socketToRoom.set(socket.id, roomId)
    socket.join(roomId)

    // Cancel any pending "opponent wins" timer — player is back.
    clearDisconnectTimer(roomId)

    log('join', { roomId, socketId: socket.id, userId, slotIndex })
    socket.emit('game:stateUpdate', room.state)
  })

  socket.on('game:playMonster', (payload = {}) => {
    const { instanceId } = payload
    guardAction(socket, (room, playerIndex) => {
      if (room.state.players[playerIndex].field.length >= MAX_MONSTERS) {
        throw new Error('Field is full')
      }
      room.playMonster(playerIndex, instanceId)
      io.to(room.state.roomId).emit('game:stateUpdate', room.state)
    })
  })

  socket.on('game:attackMonster', (payload = {}) => {
    const { attackerInstanceId, targetInstanceId } = payload
    guardAction(socket, (room, playerIndex) => {
      const result = room.attackMonster(
        playerIndex,
        attackerInstanceId,
        targetInstanceId,
      )
      io.to(room.state.roomId).emit('game:combatResult', result)
      io.to(room.state.roomId).emit('game:stateUpdate', room.state)
    })
  })

  socket.on('game:attackPlayer', (payload = {}) => {
    const { attackerInstanceId } = payload
    guardAction(socket, (room, playerIndex) => {
      const result = room.attackPlayer(playerIndex, attackerInstanceId)
      const roomId = room.state.roomId
      io.to(roomId).emit('game:stateUpdate', room.state)
      if (result?.over) {
        io.to(roomId).emit('game:over', { winner: result.winner })
        destroyRoom(roomId)
      }
    })
  })

  socket.on('game:useEssence', (payload = {}) => {
    const { targetInstanceId } = payload
    guardAction(socket, (room, playerIndex) => {
      room.useEssence(playerIndex, targetInstanceId)
      io.to(room.state.roomId).emit('game:stateUpdate', room.state)
    })
  })

  socket.on('game:endTurn', () => {
    guardAction(socket, (room, playerIndex) => {
      const result = room.endTurn(playerIndex)
      const roomId = room.state.roomId
      io.to(roomId).emit('game:stateUpdate', room.state)
      if (result?.over) {
        io.to(roomId).emit('game:over', { winner: result.winner })
        destroyRoom(roomId)
      }
    })
  })

  socket.on('disconnect', () => {
    const roomId = socketToRoom.get(socket.id)
    if (!roomId) return
    const room = rooms.get(roomId)
    if (!room) {
      socketToRoom.delete(socket.id)
      return
    }

    const disconnectedIndex = getPlayerIndex(socket, room)
    socketToRoom.delete(socket.id)
    if (disconnectedIndex === -1) return

    // Clear the socket id on the slot so `game:join` can rebind it.
    room.state.players[disconnectedIndex].id = ''

    // Don't end the match immediately — the client may just be navigating
    // between pages (Lobby → Game, or a tab refresh). Give them a grace
    // period to reconnect via `game:join`.
    clearDisconnectTimer(roomId)
    const winnerIndex = disconnectedIndex === 0 ? 1 : 0
    log('disconnect:pending', {
      roomId,
      socketId: socket.id,
      disconnectedIndex,
      graceMs: RECONNECT_GRACE_MS,
    })

    const timer = setTimeout(() => {
      disconnectTimers.delete(roomId)
      // If the slot was rebound during the grace period, bail out.
      const live = rooms.get(roomId)
      if (!live) return
      if (live.state.players[disconnectedIndex].id) return

      io.to(roomId).emit('game:over', { winner: winnerIndex })
      log('disconnect:timeout', {
        roomId,
        disconnectedIndex,
        winner: winnerIndex,
      })
      destroyRoom(roomId)
    }, RECONNECT_GRACE_MS)
    disconnectTimers.set(roomId, timer)
  })
}
