import { randomUUID } from 'node:crypto'

import { startGame } from './game.js'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ts() {
  return new Date().toISOString()
}

function log(event, ...args) {
  console.log(`[${ts()}] [lobby] ${event}`, ...args)
}

function randomKey(length = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let key = ''
  for (let i = 0; i < length; i++) {
    key += chars[Math.floor(Math.random() * chars.length)]
  }
  return key
}

// ─── Shared state ─────────────────────────────────────────────────────────────

/** Ordered list of socket IDs waiting in the public queue. */
const publicQueue = []

/**
 * Private rooms indexed by roomId.
 * @type {Map<string, { roomId: string, roomKey: string, sockets: string[] }>}
 */
const rooms = new Map()

/**
 * Reverse index: socketId → roomId (for quick cleanup on disconnect).
 * @type {Map<string, string>}
 */
const socketToRoom = new Map()

// ─── Queue helpers ────────────────────────────────────────────────────────────

function removeFromQueue(socketId) {
  const idx = publicQueue.indexOf(socketId)
  if (idx !== -1) {
    publicQueue.splice(idx, 1)
    return true
  }
  return false
}

/**
 * Broadcast updated queue positions to every waiting socket.
 * @param {import('socket.io').Server} io
 */
function broadcastQueuePositions(io) {
  publicQueue.forEach((socketId, index) => {
    io.to(socketId).emit('lobby:waiting', { position: index + 1 })
  })
}

/**
 * Try to match the first two players in the queue.
 * @param {import('socket.io').Server} io
 */
function tryMatch(io) {
  while (publicQueue.length >= 2) {
    const [socketA, socketB] = publicQueue.splice(0, 2)
    const roomId = randomUUID()

    rooms.set(roomId, { roomId, roomKey: null, sockets: [socketA, socketB] })
    socketToRoom.set(socketA, roomId)
    socketToRoom.set(socketB, roomId)

    io.to(socketA).emit('lobby:matchFound', { roomId })
    io.to(socketB).emit('lobby:matchFound', { roomId })

    log('matchFound', { roomId, players: [socketA, socketB] })

    startGame(io, roomId, [socketA, socketB]).catch((err) => {
      log('startGame:error', { roomId, error: err?.message ?? err })
    })
  }
}

// ─── Room helpers ─────────────────────────────────────────────────────────────

function removeSocketFromRoom(socketId) {
  const roomId = socketToRoom.get(socketId)
  if (!roomId) return

  socketToRoom.delete(socketId)

  const room = rooms.get(roomId)
  if (!room) return

  room.sockets = room.sockets.filter((id) => id !== socketId)

  if (room.sockets.length === 0) {
    rooms.delete(roomId)
    log('roomCleaned', { roomId })
  }
}

// ─── Main lobby handler ───────────────────────────────────────────────────────

/**
 * Register all lobby socket events on a connected socket.
 *
 * @param {import('socket.io').Server} io
 * @param {import('socket.io').Socket} socket
 */
export function registerLobbyHandlers(io, socket) {
  log('connected', socket.id)

  // ── Public queue ────────────────────────────────────────────────────────────

  socket.on('lobby:joinQueue', () => {
    if (publicQueue.includes(socket.id)) {
      log('joinQueue:alreadyQueued', socket.id)
      return
    }

    publicQueue.push(socket.id)
    log('joinQueue', { socketId: socket.id, queueLength: publicQueue.length })

    broadcastQueuePositions(io)
    tryMatch(io)
  })

  socket.on('lobby:leaveQueue', () => {
    const removed = removeFromQueue(socket.id)
    log('leaveQueue', { socketId: socket.id, wasInQueue: removed })
    if (removed) broadcastQueuePositions(io)
  })

  // ── Private rooms ───────────────────────────────────────────────────────────

  socket.on('lobby:createRoom', () => {
    // One key-attempt loop — regenerate if collision (astronomically rare).
    let roomKey
    let attempts = 0
    do {
      roomKey = randomKey()
      attempts++
    } while ([...rooms.values()].some((r) => r.roomKey === roomKey) && attempts < 20)

    const roomId = randomUUID()
    rooms.set(roomId, { roomId, roomKey, sockets: [socket.id] })
    socketToRoom.set(socket.id, roomId)

    socket.emit('lobby:roomCreated', { roomKey, roomId })
    log('roomCreated', { socketId: socket.id, roomKey, roomId })
  })

  socket.on('lobby:joinRoom', ({ key }) => {
    if (!key || typeof key !== 'string') {
      socket.emit('lobby:roomNotFound')
      return
    }

    const upperKey = key.trim().toUpperCase()
    const room = [...rooms.values()].find((r) => r.roomKey === upperKey)

    if (!room) {
      socket.emit('lobby:roomNotFound')
      log('joinRoom:notFound', { socketId: socket.id, key: upperKey })
      return
    }

    room.sockets.push(socket.id)
    socketToRoom.set(socket.id, room.roomId)

    socket.emit('lobby:roomJoined', { roomId: room.roomId })
    log('roomJoined', { socketId: socket.id, roomKey: upperKey, roomId: room.roomId })

    // If two players are now in the room, it becomes a match.
    if (room.sockets.length >= 2) {
      room.sockets.forEach((sid) => {
        io.to(sid).emit('lobby:matchFound', { roomId: room.roomId })
      })
      log('matchFound:private', { roomId: room.roomId, players: room.sockets })

      const [socketA, socketB] = room.sockets
      startGame(io, room.roomId, [socketA, socketB]).catch((err) => {
        log('startGame:error', { roomId: room.roomId, error: err?.message ?? err })
      })
    }
  })

  // ── Disconnect cleanup ──────────────────────────────────────────────────────

  socket.on('disconnect', (reason) => {
    const removedFromQueue = removeFromQueue(socket.id)
    if (removedFromQueue) broadcastQueuePositions(io)

    removeSocketFromRoom(socket.id)

    log('disconnected', { socketId: socket.id, reason })
  })
}
