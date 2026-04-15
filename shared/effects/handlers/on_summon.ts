/**
 * on_summon.ts — handlers for effects that fire when a card enters the board.
 *
 * Simple on_summon effects (e.g. flat stat grants to self or allies) can be
 * expressed with params in effects.json. Register complex handlers here.
 */
import type { EffectHandler } from '../types.js'

/**
 * meteor_on_summon — Starfall Witch's battlecry.
 *
 * Deals 3 damage to every enemy card on the board.
 * Listed here as a complex handler because it fans out across all enemies,
 * which requires iterating the opponent's board at resolution time.
 */
export const meteor_on_summon: EffectHandler = (ctx) => {
  const opponentIndex: 0 | 1 = ctx.ownerIndex === 0 ? 1 : 0
  const enemies = ctx.gameState.players[opponentIndex].board
  const METEOR_DAMAGE = 3

  if (enemies.length === 0) {
    return { log: [`☄️ Starfall: no enemies to hit.`] }
  }

  return {
    damage: enemies.map((enemy) => ({
      instanceId: enemy.instanceId,
      amount: METEOR_DAMAGE,
      sourceEffectId: 'meteor_on_summon',
    })),
    log: [
      `☄️ Starfall: ${ctx.sourceCard.definition.name} rains meteors on ${enemies.length} enemy card(s) for ${METEOR_DAMAGE} each.`,
    ],
  }
}
