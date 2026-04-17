/**
 * GameBoard — renders a full authoritative game state and owns the click
 * interaction model (attacker selection, essence targeting). All outgoing
 * actions are forwarded via the `on*` emit callbacks.
 *
 * Layout is a single viewport (no scroll) with the local player's content
 * anchored to the bottom and the opponent's mirrored to the top.
 *
 * This file is also responsible for the board-level "game feel" animations
 * that span multiple slots:
 *   - Attack lunge: tracks the locally-initiated attacker so we can trigger
 *     the lunge on the attacker's MonsterSlot when combatResult arrives.
 *   - Death fade: wraps each slot in <FieldSlotWrapper/>, which keeps a just-
 *     removed monster rendered for 300ms so it can play its exit animation.
 *   - Barrier exit: the barrier line animates out over 500ms when the phase
 *     transitions from 'barrier' → 'active'.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'

import { HandCard } from './HandCard'
import { MonsterSlot } from './MonsterSlot'
import { PlayerHUD } from './PlayerHUD'
import type {
  CombatResult,
  GameOverResult,
  GameState,
  MonsterSlot as MonsterSlotData,
  GamePhase,
} from './game.types'

// Rendering the game-over overlay is owned by <GamePage/> (index.tsx); this
// board only needs `gameOver` to disable the End Turn button once the match
// has ended.

const MAX_FIELD_SLOTS = 5

export interface GameBoardProps {
  state: GameState
  myPlayerIndex: 0 | 1 | -1
  lastCombat: CombatResult | null
  gameOver: GameOverResult | null
  onPlayMonster: (instanceId: string) => void
  onAttackMonster: (attackerInstanceId: string, targetInstanceId: string) => void
  onAttackPlayer: (attackerInstanceId: string) => void
  onUseEssence: (targetInstanceId: string) => void
  onEndTurn: () => void
}

export function GameBoard({
  state,
  myPlayerIndex,
  lastCombat,
  gameOver,
  onPlayMonster,
  onAttackMonster,
  onAttackPlayer,
  onUseEssence,
  onEndTurn,
}: GameBoardProps) {
  // ── Local UI state ─────────────────────────────────────────────────────────
  const [selectedAttackerInstanceId, setSelectedAttackerInstanceId] =
    useState<string | null>(null)
  const [essenceTargetingMode, setEssenceTargetingMode] = useState(false)

  // ── Derived state ──────────────────────────────────────────────────────────
  const meIndex = myPlayerIndex === 1 ? 1 : 0
  const oppIndex = meIndex === 0 ? 1 : 0
  const me = state.players[meIndex]
  const opp = state.players[oppIndex]
  const isMyTurn = state.activePlayer === meIndex && myPlayerIndex !== -1

  // Clear stale selection if the selected attacker is no longer on the field
  // (e.g. it died in combat). Derived — no effect needed.
  const selectedStillOnField = useMemo(
    () =>
      selectedAttackerInstanceId !== null &&
      me.field.some((m) => m.instanceId === selectedAttackerInstanceId),
    [selectedAttackerInstanceId, me.field],
  )
  const activeSelection = selectedStillOnField ? selectedAttackerInstanceId : null

  // ── Attack lunge + roll bookkeeping ────────────────────────────────────────
  // Both monster-vs-monster and monster-vs-player combat now carry the
  // attacker instanceId on the CombatResult payload (see shared/runtimeTypes).
  // We translate each incoming combat into:
  //   - a lunge animation on the attacker's MonsterSlot
  //   - a floating "roll" badge on the attacker (and on the defender monster,
  //     when applicable) so the player can see what the ± roll landed on
  //   - for avatar attacks, a damage flash + floating damage number on the
  //     opposing HUD (routed via avatarHitState below)
  const [lungeState, setLungeState] = useState<{
    attackerId: string
    key: number
  } | null>(null)
  const [rollBadgeState, setRollBadgeState] = useState<{
    attackerId: string | null
    attackerRoll: number | null
    defenderId: string | null
    defenderRoll: number | null
    key: number
  } | null>(null)
  const [avatarHitState, setAvatarHitState] = useState<{
    damage: number
    key: number
  } | null>(null)

  useEffect(() => {
    if (!lastCombat) return
    const key = Date.now()
    const attackerId = lastCombat.attackerInstanceId ?? null
    const defenderId =
      lastCombat.targetType === 'monster'
        ? lastCombat.defenderInstanceId ?? null
        : null

    if (attackerId) {
      setLungeState({ attackerId, key })
    }
    setRollBadgeState({
      attackerId,
      attackerRoll: attackerId ? lastCombat.attackRoll : null,
      defenderId,
      defenderRoll: defenderId ? lastCombat.defenseRoll : null,
      key,
    })
    if (lastCombat.targetType === 'player') {
      setAvatarHitState({ damage: lastCombat.finalAttack, key })
    }

    const lungeTimeout = window.setTimeout(() => setLungeState(null), 220)
    const rollTimeout = window.setTimeout(() => setRollBadgeState(null), 900)
    const avatarTimeout = window.setTimeout(() => setAvatarHitState(null), 900)
    return () => {
      window.clearTimeout(lungeTimeout)
      window.clearTimeout(rollTimeout)
      window.clearTimeout(avatarTimeout)
    }
  }, [lastCombat])

  // ── Barrier exit animation ────────────────────────────────────────────────
  const barrierVisible = useBarrierVisibility(state.phase)

  // ── Click handlers ─────────────────────────────────────────────────────────

  const clearSelection = useCallback(() => {
    setSelectedAttackerInstanceId(null)
  }, [])

  const handleMyMonsterClick = useCallback(
    (instanceId: string) => {
      if (!isMyTurn) return

      if (essenceTargetingMode) {
        onUseEssence(instanceId)
        setEssenceTargetingMode(false)
        return
      }

      // Toggle attacker selection.
      setSelectedAttackerInstanceId((prev) => (prev === instanceId ? null : instanceId))
    },
    [isMyTurn, essenceTargetingMode, onUseEssence],
  )

  const handleOpponentMonsterClick = useCallback(
    (instanceId: string) => {
      if (!isMyTurn || !activeSelection) return
      onAttackMonster(activeSelection, instanceId)
      clearSelection()
    },
    [isMyTurn, activeSelection, onAttackMonster, clearSelection],
  )

  const handleOpponentAvatarClick = useCallback(() => {
    if (!isMyTurn || !activeSelection) return
    if (opp.field.length > 0) return
    if (state.phase !== 'active') return
    onAttackPlayer(activeSelection)
    clearSelection()
  }, [
    isMyTurn,
    activeSelection,
    opp.field.length,
    state.phase,
    onAttackPlayer,
    clearSelection,
  ])

  const handleHandCardClick = useCallback(
    (instanceId: string, isEssence: boolean) => {
      if (!isMyTurn) return

      if (isEssence) {
        // Toggle essence targeting mode.
        setEssenceTargetingMode((prev) => !prev)
        clearSelection()
        return
      }

      if (me.field.length >= MAX_FIELD_SLOTS) return
      onPlayMonster(instanceId)
    },
    [isMyTurn, me.field.length, onPlayMonster, clearSelection],
  )

  const handleEndTurn = useCallback(() => {
    if (!isMyTurn) return
    clearSelection()
    setEssenceTargetingMode(false)
    onEndTurn()
  }, [isMyTurn, onEndTurn, clearSelection])

  // ── Targetability helpers ──────────────────────────────────────────────────

  const opponentCanBeAttacked =
    !!activeSelection && state.phase === 'active' && opp.field.length === 0

  const isOpponentMonsterValidTarget = (isSummoning: boolean) =>
    !!activeSelection && !isSummoning

  const isMyMonsterValidTarget = (isSummoning: boolean) =>
    essenceTargetingMode && !isSummoning

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <main
      className="flex h-screen flex-col overflow-hidden bg-[var(--color-bg)] text-[var(--color-text)]"
      aria-label={`Game room ${state.roomId}`}
    >
      {/* Opponent HUD */}
      <PlayerHUD
        player={opp}
        isMe={false}
        isTurn={state.activePlayer === oppIndex}
        onEndTurn={noop}
        isAttackTarget={opponentCanBeAttacked}
        onAttackClick={opponentCanBeAttacked ? handleOpponentAvatarClick : undefined}
        damageHit={avatarHitState}
      />

      {/* Opponent field — cards render face-up (readable from the local
          player's seat); the lunge animation on an opponent-initiated attack
          is driven downward toward our side of the board. */}
      <FieldRow>
        {Array.from({ length: MAX_FIELD_SLOTS }, (_, i) => {
          const m = opp.field[i] ?? null
          return (
            <FieldSlotWrapper
              key={i}
              monster={m}
              isMySlot={false}
              isValidTarget={(mon) => isOpponentMonsterValidTarget(mon.isSummoning)}
              onMonsterClick={handleOpponentMonsterClick}
              lungeState={lungeState}
              lungeDirection="down"
              isSelectedId={null}
              rollBadgeState={rollBadgeState}
            />
          )
        })}
      </FieldRow>

      {/* Barrier line */}
      {barrierVisible.render && <BarrierLine exiting={barrierVisible.exiting} />}

      {/* My field */}
      <FieldRow>
        {Array.from({ length: MAX_FIELD_SLOTS }, (_, i) => {
          const m = me.field[i] ?? null
          return (
            <FieldSlotWrapper
              key={i}
              monster={m}
              isMySlot
              isValidTarget={(mon) => isMyMonsterValidTarget(mon.isSummoning)}
              onMonsterClick={handleMyMonsterClick}
              lungeState={lungeState}
              lungeDirection="up"
              isSelectedId={activeSelection}
              rollBadgeState={rollBadgeState}
            />
          )
        })}
      </FieldRow>

      {/* My HUD */}
      <PlayerHUD
        player={me}
        isMe
        isTurn={isMyTurn && !gameOver}
        onEndTurn={handleEndTurn}
      />

      {/* My hand */}
      <div
        aria-label="Your hand"
        className="flex items-center gap-3 overflow-x-auto overflow-y-hidden border-t border-white/5 bg-[var(--color-surface)]/40 px-4 py-3"
        style={{ minHeight: 180 }}
      >
        {me.hand.length === 0 && (
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '0.5rem',
              color: 'var(--color-muted)',
            }}
          >
            Hand is empty.
          </span>
        )}
        {me.hand.map((card) => {
          const playable =
            isMyTurn && (card.isEssence || me.field.length < MAX_FIELD_SLOTS)
          return (
            <HandCard
              key={card.instanceId}
              card={card}
              isMyTurn={playable}
              onPlayMonster={(id) => handleHandCardClick(id, false)}
              onEssenceSelect={(id) => handleHandCardClick(id, true)}
            />
          )
        })}
      </div>
    </main>
  )
}

