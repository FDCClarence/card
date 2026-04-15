import type { CardDefinition, CardStats } from '../cards/cardTypes.js'

// ─── Live instances ───────────────────────────────────────────────────────────

/** A card as it exists during a running game, with mutable runtime state. */
export interface CardInstance {
  /** Mirrors CardDefinition.id — which card template this came from. */
  definitionId: string
  /** Unique identifier for this specific in-game instance. */
  instanceId: string
  /** Resolved base definition (read-only snapshot). */
  definition: Readonly<CardDefinition>
  /** Current live stats (may differ from base after buffs/debuffs). */
  currentStats: CardStats
  /** 0-based slot index on the owning player's board. */
  slotIndex: number
  /** Accumulated damage-over-time stacks, keyed by effect ID. */
  dotStacks: Record<string, DotStack>
  /** Arbitrary per-instance state bag for complex effects. */
  flags: Record<string, unknown>
}

export interface DotStack {
  damagePerTurn: number
  turnsRemaining: number
}

// ─── Game state (read-only view passed to handlers) ──────────────────────────

export interface PlayerState {
  index: 0 | 1
  name: string
  health: number
  board: CardInstance[]
  /** The last card the player played this game, for "copy-last" type effects. */
  lastPlayedCard: CardInstance | null
}

export interface GameState {
  readonly turn: number
  readonly activePlayerIndex: 0 | 1
  readonly players: readonly [PlayerState, PlayerState]
  readonly phase: 'setup' | 'combat' | 'end'
}

// ─── Effect context ───────────────────────────────────────────────────────────

export interface EffectContext {
  /** The card that triggered the effect. */
  sourceCard: CardInstance
  /** Which player owns the source card. */
  ownerIndex: 0 | 1
  /** Full current game state — treat as read-only; mutations go into the delta. */
  gameState: GameState
  /** Params from effects.json, present when the effect has a simple inline config. */
  params?: Record<string, unknown>
}

// ─── Game state delta ─────────────────────────────────────────────────────────

/**
 * Describes what should change as a result of resolving an effect.
 * The game engine reads this and applies mutations; handlers never mutate directly.
 * All fields are optional — include only what actually changes.
 */
export interface StatChange {
  instanceId: string
  stat: keyof CardStats
  delta: number
}

export interface SummonRequest {
  /** Which player's board to summon on. */
  targetPlayerIndex: 0 | 1
  /** Target slot, or -1 to append at the end. */
  slotIndex: number
  /** Definition ID of the card to summon. */
  definitionId: string
  /** Override initial stats (e.g. half-stats for death-nova copies). */
  overrideStats?: Partial<CardStats>
}

export interface RemoveRequest {
  instanceId: string
}

export interface DamageRequest {
  instanceId: string
  amount: number
  /** Optional source for logging / future immunity checks. */
  sourceEffectId?: string
}

export interface GameStateDelta {
  statChanges?: StatChange[]
  summons?: SummonRequest[]
  removals?: RemoveRequest[]
  damage?: DamageRequest[]
  /** Arbitrary flag mutations on specific instances. */
  flagMutations?: Array<{ instanceId: string; key: string; value: unknown }>
  /** Log lines the engine should emit for this effect resolution. */
  log?: string[]
}

// ─── Handler type ─────────────────────────────────────────────────────────────

export type EffectHandler = (context: EffectContext) => GameStateDelta
