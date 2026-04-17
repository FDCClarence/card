/**
 * MonsterSlot — a single board slot. Three visual states:
 *   - Empty (monster === null): dashed box, non-interactive.
 *   - Summoning (isSummoning): dimmed mini-card with a turns-remaining badge.
 *   - Active: mini-card + health bar. Selectable, targetable, exhausted states
 *     are driven by the props `isSelected`, `isValidTarget`, and whether the
 *     monster has burned through its attacks this turn.
 *
 * Also plays the following one-shot "game feel" animations:
 *   - Summon pop (scale bounce) when isSummoning transitions true → false.
 *   - Attack lunge when the parent increments `lungeKey`.
 *   - Damage flash + floating damage number when current HP drops.
 *   - Death fade when `isDying` is true.
 */
import { useEffect, useRef, useState } from 'react'

import type { MonsterSlot as MonsterSlotData } from './game.types'

// Same card dimensions as Card.module.css `.sm`.
const CARD_W = 120
const CARD_H = 168

export interface MonsterSlotProps {
  monster: MonsterSlotData | null
  isMySlot: boolean
  isSelected: boolean
  isValidTarget: boolean
  onClick: () => void
  /**
   * When true, this slot is playing its death exit animation. The monster
   * prop is still provided (cached by the parent) so the farewell can paint.
   */
  isDying?: boolean
  /**
   * Monotonically increasing key bumped by the parent whenever this monster
   * attacks. A change triggers a one-shot lunge animation.
   */
  lungeKey?: number
  /** Direction of the lunge. Defaults to 'up' for local monsters. */
  lungeDirection?: 'up' | 'down'
}

// ─── Health bar colour thresholds ─────────────────────────────────────────────

function healthBarColor(ratio: number): string {
  if (ratio > 0.5) return '#4caf50'
  if (ratio > 0.25) return '#d4960a'
  return '#c0392b'
}

// ─── Empty slot ───────────────────────────────────────────────────────────────

