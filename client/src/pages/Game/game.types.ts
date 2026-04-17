/**
 * Local aliases for the runtime game state shapes shared by the server.
 * These re-export the authoritative types from `@shared` under the names
 * the Game page and its children use internally.
 */

export type {
  MonsterSlot,
  RuntimeCardInstance as CardInstance,
  RuntimeGameState as GameState,
  RuntimePlayerState as PlayerState,
  CombatResult,
  GameOverPayload as GameOverResult,
  GameOverWinner,
  GamePhase,
} from '@shared'
