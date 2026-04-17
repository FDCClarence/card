import { v4 as uuid } from 'uuid'
import {
  MAX_HAND,
  STARTING_HAND,
  PLAYER_MAX_HEALTH,
  BARRIER_TURN,
  ESSENCE_HEAL_FRACTION,
} from './constants.js'
import { rollModifier, resolveAttack } from './combat.js'

/**
 * GameRoom
 *
 * Authoritative state for a single 1v1 match. All mutations go through the
 * methods on this class. See the JSDoc on the constructor for the full state
 * shape.
 */
export default class GameRoom {
  constructor(roomId) {
    this.state = {
      roomId,
      turn: 1,
      phase: 'barrier',
      activePlayer: 0,

      players: [
        {
          id: '',
          userId: null,
          health: PLAYER_MAX_HEALTH,
          hand: [],
          deck: [],
          field: [],
          essenceCount: 0,
          summonedThisTurn: 0,
        },
        {
          id: '',
          userId: null,
          health: PLAYER_MAX_HEALTH,
          hand: [],
          deck: [],
          field: [],
          essenceCount: 0,
          summonedThisTurn: 0,
        },
      ],

      coinFlip: {
        winner: 0,
        loserGotEssence: false,
      },

      log: [],
    }
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  _shuffle(array) {
    // Fisher-Yates, in place.
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[array[i], array[j]] = [array[j], array[i]]
    }
    return array
  }

