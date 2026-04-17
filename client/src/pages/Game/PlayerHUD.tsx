/**
 * PlayerHUD — compact status strip for one player (local or opponent).
 *
 * Shows the player's label, an animated health bar, an essence badge
 * (hidden at zero), deck + hand counts, and — for the local player on
 * their own turn — a glowing End Turn button.
 *
 * Health bar animations:
 *   - Width tweens over 400ms ease-out on any change.
 *   - On a net heal (health increased) a gold overlay flashes briefly before
 *     the bar settles back to its green/yellow/red tier color.
 *
 * The HUD also doubles as the hit area for attacking the opposing player
 * when their field is empty: callers may pass `isAttackTarget` +
 * `onAttackClick` to light the tile up in accent red and make it clickable.
 */
import { useEffect, useRef, useState } from 'react'

import type { PlayerState } from './game.types'

const MAX_HEALTH = 50

export interface PlayerHUDProps {
  player: PlayerState
  isMe: boolean
  isTurn: boolean
  onEndTurn: () => void
  /** When true the HUD is styled as a valid attack target. */
  isAttackTarget?: boolean
  /** Click handler used when `isAttackTarget` is true. */
  onAttackClick?: () => void
  /**
   * Signal from the board that this player's avatar just took damage. The
   * `key` is monotonically increasing; a change triggers a red flash across
   * the HUD and a floating "-N" damage number.
   */
  damageHit?: { damage: number; key: number } | null
}