function noop() {}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FieldRow({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex flex-1 items-center justify-center gap-3 px-4"
      style={{ minHeight: 0 }}
    >
      {children}
    </div>
  )
}

/**
 * Keeps the most recently seen monster rendered for 300ms after it's been
 * removed from the authoritative field, so the death animation can play
 * before the slot unmounts. Also forwards lunge / selection state down.
 */
function FieldSlotWrapper({
  monster,
  isMySlot,
  isValidTarget,
  onMonsterClick,
  lungeState,
  lungeDirection,
  isSelectedId,
  rollBadgeState,
}: {
  monster: MonsterSlotData | null
  isMySlot: boolean
  isValidTarget: (mon: MonsterSlotData) => boolean
  onMonsterClick: (instanceId: string) => void
  lungeState: { attackerId: string; key: number } | null
  lungeDirection: 'up' | 'down'
  isSelectedId: string | null
  rollBadgeState: {
    attackerId: string | null
    attackerRoll: number | null
    defenderId: string | null
    defenderRoll: number | null
    key: number
  } | null
}) {
  // `cachedMonster` holds a snapshot of the last live monster so we can keep
  // painting it while the exit animation plays after `monster` goes null.
  const [cachedMonster, setCachedMonster] = useState<MonsterSlotData | null>(monster)
  const [isDying, setIsDying] = useState(false)

  useEffect(() => {
    if (monster) {
      setCachedMonster(monster)
      setIsDying(false)
      return
    }
    // Monster just disappeared — play the death animation on the cached copy.
    if (cachedMonster && !isDying) {
      setIsDying(true)
      const timeoutId = window.setTimeout(() => {
        setIsDying(false)
        setCachedMonster(null)
      }, 300)
      return () => window.clearTimeout(timeoutId)
    }
  }, [monster, cachedMonster, isDying])

  const toRender = monster ?? cachedMonster
  if (!toRender) return <MonsterSlot monster={null} isMySlot={isMySlot} isSelected={false} isValidTarget={false} onClick={noop} />

  const lungeKey =
    lungeState && lungeState.attackerId === toRender.instanceId ? lungeState.key : 0

  // Resolve which roll badge (if any) belongs to this monster for the current
  // combat event. A single combat can tag both the attacker and the defender
  // with their respective rolls.
  let rollValue: number | null = null
  let rollKey = 0
  let rollVariant: 'attacker' | 'defender' = 'attacker'
  if (rollBadgeState) {
    if (
      rollBadgeState.attackerId === toRender.instanceId &&
      rollBadgeState.attackerRoll !== null
    ) {
      rollValue = rollBadgeState.attackerRoll
      rollKey = rollBadgeState.key
      rollVariant = 'attacker'
    } else if (
      rollBadgeState.defenderId === toRender.instanceId &&
      rollBadgeState.defenderRoll !== null
    ) {
      rollValue = rollBadgeState.defenderRoll
      rollKey = rollBadgeState.key
      rollVariant = 'defender'
    }
  }

  const selected = isSelectedId === toRender.instanceId && !isDying
  const validTarget = monster ? isValidTarget(monster) : false

  return (
    <MonsterSlot
      monster={toRender}
      isMySlot={isMySlot}
      isSelected={selected}
      isValidTarget={validTarget}
      onClick={() => onMonsterClick(toRender.instanceId)}
      isDying={isDying}
      lungeKey={lungeKey}
      lungeDirection={lungeDirection}
      rollKey={rollKey}
      rollValue={rollValue}
      rollVariant={rollVariant}
    />
  )
}