  _log(message) {
    this.state.log.push(message)
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  initGame(player0SocketId, player1SocketId, decks, userIds = [null, null]) {
    const [deck0, deck1] = decks
    const socketIds = [player0SocketId, player1SocketId]
    const [userId0, userId1] = userIds
    const slotUserIds = [userId0 ?? null, userId1 ?? null]
    const shuffledDecks = [this._shuffle([...deck0]), this._shuffle([...deck1])]

    const winner = Math.random() < 0.5 ? 0 : 1
    const loser = winner === 0 ? 1 : 0

    // Loser gets a bonus Essence card at the top of their deck, drawn with
    // the opening hand.
    const essenceCard = {
      instanceId: uuid(),
      cardId: 'essence',
      isEssence: true,
    }
    shuffledDecks[loser].unshift(essenceCard)

    for (let i = 0; i < 2; i++) {
      this.state.players[i].id = socketIds[i]
      this.state.players[i].userId = slotUserIds[i]
      this.state.players[i].health = PLAYER_MAX_HEALTH
      this.state.players[i].deck = shuffledDecks[i]
      this.state.players[i].hand = []
      this.state.players[i].field = []
      this.state.players[i].essenceCount = 0
      this.state.players[i].summonedThisTurn = 0
    }

    for (let i = 0; i < 2; i++) {
      for (let n = 0; n < STARTING_HAND; n++) {
        this.drawCard(i)
      }
    }

    this.state.turn = 1
    this.state.phase = 'barrier'
    this.state.activePlayer = winner
    this.state.coinFlip = { winner, loserGotEssence: true }

    this._log(`Game started. Player ${winner} wins coin flip.`)
  }

  drawCard(playerIndex) {
    const player = this.state.players[playerIndex]
    if (player.hand.length >= MAX_HAND) return
    if (player.deck.length === 0) return

    const card = player.deck.shift()
    player.hand.push(card)
    if (card.isEssence) {
      player.essenceCount += 1
    }
  }

  playMonster(playerIndex, instanceId) {
    const player = this.state.players[playerIndex]
    const handIndex = player.hand.findIndex((c) => c.instanceId === instanceId)
    if (handIndex === -1) {
      throw new Error(
        `playMonster: card ${instanceId} not found in player ${playerIndex} hand`,
      )
    }
    const card = player.hand[handIndex]

    // Card definitions put combat stats under `stats`. Each card instance
    // spreads the CardDefinition onto itself, so `card.stats` is present.
    const cardStats = card.stats ?? {}
    const health = cardStats.health ?? 0
    const attack = cardStats.attack ?? 0
    const defense = cardStats.defense ?? 0
    const rollModifier = cardStats.rollModifier ?? 0

    const baseStats = {
      health,
      maxHealth: health,
      attack,
      defense,
      rollModifier,
    }

    // Partial-summoning penalty. The n-th additional monster placed this turn
    // (0-indexed) suffers -n/-n to attack and defense, floored at 1.
    const penalty = player.summonedThisTurn
    const penalizedAttack = Math.max(1, attack - penalty)
    const penalizedDefense = Math.max(1, defense - penalty)

    const currentStats = {
      health,
      maxHealth: health,
      attack: penalizedAttack,
      defense: penalizedDefense,
      rollModifier,
    }

    const summoningTime = card.summoningTime
    const attacksPerTurn = card.attacksPerTurn ?? 1

    const slot = {
      instanceId: card.instanceId,
      cardId: card.cardId ?? card.id,
      name: card.name,
      image: card.image,
      baseStats,
      currentStats,
      summoningTime,
      isSummoning: summoningTime > 0,
      attacksUsed: 0,
      attacksPerTurn,
      ownerIndex: playerIndex,
      penaltyApplied: penalty,
    }

    player.summonedThisTurn += 1
    player.hand.splice(handIndex, 1)
    player.field.push(slot)

    this._log(
      `Player ${playerIndex} summoned ${slot.name} with penalty ${penalty}.`,
    )
  }

  endTurn(playerIndex) {
    const activeIndex = this.state.activePlayer
    const activePlayer = this.state.players[activeIndex]

    // 1. Reduce summoning timers on the active player's field.
    for (const monster of activePlayer.field) {
      if (monster.isSummoning) {
        monster.summoningTime -= 1
        if (monster.summoningTime <= 0) {
          monster.summoningTime = 0
          monster.isSummoning = false
        }
      }
    }

    // 2. Reset attack counters for fully summoned monsters.
    for (const monster of activePlayer.field) {
      if (!monster.isSummoning) {
        monster.attacksUsed = 0
      }
    }

    // 3. Reset summonedThisTurn for the active player.
    activePlayer.summonedThisTurn = 0

    // 4. Barrier phase only lasts through turn 1.
    if (this.state.turn === BARRIER_TURN && this.state.phase === 'barrier') {
      this.state.phase = 'active'
    }

    // 5. Advance turn.
    const newActive = activeIndex === 0 ? 1 : 0
    if (newActive === 0) {
      this.state.turn += 1
    }
    this.state.activePlayer = newActive

    // 6. Draw for the incoming active player.
    this.drawCard(newActive)

    // 7. Evaluate win/draw conditions.
    const result = this._checkGameOver()

    // 8. Log the transition.
    this._log(
      `Player ${playerIndex} ended their turn. Now turn ${this.state.turn}, active player ${this.state.activePlayer}.`,
    )

    return result
  }

  attackMonster(attackerOwner, attackerInstanceId, targetInstanceId) {
    const defenderOwner = attackerOwner === 0 ? 1 : 0
    const attackerPlayer = this.state.players[attackerOwner]
    const defenderPlayer = this.state.players[defenderOwner]

    const attacker = attackerPlayer.field.find(
      (m) => m.instanceId === attackerInstanceId,
    )
    if (!attacker) {
      throw new Error(
        `attackMonster: attacker ${attackerInstanceId} not on player ${attackerOwner} field`,
      )
    }
    if (attacker.isSummoning) {
      throw new Error('attackMonster: attacker is still summoning')
    }

    const defender = defenderPlayer.field.find(
      (m) => m.instanceId === targetInstanceId,
    )
    if (!defender) {
      throw new Error(
        `attackMonster: defender ${targetInstanceId} not on player ${defenderOwner} field`,
      )
    }
    if (defender.isSummoning) {
      throw new Error('attackMonster: defender is still summoning')
    }

    if (attacker.attacksUsed >= attacker.attacksPerTurn) {
      throw new Error('attackMonster: attacker has no attacks left this turn')
    }

    const result = resolveAttack(attacker, defender)
    attacker.attacksUsed += 1

    // Stamp IDs on the result so clients can target their attack animations
    // without tracking local "pending attacker" state.
    result.targetType = 'monster'
    result.attackerInstanceId = attacker.instanceId
    result.defenderInstanceId = defender.instanceId

    if (result.defenderDied && !result.attackerDied) {
      result.essenceAwarded = attackerOwner
      this._awardEssence(attackerOwner)
    }

    // Remove any monster that dropped to 0 or below from both fields.
    attackerPlayer.field = attackerPlayer.field.filter(
      (m) => m.currentStats.health > 0,
    )
    defenderPlayer.field = defenderPlayer.field.filter(
      (m) => m.currentStats.health > 0,
    )

    this._log(
      `Player ${attackerOwner}'s ${attacker.name} attacked ${defender.name}: ` +
        `atk ${result.finalAttack} (roll ${result.attackRoll}) vs ` +
        `def ${result.finalDefense} (roll ${result.defenseRoll}). ` +
        `attackerDied=${result.attackerDied} defenderDied=${result.defenderDied}` +
        (result.essenceAwarded !== null
          ? ` — essence awarded to player ${result.essenceAwarded}`
          : ''),
    )

    return result
  }

  attackPlayer(attackerOwner, attackerInstanceId) {
    if (this.state.phase !== 'active') {
      throw new Error('attackPlayer: cannot attack player during barrier phase')
    }

    const defenderOwner = attackerOwner === 0 ? 1 : 0
    const attackerPlayer = this.state.players[attackerOwner]
    const defenderPlayer = this.state.players[defenderOwner]

    if (defenderPlayer.field.length > 0) {
      throw new Error(
        'attackPlayer: opponent still has monsters on the field',
      )
    }

    const attacker = attackerPlayer.field.find(
      (m) => m.instanceId === attackerInstanceId,
    )
    if (!attacker) {
      throw new Error(
        `attackPlayer: attacker ${attackerInstanceId} not on player ${attackerOwner} field`,
      )
    }
    if (attacker.isSummoning) {
      throw new Error('attackPlayer: attacker is still summoning')
    }
    if (attacker.attacksUsed >= attacker.attacksPerTurn) {
      throw new Error('attackPlayer: attacker has no attacks left this turn')
    }

    const roll = rollModifier(attacker.currentStats.rollModifier)
    const damage = attacker.currentStats.attack + roll

    defenderPlayer.health -= damage
    // Lifesteal: the attacker heals for the same amount, no upper cap.
    attackerPlayer.health += damage

    attacker.attacksUsed += 1

    this._log(
      `Player ${attackerOwner} attacked the opponent for ${damage} ` +
        `(roll ${roll}).`,
    )

    // Surface the same combat telemetry we emit for monster-vs-monster so
    // the client can play the lunge/roll/damage animations on avatar hits.
    const combat = {
      attackRoll: roll,
      defenseRoll: 0,
      finalAttack: damage,
      finalDefense: 0,
      attackerDied: false,
      defenderDied: false,
      essenceAwarded: null,
      targetType: 'player',
      attackerInstanceId: attacker.instanceId,
    }

    const over = this._checkGameOver()
    return { combat, over }
  }

  useEssence(playerIndex, targetMonsterInstanceId) {
    const player = this.state.players[playerIndex]

    if (player.essenceCount < 1) {
      throw new Error('useEssence: no Essence cards available')
    }

    const essenceIndex = player.hand.findIndex((c) => c.isEssence === true)
    if (essenceIndex === -1) {
      // essenceCount says we have one but hand disagrees — state corruption.
      throw new Error('useEssence: essenceCount > 0 but no Essence in hand')
    }

    const target = player.field.find(
      (m) => m.instanceId === targetMonsterInstanceId,
    )
    if (!target) {
      throw new Error(
        `useEssence: target monster ${targetMonsterInstanceId} not found on player ${playerIndex} field`,
      )
    }
    if (target.isSummoning) {
      throw new Error('useEssence: cannot heal a monster that is still summoning')
    }

    player.hand.splice(essenceIndex, 1)
    player.essenceCount -= 1

    const healAmount = Math.floor(
      target.currentStats.maxHealth * ESSENCE_HEAL_FRACTION,
    )
    target.currentStats.health = Math.min(
      target.currentStats.health + healAmount,
      target.currentStats.maxHealth,
    )

    this._log(
      `Player ${playerIndex} used Essence on ${target.name}, healed ${healAmount}.`,
    )
  }

  // ─── Private ───────────────────────────────────────────────────────────────

  _awardEssence(playerIndex) {
    const player = this.state.players[playerIndex]
    const essenceCard = {
      instanceId: uuid(),
      cardId: 'essence',
      isEssence: true,
    }

    if (player.hand.length < MAX_HAND) {
      player.hand.push(essenceCard)
      player.essenceCount += 1
      return
    }

    // Hand is full — slot the essence card into a random position in the deck.
    // essenceCount only tracks cards currently in hand, so we do NOT increment.
    const insertAt = Math.floor(Math.random() * (player.deck.length + 1))
    player.deck.splice(insertAt, 0, essenceCard)
  }

  _checkGameOver() {
    const [p0, p1] = this.state.players

    const player0Dead = p0.health <= 0
    const player1Dead = p1.health <= 0
    const player0Depleted =
      p0.field.length === 0 && p0.hand.length === 0 && p0.deck.length === 0
    const player1Depleted =
      p1.field.length === 0 && p1.hand.length === 0 && p1.deck.length === 0

    if (player0Dead && player1Dead) return { over: true, winner: 'draw' }
    if (player0Depleted && player1Depleted) return { over: true, winner: 'draw' }
    if (player0Dead || player0Depleted) return { over: true, winner: 1 }
    if (player1Dead || player1Depleted) return { over: true, winner: 0 }
    return { over: false }
  }
}