export function PlayerHUD({
  player,
  isMe,
  isTurn,
  onEndTurn,
  isAttackTarget = false,
  onAttackClick,
  damageHit = null,
}: PlayerHUDProps) {
  const label = isMe ? 'You' : 'Opponent'
  const health = player.health

  // Fill width: allow overflow above MAX_HEALTH (fill caps at 100%).
  const ratio = health / MAX_HEALTH
  const fillPct = Math.max(0, Math.min(1, ratio)) * 100

  let fillColor = '#2ecc71' // green >50%
  if (ratio < 0.25) fillColor = '#e74c3c' // red <25%
  else if (ratio < 0.5) fillColor = '#f1c40f' // yellow 25-50%

  // Gold flash on heal — remount a positioned overlay each time the player's
  // health increased vs the previous render.
  const prevHealthRef = useRef(health)
  const [healFlashKey, setHealFlashKey] = useState(0)

  useEffect(() => {
    if (health > prevHealthRef.current) {
      setHealFlashKey((k) => k + 1)
    }
    prevHealthRef.current = health
  }, [health])

  const attackable = isAttackTarget && !!onAttackClick

  // Avatar-hit animation: remount a flash overlay + a floating -N number
  // every time the parent bumps `damageHit.key`.
  const [hitAnim, setHitAnim] = useState<{
    damage: number
    key: number
  } | null>(null)
  const lastHitKeyRef = useRef<number>(0)

  useEffect(() => {
    if (!damageHit) return
    if (damageHit.key === lastHitKeyRef.current) return
    lastHitKeyRef.current = damageHit.key
    setHitAnim({ damage: damageHit.damage, key: damageHit.key })
    const timeoutId = window.setTimeout(() => {
      setHitAnim((curr) => (curr?.key === damageHit.key ? null : curr))
    }, 650)
    return () => window.clearTimeout(timeoutId)
  }, [damageHit])

  return (
    <div
      onClick={attackable ? onAttackClick : undefined}
      role={attackable ? 'button' : undefined}
      aria-label={attackable ? 'Attack opponent' : undefined}
      className="flex items-center gap-4 border-y border-white/5 bg-[var(--color-surface)]/70 px-4 py-3"
      style={{
        position: 'relative',
        minHeight: 72,
        cursor: attackable ? 'crosshair' : 'default',
        outline: attackable ? '2px solid var(--color-accent)' : 'none',
        outlineOffset: -2,
        boxShadow: attackable
          ? 'inset 0 0 28px rgba(192, 57, 43, 0.35), 0 0 24px rgba(192, 57, 43, 0.45)'
          : 'none',
        transition: 'outline 0.15s ease, box-shadow 0.2s ease',
      }}
    >
      {/* Avatar damage flash */}
      {hitAnim && (
        <div
          key={`hud-flash-${hitAnim.key}`}
          aria-hidden
          className="animate-damage-flash"
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            boxShadow:
              'inset 0 0 40px rgba(192, 57, 43, 0.75), 0 0 24px rgba(192, 57, 43, 0.6)',
            background:
              'linear-gradient(90deg, rgba(192, 57, 43, 0.2), rgba(192, 57, 43, 0.05), rgba(192, 57, 43, 0.2))',
            opacity: 0,
            zIndex: 4,
          }}
        />
      )}
      {/* Floating damage number over the HUD's center */}
      {hitAnim && (
        <span
          key={`hud-dmg-${hitAnim.key}`}
          aria-hidden
          className="animate-damage-rise"
          style={{
            position: 'absolute',
            top: 12,
            left: '50%',
            transform: 'translate(-50%, 0)',
            fontFamily: 'var(--font-display)',
            fontSize: '1rem',
            color: '#ffdede',
            textShadow:
              '0 0 6px rgba(192, 57, 43, 1), 0 0 14px rgba(192, 57, 43, 0.85), 2px 2px 0 rgba(0, 0, 0, 0.8)',
            pointerEvents: 'none',
            zIndex: 5,
            letterSpacing: 1,
          }}
        >
          -{hitAnim.damage}
        </span>
      )}
      {/* Label + turn indicator */}
      <span
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: '0.62rem',
          color: isTurn ? 'var(--color-gold)' : 'var(--color-text)',
          minWidth: 90,
          letterSpacing: 1,
        }}
      >
        {label}
        {isTurn && (
          <span
            style={{
              marginLeft: 8,
              color: 'var(--color-gold)',
              fontSize: '0.45rem',
            }}
            aria-hidden="true"
          >
            ●
          </span>
        )}
      </span>

      {/* Health bar */}
      <div
        aria-label={`${label} health ${health} of ${MAX_HEALTH}`}
        style={{ flex: '1 1 auto', minWidth: 140, maxWidth: 360 }}
      >
        <div
          style={{
            position: 'relative',
            height: 18,
            borderRadius: 9,
            background: 'rgba(0, 0, 0, 0.55)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            overflow: 'hidden',
          }}
        >
          {/* Tier-colored fill */}
          <div
            style={{
              width: `${fillPct}%`,
              height: '100%',
              background: fillColor,
              transition: 'width 400ms ease-out, background-color 300ms ease',
              boxShadow: `0 0 10px ${fillColor}aa`,
            }}
          />

          {/* Gold overlay that flashes briefly on heals. It covers the same
              width as the tier fill so the flash reads as "that chunk of
              health just turned gold" before settling back. */}
          {healFlashKey > 0 && (
            <div
              key={`heal-${healFlashKey}`}
              aria-hidden
              className="animate-health-flash-gold"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                height: '100%',
                width: `${fillPct}%`,
                background:
                  'linear-gradient(90deg, rgba(212, 150, 10, 0.0) 0%, #f0c420 55%, rgba(212, 150, 10, 0.0) 100%)',
                boxShadow: '0 0 14px rgba(240, 196, 32, 0.85)',
                opacity: 0,
                pointerEvents: 'none',
                transition: 'width 400ms ease-out',
              }}
            />
          )}

          <span
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'var(--font-display)',
              fontSize: '0.45rem',
              color: '#fff',
              textShadow: '1px 1px 0 rgba(0, 0, 0, 0.75)',
              letterSpacing: 0.5,
              pointerEvents: 'none',
            }}
          >
            {health} / {MAX_HEALTH}
          </span>
        </div>
      </div>

      {/* Essence badge — hidden at zero */}
      {player.essenceCount > 0 && (
        <span
          style={{
            padding: '3px 10px',
            borderRadius: 999,
            background: 'rgba(212, 150, 10, 0.18)',
            border: '1px solid var(--color-gold)',
            color: 'var(--color-gold)',
            fontFamily: 'var(--font-display)',
            fontSize: '0.42rem',
            whiteSpace: 'nowrap',
            letterSpacing: 1,
          }}
        >
          ✨ {player.essenceCount} Essence
        </span>
      )}

      {/* Deck / Hand counts */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: 2,
          color: 'var(--color-muted)',
          fontFamily: 'var(--font-body)',
          fontSize: '0.78rem',
          lineHeight: 1.2,
          whiteSpace: 'nowrap',
        }}
      >
        <span>Deck: {player.deck.length}</span>
        <span>Hand: {player.hand.length}</span>
      </div>

      {/* End Turn button — only when it's the local player's turn */}
      {isMe && isTurn && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onEndTurn()
          }}
          className="animate-end-turn-glow whitespace-nowrap px-5 py-2"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '0.58rem',
            color: '#1a1612',
            background: 'var(--color-accent)',
            border: '2px solid rgba(0, 0, 0, 0.4)',
            borderRadius: 4,
            cursor: 'pointer',
            letterSpacing: 1.5,
          }}
        >
          END TURN
        </button>
      )}
    </div>
  )
}
