// ─── Card system ─────────────────────────────────────────────────────────────
export type { Rarity, CardStats, EffectMeta, CardDefinition } from '../cards/cardTypes.js'
export { loadCards, loadEffects } from '../cards/registry/index.js'

// ─── Effect system ────────────────────────────────────────────────────────────
export type {
  CardInstance,
  DotStack,
  PlayerState,
  GameState,
  EffectContext,
  StatChange,
  SummonRequest,
  RemoveRequest,
  DamageRequest,
  GameStateDelta,
  EffectHandler,
} from '../effects/types.js'
export { effectHandlers, getHandler } from '../effects/registry.js'

// ─── Legacy / lobby types ─────────────────────────────────────────────────────

/** @deprecated Use `Rarity` from cardTypes instead. */
export type CardRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'

/** @deprecated Use `CardDefinition` from cardTypes instead. */
export interface GameCard {
  id: string
  name: string
  attack: number
  health: number
  rarity: CardRarity
}

export interface LobbyState {
  id: string
  players: number
  status: 'waiting' | 'in-game'
}

// ─── Lobby socket event contracts ─────────────────────────────────────────────

export interface LobbyServerToClientEvents {
  /** Public queue update — client's current position (1-based). */
  'lobby:waiting': (payload: { position: number }) => void
  /** Emitted to both players when a public match is made. */
  'lobby:matchFound': (payload: { roomId: string }) => void
  /** Emitted to the creator after a private room is created. */
  'lobby:roomCreated': (payload: { roomKey: string; roomId: string }) => void
  /** Emitted to the joiner after successfully joining a private room. */
  'lobby:roomJoined': (payload: { roomId: string }) => void
  /** Emitted when the provided room key doesn't exist. */
  'lobby:roomNotFound': () => void
}

export interface LobbyClientToServerEvents {
  /** Join the public matchmaking queue. */
  'lobby:joinQueue': () => void
  /** Leave the public matchmaking queue (cancel). */
  'lobby:leaveQueue': () => void
  /** Create a new private room — server emits lobby:roomCreated in response. */
  'lobby:createRoom': () => void
  /** Attempt to join a private room by key. */
  'lobby:joinRoom': (payload: { key: string }) => void
}

export interface ServerToClientEvents extends LobbyServerToClientEvents {
  lobbyState: (state: LobbyState) => void
}

export interface ClientToServerEvents extends LobbyClientToServerEvents {
  joinLobby: (playerName: string) => void
}
