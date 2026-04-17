/**
 * Combat primitives shared by GameRoom.
 *
 * rollModifier(mod)          → random integer in [-mod, +mod]
 * resolveAttack(atk, def)    → mutates currentStats.health on the loser of
 *                              the roll comparison and returns a summary.
 */

export function rollModifier(mod) {
  if (mod === 0) return 0
  return Math.floor(Math.random() * (2 * mod + 1)) - mod
}

export function resolveAttack(attacker, defender) {
  const attackRoll = rollModifier(attacker.currentStats.rollModifier)
  const defenseRoll = rollModifier(defender.currentStats.rollModifier)

  const finalAttack = attacker.currentStats.attack + attackRoll
  const finalDefense = defender.currentStats.defense + defenseRoll

  if (finalDefense >= finalAttack) {
    // Defense holds — attacker takes the recoil equal to their own final attack.
    attacker.currentStats.health -= finalAttack
  } else {
    defender.currentStats.health -= finalAttack
  }

  return {
    attackRoll,
    defenseRoll,
    finalAttack,
    finalDefense,
    attackerDied: attacker.currentStats.health <= 0,
    defenderDied: defender.currentStats.health <= 0,
    essenceAwarded: null,
  }
}
