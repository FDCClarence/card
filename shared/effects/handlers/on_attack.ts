/**
 * on_attack.ts — handlers for effects that fire when a card attacks.
 *
 * All simple on_attack effects (e.g. shield_allies, burn_on_attack) are handled
 * generically by the engine using their params objects in effects.json.
 * Register complex on_attack handlers here when params alone aren't expressive enough.
 */
import type { EffectHandler } from '../types.js'

/**
 * Example complex on_attack handler stub.
 * Replace the body with real logic and register the ID in effects/registry.ts.
 */
export const double_strike: EffectHandler = (ctx) => {
  // Deals damage equal to the source card's attack to the defending card a second time.
  // The engine resolves the first hit normally; this delta adds the second.
  const opponent = ctx.gameState.players[ctx.ownerIndex === 0 ? 1 : 0]
  const defender = opponent.board[0]

  if (!defender) {
    return { log: [`${ctx.sourceCard.definition.name} double-strike: no defender.`] }
  }

  return {
    damage: [
      {
        instanceId: defender.instanceId,
        amount: ctx.sourceCard.currentStats.attack,
        sourceEffectId: 'double_strike',
      },
    ],
    log: [
      `⚔️ Double Strike: ${ctx.sourceCard.definition.name} hits ${defender.definition.name} a second time for ${ctx.sourceCard.currentStats.attack}.`,
    ],
  }
}
