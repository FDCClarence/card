/**
 * HandCard — a card rendered in the local player's hand.
 *
 * Two visual variants:
 *   - Essence card: distinctive gold-framed tile with a "✨ ESSENCE" label.
 *   - Monster card: mini card preview using the CardDefinition fields spread
 *     onto the instance (name, image, stats).
 */
import type { CardInstance } from './game.types'

const CARD_W = 110
const CARD_H = 154

const RARITY_COLOR: Record<string, string> = {
  common: '#9ca3af',
  rare: '#3b82f6',
  epic: '#a855f7',
  legendary: '#f59e0b',
}

export interface HandCardProps {
  card: CardInstance
  onClick: () => void
  disabled?: boolean
  isSelected?: boolean
}

export function HandCard({ card, onClick, disabled = false, isSelected = false }: HandCardProps) {
  if (card.isEssence) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label="Essence card"
        aria-pressed={isSelected}
        style={{
          width: CARD_W,
          height: CARD_H,
          border: `2px solid ${isSelected ? 'var(--color-gold)' : '#a88a3a'}`,
          borderRadius: 8,
          background:
            'radial-gradient(circle at 50% 30%, rgba(212,150,10,0.25), transparent 70%), var(--color-card)',
          color: 'var(--color-text)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          padding: 8,
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
          boxShadow: isSelected
            ? '0 0 0 3px rgba(212, 150, 10, 0.7), 0 0 24px rgba(212, 150, 10, 0.55)'
            : '0 6px 16px rgba(0, 0, 0, 0.55)',
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: '2rem', lineHeight: 1 }}>✨</span>
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '0.45rem',
            color: 'var(--color-gold)',
            textAlign: 'center',
            letterSpacing: 0,
          }}
        >
          ESSENCE
        </span>
        <span
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '0.6rem',
            color: 'var(--color-muted)',
            fontStyle: 'italic',
            textAlign: 'center',
          }}
        >
          Heal ¼ max HP
        </span>
      </button>
    )
  }

  const rarity = typeof card.rarity === 'string' ? card.rarity : 'common'
  const border = RARITY_COLOR[rarity] ?? RARITY_COLOR.common
  const stats = card.stats
  const image = typeof card.image === 'string' ? card.image : null

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={`Play ${card.name ?? 'card'}`}
      aria-pressed={isSelected}
      style={{
        width: CARD_W,
        height: CARD_H,
        border: `2px solid ${isSelected ? 'var(--color-gold)' : border}`,
        borderRadius: 8,
        background: 'var(--color-card)',
        display: 'flex',
        flexDirection: 'column',
        padding: 0,
        overflow: 'hidden',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        boxShadow: isSelected
          ? '0 0 0 3px rgba(212, 150, 10, 0.7), 0 0 24px rgba(212, 150, 10, 0.55)'
          : '0 6px 16px rgba(0, 0, 0, 0.55)',
        flexShrink: 0,
      }}
    >
      {/* Image */}
      <div style={{ position: 'relative', flex: '0 0 55%', overflow: 'hidden' }}>
        {image ? (
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
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              background:
                'linear-gradient(135deg, rgba(255,255,255,0.04), rgba(0,0,0,0.25))',
            }}
          />
        )}
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

      {/* Name */}
      <div
        style={{
          padding: '4px 6px',
          background: 'rgba(18, 24, 20, 0.92)',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <p
          style={{
            margin: 0,
            fontFamily: 'var(--font-display)',
            fontSize: '0.4rem',
            lineHeight: 1.4,
            color: 'var(--color-text)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {card.name ?? card.cardId}
        </p>
      </div>

      {/* Stat badges */}
      {stats && (
        <div
          style={{
            display: 'flex',
            gap: 3,
            padding: '4px 5px',
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}
        >
          <Pill color="#c0392b" label="HP" value={stats.health} />
          <Pill color="#d35400" label="ATK" value={stats.attack} />
          <Pill color="#2471a3" label="DEF" value={stats.defense} />
        </div>
      )}
    </button>
  )
}

function Pill({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 2,
        padding: '2px 4px',
        borderRadius: 2,
        background: color,
        fontFamily: 'var(--font-display)',
        fontSize: '0.35rem',
        color: '#fff',
        lineHeight: 1,
        boxShadow: '2px 2px 0 rgba(0, 0, 0, 0.45)',
      }}
    >
      <span style={{ opacity: 0.85 }}>{label}</span>
      <strong style={{ fontWeight: 400 }}>{value}</strong>
    </span>
  )
}
