/**
 * on_turn_start.ts — handlers for effects that fire at the start of a player's turn.
 *
 * Simple on_turn_start effects (e.g. heal_weakest_ally with params) are handled
 * generically by the engine. Register complex multi-step logic here.
 */
import type { EffectHandler } from '../types.js'

/**
 * Example complex on_turn_start handler stub.
 *
 * cascade_draw — at the start of turn, if the owning player has fewer than 2 cards
 * on board, summon a random common card from the registry.
 * (Requires registry access at runtime; engine must inject the definition via params.)
 */
export const cascade_draw: EffectHandler = (ctx) => {
  const owner = ctx.gameState.players[ctx.ownerIndex]
  const THRESHOLD = 2

  if (owner.board.length >= THRESHOLD) {
    return {}
  }

  // The engine is expected to resolve the "random_common" definitionId by looking
  // up the registry at application time. The delta signals the intent.
  return {
    summons: [
      {
        targetPlayerIndex: ctx.ownerIndex,
        slotIndex: -1,
        definitionId: '__random_common__',
      },
    ],
    log: [
      `🎴 Cascade Draw: board has ${owner.board.length} card(s) — drawing a random common.`,
    ],
  }
}
