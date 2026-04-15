/**
 * effects/registry.ts — single source of truth for complex effect handlers.
 *
 * The game engine never imports handler files directly.
 * It always calls getHandler(effectId) from here.
 *
 * HOW TO ADD A NEW COMPLEX EFFECT
 * ─────────────────────────────────
 *   1. Write the handler in the appropriate handlers/<trigger>.ts file.
 *   2. Import it below and add it to effectHandlers.
 *   3. Add the effect metadata to cards/registry/effects.json with params: null.
 *   4. Reference the effect ID in the card's "effects" array in cards.json.
 */
import { double_strike } from './handlers/on_attack.js'
import { golem_death_nova } from './handlers/on_death.js'
import { meteor_on_summon } from './handlers/on_summon.js'
import { cascade_draw } from './handlers/on_turn_start.js'
import type { EffectHandler } from './types.js'

export const effectHandlers: Record<string, EffectHandler> = {
  // on_death
  golem_death_nova,

  // on_summon
  meteor_on_summon,

  // on_attack
  double_strike,

  // on_turn_start
  cascade_draw,
}

/**
 * Returns the handler for the given effect ID, or null if the effect is handled
 * generically via its params object in effects.json.
 */
export function getHandler(effectId: string): EffectHandler | null {
  return effectHandlers[effectId] ?? null
}
