/**
 * MonsterSlot — a single board slot. Three visual states:
 *   - Empty (monster === null): dashed box, non-interactive.
 *   - Summoning (isSummoning): dimmed mini-card with a turns-remaining badge.
 *   - Active: mini-card + health bar. Selectable, targetable, exhausted states
 *     are driven by the props `isSelected`, `isValidTarget`, and whether the
 *     monster has burned through its attacks this turn.
 */
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

export function MonsterSlot({
  monster,
  isMySlot,
  isSelected,
  isValidTarget,
  onClick,
}: MonsterSlotProps) {
  if (!monster) return <EmptySlot />

  const { currentStats, isSummoning, summoningTime, attacksUsed, attacksPerTurn, name, image } = monster
  const hp = Math.max(0, currentStats.health)
  const maxHp = Math.max(1, currentStats.maxHealth)
  const hpRatio = hp / maxHp
  const isExhausted = isMySlot && !isSummoning && attacksUsed >= attacksPerTurn

  // Clickability: summoning monsters can never be clicked as a target, and
  // exhausted friendly monsters shouldn't respond to clicks either.
  const clickable = !isSummoning && !isExhausted

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
        opacity: isExhausted ? 0.45 : 1,
      }}
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

      {/* Health bar */}
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
