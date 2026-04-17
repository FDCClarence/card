/**
 * GameBoard — renders a full authoritative game state and owns the click
 * interaction model (attacker selection, essence targeting). All outgoing
 * actions are forwarded via the `on*` emit callbacks.
 *
 * Layout is a single viewport (no scroll) with the local player's content
 * anchored to the bottom and the opponent's mirrored to the top.
 */
import { useCallback, useMemo, useState } from 'react'

import { HandCard } from './HandCard'
import { MonsterSlot } from './MonsterSlot'
import { PlayerHUD } from './PlayerHUD'
import type { CombatResult, GameOverResult, GameState } from './game.types'

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
  lastCombat: _lastCombat,
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
  const barrierActive = state.phase === 'barrier'

  // Clear stale selection if the selected attacker is no longer on the field
  // (e.g. it died in combat). Derived — no effect needed.
  const selectedStillOnField = useMemo(
    () =>
      selectedAttackerInstanceId !== null &&
      me.field.some((m) => m.instanceId === selectedAttackerInstanceId),
    [selectedAttackerInstanceId, me.field],
  )
  const activeSelection = selectedStillOnField ? selectedAttackerInstanceId : null

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
  }, [isMyTurn, activeSelection, opp.field.length, state.phase, onAttackPlayer, clearSelection])

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
        isOpponent
        isActive={state.activePlayer === oppIndex}
        onAvatarClick={opponentCanBeAttacked ? handleOpponentAvatarClick : undefined}
        isAvatarTargetable={opponentCanBeAttacked}
        label={`Opponent (P${oppIndex + 1})`}
      />

      {/* Opponent field — rotated so cards face the local player */}
      <FieldRow>
        {Array.from({ length: MAX_FIELD_SLOTS }, (_, i) => {
          const m = opp.field[i] ?? null
          const valid = !!m && isOpponentMonsterValidTarget(m.isSummoning)
          return (
            <div key={i} style={{ transform: 'rotate(180deg)' }}>
              <MonsterSlot
                monster={m}
                isMySlot={false}
                isSelected={false}
                isValidTarget={valid}
                onClick={() => m && handleOpponentMonsterClick(m.instanceId)}
              />
            </div>
          )
        })}
      </FieldRow>

      {/* Barrier line */}
      {barrierActive && <BarrierLine />}

      {/* My field */}
      <FieldRow>
        {Array.from({ length: MAX_FIELD_SLOTS }, (_, i) => {
          const m = me.field[i] ?? null
          const selected = !!m && activeSelection === m.instanceId
          const valid = !!m && isMyMonsterValidTarget(m.isSummoning)
          return (
            <MonsterSlot
              key={i}
              monster={m}
              isMySlot
              isSelected={selected}
              isValidTarget={valid}
              onClick={() => m && handleMyMonsterClick(m.instanceId)}
            />
          )
        })}
      </FieldRow>

      {/* My HUD */}
      <PlayerHUD
        player={me}
        isOpponent={false}
        isActive={isMyTurn}
        onEndTurn={handleEndTurn}
        canEndTurn={isMyTurn && !gameOver}
        label={`You (P${meIndex + 1})`}
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
            isMyTurn &&
            (card.isEssence || me.field.length < MAX_FIELD_SLOTS)
          const selected = card.isEssence && essenceTargetingMode
          return (
            <HandCard
              key={card.instanceId}
              card={card}
              disabled={!playable}
              isSelected={selected}
              onClick={() => handleHandCardClick(card.instanceId, card.isEssence)}
            />
          )
        })}
      </div>

      {/* Game-over overlay */}
      {gameOver && <GameOverOverlay result={gameOver} myIndex={meIndex} />}
    </main>
  )
}

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

function BarrierLine() {
  return (
    <div
      aria-label="Barrier phase"
      style={{
        position: 'relative',
        padding: '6px 0',
        textAlign: 'center',
        borderTop: '1px dashed var(--color-accent)',
        borderBottom: '1px dashed var(--color-accent)',
        background:
          'linear-gradient(90deg, transparent, rgba(192, 57, 43, 0.14), transparent)',
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: '0.55rem',
          color: 'var(--color-accent)',
          letterSpacing: 1,
          animation: 'barrierPulse 1.6s ease-in-out infinite',
        }}
      >
        TURN 1 — NO ATTACKS
      </span>
      <style>{`
        @keyframes barrierPulse {
          0%, 100% { opacity: 0.55; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  )
}

function GameOverOverlay({
  result,
  myIndex,
}: {
  result: GameOverResult
  myIndex: 0 | 1
}) {
  let title = 'DRAW'
  if (result.winner === 'draw') {
    title = 'DRAW'
  } else if (result.winner === myIndex) {
    title = 'VICTORY'
  } else {
    title = 'DEFEAT'
  }

  return (
    <div
      role="alertdialog"
      aria-label="Game over"
      style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(10, 8, 6, 0.82)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
      }}
    >
      <div
        style={{
          padding: '28px 40px',
          border: '2px solid var(--color-gold)',
          background: 'var(--color-surface)',
          borderRadius: 8,
          textAlign: 'center',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.7)',
        }}
      >
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.2rem',
            color: 'var(--color-gold)',
            margin: 0,
          }}
        >
          {title}
        </h1>
        <p
          style={{
            marginTop: 10,
            fontFamily: 'var(--font-body)',
            fontSize: '0.85rem',
            color: 'var(--color-muted)',
          }}
        >
          {result.winner === 'draw'
            ? 'Both players finished simultaneously.'
            : `Player ${result.winner} wins.`}
        </p>
      </div>
    </div>
  )
}
