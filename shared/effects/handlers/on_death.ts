import type { EffectHandler, SummonRequest } from '../types.js'

/**
 * golem_death_nova — triggered when Stone Golem (or any card with this effect) dies.
 *
 * Summons a copy of the last card the opponent played onto the owner's board,
 * with all base stats halved (minimum 1).
 */
export const golem_death_nova: EffectHandler = (ctx) => {
  const opponentIndex: 0 | 1 = ctx.ownerIndex === 0 ? 1 : 0
  const opponent = ctx.gameState.players[opponentIndex]
  const lastPlayed = opponent.lastPlayedCard

  if (!lastPlayed) {
    return {
      log: [`${ctx.sourceCard.definition.name}'s Death Nova fizzled — opponent has no last card.`],
    }
  }

  const { health, attack, defense, rollModifier } = lastPlayed.currentStats
  const half = (n: number) => Math.max(1, Math.floor(n / 2))

  const summon: SummonRequest = {
    targetPlayerIndex: ctx.ownerIndex,
    slotIndex: -1,
    definitionId: lastPlayed.definitionId,
    overrideStats: {
      health: half(health),
      attack: half(attack),
      defense: half(defense),
      rollModifier: half(rollModifier),
    },
  }

  return {
    summons: [summon],
    log: [
      `💀 Death Nova: summoning half-stat ${lastPlayed.definition.name} for player ${ctx.ownerIndex}.`,
    ],
  }
}