/**
 * Barrier phase indicator. Idle-pulses opacity 0.6 ↔ 1.0 on a 1.5s loop;
 * when `exiting` is true the whole strip collapses out over 500ms and is
 * unmounted by the parent at the end.
 */
function BarrierLine({ exiting }: { exiting: boolean }) {
  return (
    <div
      aria-label="Barrier phase"
      className={exiting ? 'animate-barrier-exit' : ''}
      style={{
        position: 'relative',
        padding: '6px 0',
        textAlign: 'center',
        borderTop: '1px dashed var(--color-accent)',
        borderBottom: '1px dashed var(--color-accent)',
        background:
          'linear-gradient(90deg, transparent, rgba(192, 57, 43, 0.14), transparent)',
        overflow: 'hidden',
      }}
    >
      <span
        className={exiting ? '' : 'animate-barrier-pulse'}
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: '0.55rem',
          color: 'var(--color-accent)',
          letterSpacing: 1,
          opacity: exiting ? 1 : 0.6,
          display: 'inline-block',
        }}
      >
        TURN 1 — NO ATTACKS
      </span>
    </div>
  )
}

/**
 * Drives the enter/exit lifecycle of the barrier strip. Returns whether the
 * node should be in the DOM and, if so, whether it's currently playing the
 * exit animation.
 */
function useBarrierVisibility(phase: GamePhase): { render: boolean; exiting: boolean } {
  const [state, setState] = useState<'present' | 'exiting' | 'gone'>(
    phase === 'barrier' ? 'present' : 'gone',
  )

  useEffect(() => {
    if (phase === 'barrier') {
      setState('present')
      return
    }
    // phase === 'active'
    if (state === 'present') {
      setState('exiting')
      const timeoutId = window.setTimeout(() => setState('gone'), 500)
      return () => window.clearTimeout(timeoutId)
    }
  }, [phase, state])

  return {
    render: state !== 'gone',
    exiting: state === 'exiting',
  }
}