function EmptySlot() {
  return (
    <div
      aria-hidden
      style={{
        width: CARD_W,
        height: CARD_H,
        border: '2px dashed rgba(255, 255, 255, 0.15)',
        borderRadius: 8,
        background: 'rgba(255, 255, 255, 0.02)',
      }}
    />
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

interface DamageNumber {
  id: number
  value: number
}

let damageIdCounter = 0

export function MonsterSlot({
  monster,
  isMySlot,
  isSelected,
  isValidTarget,
  onClick,
  isDying = false,
  lungeKey = 0,
  lungeDirection = 'up',
}: MonsterSlotProps) {
  // ── Derived-from-prev animation triggers ────────────────────────────────────
  // `popKey` / `flashKey` change whenever the corresponding animation should
  // (re)play; they are used as React keys on the animating wrapper element so
  // a class-based CSS animation can restart on every event.
  const [popKey, setPopKey] = useState(0)
  const [flashKey, setFlashKey] = useState(0)
  const [damageNumbers, setDamageNumbers] = useState<DamageNumber[]>([])

  const prevRef = useRef<{
    instanceId: string | undefined
    hp: number
    isSummoning: boolean
  }>({
    instanceId: monster?.instanceId,
    hp: monster?.currentStats.health ?? 0,
    isSummoning: monster?.isSummoning ?? false,
  })

  useEffect(() => {
    const prev = prevRef.current

    if (!monster) {
      prevRef.current = { instanceId: undefined, hp: 0, isSummoning: false }
      return
    }

    const sameInstance = prev.instanceId === monster.instanceId

    if (sameInstance) {
      // Summon complete: isSummoning true → false.
      if (prev.isSummoning && !monster.isSummoning) {
        setPopKey((k) => k + 1)
      }

      // Damage: current HP decreased.
      if (monster.currentStats.health < prev.hp) {
        const dmg = prev.hp - monster.currentStats.health
        setFlashKey((k) => k + 1)
        const id = ++damageIdCounter
        setDamageNumbers((list) => [...list, { id, value: dmg }])
        window.setTimeout(() => {
          setDamageNumbers((list) => list.filter((d) => d.id !== id))
        }, 650)
      }
    }

    prevRef.current = {
      instanceId: monster.instanceId,
      hp: monster.currentStats.health,
      isSummoning: monster.isSummoning,
    }
  }, [monster])

  if (!monster) return <EmptySlot />

  const {
    currentStats,
    isSummoning,
    summoningTime,
    attacksUsed,
    attacksPerTurn,
    name,
    image,
  } = monster
  const hp = Math.max(0, currentStats.health)
  const maxHp = Math.max(1, currentStats.maxHealth)
  const hpRatio = hp / maxHp
  const isExhausted = isMySlot && !isSummoning && attacksUsed >= attacksPerTurn

  // Clickability: summoning, exhausted, and dying monsters never react.
  const clickable = !isSummoning && !isExhausted && !isDying

  const borderColor = isSelected
    ? 'var(--color-gold)'
    : isValidTarget
      ? 'var(--color-accent)'
      : 'rgba(255, 255, 255, 0.15)'

  const boxShadow = isSelected
    ? '0 0 0 3px rgba(212, 150, 10, 0.7), 0 0 28px rgba(212, 150, 10, 0.55)'
    : isValidTarget
      ? '0 0 0 3px rgba(192, 57, 43, 0.7), 0 0 24px rgba(192, 57, 43, 0.55)'
      : '0 6px 16px rgba(0, 0, 0, 0.55)'

  return (
    <button
      type="button"
      onClick={clickable ? onClick : undefined}
      disabled={!clickable}
      aria-label={`${name} — ${hp}/${maxHp} HP`}
      aria-pressed={isSelected}
      style={{
        width: CARD_W,
        height: CARD_H + 14,
        padding: 0,
        background: 'transparent',
        border: 'none',
        cursor: clickable ? (isValidTarget ? 'crosshair' : 'pointer') : 'not-allowed',
        opacity: isExhausted && !isDying ? 0.45 : 1,
        position: 'relative',
      }}
    >
      {/* Death wrapper — scale-down + fade when the monster is leaving. */}
      <div
        className={isDying ? 'animate-monster-death' : ''}
        style={{ pointerEvents: isDying ? 'none' : 'auto' }}
      >
        {/* Lunge wrapper — remounts on lungeKey change to replay animation. */}
        <div
          key={`lunge-${lungeKey}`}
          className={
            lungeKey > 0
              ? lungeDirection === 'up'
                ? 'animate-lunge-up'
                : 'animate-lunge-down'
              : ''
          }
        >
          {/* Pop wrapper — remounts on popKey change. */}
          <div
            key={`pop-${popKey}`}
            className={popKey > 0 ? 'animate-summon-pop' : ''}
            style={{ transformOrigin: 'center' }}
          >
            <div
              style={{
                position: 'relative',
                width: CARD_W,
                height: CARD_H,
                borderRadius: 8,
                border: `2px solid ${borderColor}`,
                background:
                  'radial-gradient(circle, rgba(0,0,0,0.07) 1px, transparent 1px), var(--color-card)',
                backgroundSize: '4px 4px, auto',
                boxShadow,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                opacity: isSummoning ? 0.6 : 1,
                transition: 'box-shadow 120ms linear, border-color 120ms linear',
              }}
            >
              {/* Image */}
              <div style={{ position: 'relative', flex: '0 0 55%', overflow: 'hidden' }}>
                <img
                  src={image}
                  alt=""
                  draggable={false}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    imageRendering: 'pixelated',
                  }}
                  onError={(e) => {
                    ;(e.currentTarget as HTMLImageElement).style.visibility = 'hidden'
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background:
                      'linear-gradient(to bottom, transparent 55%, rgba(10, 15, 20, 0.85) 100%)',
                    pointerEvents: 'none',
                  }}
                />
              </div>

              {/* Name bar */}
              <div
                style={{
                  padding: '4px 6px',
                  background: 'rgba(18, 24, 20, 0.92)',
                  borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                <p
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '0.42rem',
                    lineHeight: 1.4,
                    color: 'var(--color-text)',
                    margin: 0,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {name}
                </p>
              </div>

              {/* Stat row — ATK / DEF / ROLL (current values) */}
              <div
                style={{
                  display: 'flex',
                  gap: 3,
                  padding: '4px 5px',
                  justifyContent: 'center',
                }}
              >
                <StatPill color="#d35400" label="ATK" value={currentStats.attack} />
                <StatPill color="#2471a3" label="DEF" value={currentStats.defense} />
                <StatPill color="#6c3483" label="±" value={currentStats.rollModifier} />
              </div>

              {/* Damage flash overlay — sits on top of the card artwork and
                  pulses red twice to cue that this monster just took damage. */}
              {flashKey > 0 && (
                <div
                  key={`flash-${flashKey}`}
                  aria-hidden
                  className="animate-damage-flash"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: 8,
                    border: '3px solid #c0392b',
                    boxShadow:
                      '0 0 0 2px rgba(192, 57, 43, 0.55), inset 0 0 22px rgba(192, 57, 43, 0.55)',
                    pointerEvents: 'none',
                    opacity: 0,
                  }}
                />
              )}

              {/* Summoning overlay badge */}
              {isSummoning && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(0, 0, 0, 0.35)',
                    pointerEvents: 'none',
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '0.55rem',
                      color: 'var(--color-text)',
                      background: 'rgba(20, 16, 12, 0.92)',
                      padding: '5px 8px',
                      borderRadius: 3,
                      border: '1px solid var(--color-gold)',
                      textAlign: 'center',
                      lineHeight: 1.4,
                      boxShadow: '2px 2px 0 rgba(0, 0, 0, 0.5)',
                    }}
                  >
                    {summoningTime} {summoningTime === 1 ? 'TURN' : 'TURNS'}
                    <br />
                    REMAINING
                  </span>
                </div>
              )}

              {/* Exhausted overlay */}
              {isExhausted && (
                <div
                  aria-hidden
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    pointerEvents: 'none',
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '0.5rem',
                      color: 'var(--color-muted)',
                    }}
                  >
                    EXHAUSTED
                  </span>
                </div>
              )}
            </div>

            {/* Health bar (below the card) */}
            <div
              style={{
                marginTop: 4,
                height: 8,
                width: CARD_W,
                background: 'rgba(0, 0, 0, 0.55)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 2,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${Math.round(hpRatio * 100)}%`,
                  height: '100%',
                  background: healthBarColor(hpRatio),
                  transition: 'width 180ms ease-out, background 180ms linear',
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Floating damage numbers — rendered outside the death/lunge/pop
          wrappers so the motion is always screen-relative, not compounded. */}
      {damageNumbers.map((d) => (
        <span
          key={d.id}
          aria-hidden
          className="animate-damage-rise"
          style={{
            position: 'absolute',
            top: 30,
            left: '50%',
            transform: 'translate(-50%, 0)',
            fontFamily: 'var(--font-display)',
            fontSize: '0.9rem',
            color: '#ffdede',
            textShadow:
              '0 0 6px rgba(192, 57, 43, 1), 0 0 14px rgba(192, 57, 43, 0.85), 2px 2px 0 rgba(0, 0, 0, 0.8)',
            pointerEvents: 'none',
            zIndex: 5,
            letterSpacing: 1,
          }}
        >
          -{d.value}
        </span>
      ))}
    </button>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StatPill({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 2,
        padding: '3px 5px',
        borderRadius: 2,
        background: color,
        fontFamily: 'var(--font-display)',
        fontSize: '0.38rem',
        color: '#fff',
        lineHeight: 1,
        boxShadow: '2px 2px 0 rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
      }}
    >
      <span style={{ opacity: 0.85 }}>{label}</span>
      <strong style={{ fontWeight: 400 }}>{value}</strong>
    </span>
  )
}
