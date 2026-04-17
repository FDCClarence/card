/**
 * PlayerHUD — compact status bar for one player (local or opponent).
 *
 * Shows: avatar tile, health, hand / deck / essence counts, and (for the
 * local player) an End Turn button. The avatar tile is clickable and is used
 * as the hit area for `game:attackPlayer` when the opponent has no monsters
 * left — the parent decides whether to actually emit via `onAvatarClick`.
 */
import type { PlayerState } from './game.types'

export interface PlayerHUDProps {
  player: PlayerState
  isOpponent: boolean
  isActive: boolean
  /** Click handler for the avatar tile (opponent attack target). */
  onAvatarClick?: () => void
  /** Highlight the avatar tile as a valid attack target. */
  isAvatarTargetable?: boolean
  /** Shown on the local HUD only. */
  onEndTurn?: () => void
  /** True when it is the local player's turn and they can end it. */
  canEndTurn?: boolean
  label: string
}

export function PlayerHUD({
  player,
  isOpponent,
  isActive,
  onAvatarClick,
  isAvatarTargetable = false,
  onEndTurn,
  canEndTurn = false,
  label,
}: PlayerHUDProps) {
  const avatarBorder = isAvatarTargetable
    ? 'var(--color-accent)'
    : isActive
      ? 'var(--color-gold)'
      : 'rgba(255, 255, 255, 0.15)'

  const avatarShadow = isAvatarTargetable
    ? '0 0 0 2px rgba(192, 57, 43, 0.7), 0 0 22px rgba(192, 57, 43, 0.5)'
    : isActive
      ? '0 0 0 2px rgba(212, 150, 10, 0.5)'
      : 'inset 0 0 0 1px rgba(255, 255, 255, 0.04)'

  return (
    <div
      className="flex items-center gap-4 border-y border-white/5 bg-[var(--color-surface)]/70 px-4 py-2"
      style={{ minHeight: 64 }}
    >
      {/* Avatar tile */}
      <button
        type="button"
        onClick={onAvatarClick}
        disabled={!onAvatarClick}
        aria-label={`${label} avatar`}
        style={{
          width: 48,
          height: 48,
          borderRadius: 4,
          border: `2px solid ${avatarBorder}`,
          boxShadow: avatarShadow,
          background: 'var(--color-card)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'var(--font-display)',
          fontSize: '0.75rem',
          color: 'var(--color-text)',
          cursor: onAvatarClick ? (isAvatarTargetable ? 'crosshair' : 'pointer') : 'default',
          padding: 0,
        }}
      >
        {isOpponent ? '👤' : '🛡️'}
      </button>

      {/* Name + health + phase */}
      <div className="flex min-w-0 flex-col">
        <span
          className="truncate text-[var(--color-text)]"
          style={{ fontFamily: 'var(--font-display)', fontSize: '0.55rem' }}
        >
          {label}
          {isActive && (
            <span
              style={{
                marginLeft: 8,
                color: 'var(--color-gold)',
                fontSize: '0.45rem',
              }}
            >
              ● ACTIVE
            </span>
          )}
        </span>
        <div className="mt-1 flex items-center gap-2">
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '0.55rem',
              color: '#c0392b',
            }}
          >
            ♥ {player.health}
          </span>
        </div>
      </div>

      {/* Counts */}
      <div className="ml-auto flex items-center gap-3 text-[var(--color-muted)]">
        <Count label="HAND" value={player.hand.length} />
        <Count label="DECK" value={player.deck.length} />
        <Count label="ESSENCE" value={player.essenceCount} highlight={player.essenceCount > 0} />
      </div>

      {/* End turn (local only) */}
      {!isOpponent && onEndTurn && (
        <button
          type="button"
          onClick={onEndTurn}
          disabled={!canEndTurn}
          className="ml-3 whitespace-nowrap px-3 py-2 font-mono text-xs"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '0.5rem',
            color: canEndTurn ? '#0f1117' : 'rgba(255,255,255,0.4)',
            background: canEndTurn ? 'var(--color-gold)' : 'rgba(255,255,255,0.05)',
            border: '2px solid rgba(0,0,0,0.35)',
            borderRadius: 3,
            boxShadow: canEndTurn ? '2px 2px 0 rgba(0,0,0,0.5)' : 'none',
            cursor: canEndTurn ? 'pointer' : 'not-allowed',
          }}
        >
          END TURN
        </button>
      )}
    </div>
  )
}

function Count({
  label,
  value,
  highlight = false,
}: {
  label: string
  value: number
  highlight?: boolean
}) {
  return (
    <span
      style={{
        fontFamily: 'var(--font-display)',
        fontSize: '0.42rem',
        color: highlight ? 'var(--color-gold)' : undefined,
        lineHeight: 1.4,
      }}
    >
      {label} {value}
    </span>
  )
}
