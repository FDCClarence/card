/**
 * Runtime shapes produced by the authoritative server-side GameRoom engine
 * (server/game/GameRoom.js). These are the objects transported to clients
 * over socket.io in `game:stateUpdate` / `game:combatResult`.
 *
 * Distinct from `shared/effects/types.ts`, which models a different
 * (effects-oriented) view of game state. The runtime types here intentionally
 * match the GameRoom shape field-for-field.
 */

// ─── Cards ────────────────────────────────────────────────────────────────────

export interface MonsterStats {
  health: number
  maxHealth: number
  attack: number
  defense: number
  rollModifier: number
}

/**
 * A card sitting in a hand or deck. When `isEssence` is false the
 * `CardDefinition` fields are spread onto the instance.
 */
export interface RuntimeCardInstance {
  instanceId: string
  cardId: string
  isEssence: boolean
  // Definition fields spread in when isEssence === false.
  name?: string
  image?: string
  rarity?: string
  description?: string
  stats?: {
    health: number
    attack: number
    defense: number
    rollModifier: number
  }
  effects?: string[]
  tags?: string[]
  summoningTime?: number
  attacksPerTurn?: number
  [extra: string]: unknown
}

/** A monster on a player's field. */
export interface MonsterSlot {
  instanceId: string
  cardId: string
  name: string
  image: string
  baseStats: MonsterStats
  currentStats: MonsterStats
  summoningTime: number
  isSummoning: boolean
  attacksUsed: number
  attacksPerTurn: number
  ownerIndex: 0 | 1
  penaltyApplied: number
}

// ─── Players & room ───────────────────────────────────────────────────────────

export interface RuntimePlayerState {
  /** Live socket id for this slot. Rebinds on reconnect via `game:join`. */
  id: string
  /**
   * Stable authenticated user id owning this slot. Used to re-associate a
   * player's slot across socket reconnects (e.g. the unavoidable
   * Lobby→Game socket churn, or a tab refresh mid-match).
   * May be `null` for unauthenticated players (dev / legacy).
   */
  userId: number | null
  health: number
  hand: RuntimeCardInstance[]
  deck: RuntimeCardInstance[]
  field: MonsterSlot[]
  essenceCount: number
  summonedThisTurn: number
}

export interface CoinFlipState {
  winner: 0 | 1
  loserGotEssence: boolean
}

export type GamePhase = 'barrier' | 'active'

export interface RuntimeGameState {
  roomId: string
  turn: number
  phase: GamePhase
  activePlayer: 0 | 1
  players: [RuntimePlayerState, RuntimePlayerState]
  coinFlip: CoinFlipState
  log: string[]
}

// ─── Combat ───────────────────────────────────────────────────────────────────

export interface CombatResult {
  attackRoll: number
  defenseRoll: number
  finalAttack: number
  finalDefense: number
  attackerDied: boolean
  defenderDied: boolean
  /** Player index awarded an essence card, or null if none. */
  essenceAwarded: 0 | 1 | null
}

// ─── Game-over payload ────────────────────────────────────────────────────────

export type GameOverWinner = 0 | 1 | 'draw'

export interface GameOverPayload {
  winner: GameOverWinner
}

// ─── Socket event contracts ───────────────────────────────────────────────────

export interface GameServerToClientEvents {
  /** Full authoritative state after any mutation. */
  'game:stateUpdate': (state: RuntimeGameState) => void
  /** Emitted once per monster-vs-monster attack with the raw roll info. */
  'game:combatResult': (result: CombatResult) => void
  /** Emitted when a match ends. The server tears the room down immediately after. */
  'game:over': (payload: GameOverPayload) => void
  /** Recoverable server-side validation errors (sent only to the offending socket). */
  'game:error': (payload: { message: string }) => void
}

export interface GameClientToServerEvents {
  /**
   * Re-associate the current socket with a player slot in an existing game
   * room. Sent by the client on GamePage mount and after socket reconnects.
   * The server finds the slot whose `userId` matches the caller's auth token,
   * rebinds `state.players[slot].id` to this `socket.id`, joins the socket
   * to the room, and replies with a fresh `game:stateUpdate`.
   */
  'game:join': (payload: { roomId: string }) => void
  'game:playMonster': (payload: { instanceId: string }) => void
  'game:attackMonster': (payload: {
    attackerInstanceId: string
    targetInstanceId: string
  }) => void
  'game:attackPlayer': (payload: { attackerInstanceId: string }) => void
  'game:useEssence': (payload: { targetInstanceId: string }) => void
  'game:endTurn': () => void
}
