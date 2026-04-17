/**
 * HandCard — a card rendered in the local player's hand.
 *
 * Two visual variants:
 *   - Monster card → the shared <Card/> component at size="sm".
 *   - Essence card → a distinctive gold-framed tile with a "✨ Essence" label.
 *
 * When it isn't the local player's turn the tile is visually disabled
 * (reduced opacity, no pointer events).
 */
import type { CardDefinition } from '@shared'

import { Card as CardComponent } from '../../components/Card/Card'
import type { CardInstance } from './game.types'

export interface HandCardProps {
  card: CardInstance
  isMyTurn: boolean
  onPlayMonster: (instanceId: string) => void
  onEssenceSelect: (instanceId: string) => void
}

export function HandCard({
  card,
  isMyTurn,
  onPlayMonster,
  onEssenceSelect,
}: HandCardProps) {
  // ── Essence variant ─────────────────────────────────────────────────────────
  if (card.isEssence) {
    return (
      <button
        type="button"
        onClick={() => onEssenceSelect(card.instanceId)}
        disabled={!isMyTurn}
        aria-label="Essence card"
        style={{
          width: 120,
          height: 168,
          border: '2px solid var(--color-gold)',
          borderRadius: 8,
          background:
            'radial-gradient(circle at 50% 30%, rgba(212, 150, 10, 0.32), transparent 70%), var(--color-card)',
          color: 'var(--color-text)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          padding: 10,
          cursor: isMyTurn ? 'pointer' : 'not-allowed',
          opacity: isMyTurn ? 1 : 0.45,
          pointerEvents: isMyTurn ? 'auto' : 'none',
          boxShadow:
            '0 6px 16px rgba(0, 0, 0, 0.55), inset 0 0 22px rgba(212, 150, 10, 0.22)',
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: '2.2rem', lineHeight: 1 }} aria-hidden="true">
          ✨
        </span>
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '0.55rem',
            color: 'var(--color-gold)',
            letterSpacing: 1,
          }}
        >
          Essence
        </span>
      </button>
    )
  }

  // ── Monster variant ─────────────────────────────────────────────────────────
  // When `isEssence === false` the CardDefinition fields are spread onto the
  // RuntimeCardInstance, so the cast is runtime-safe.
  const def = card as unknown as CardDefinition

  return (
    <div
      style={{
        opacity: isMyTurn ? 1 : 0.45,
        pointerEvents: isMyTurn ? 'auto' : 'none',
        flexShrink: 0,
        transition: 'opacity 0.15s ease',
      }}
    >
      <CardComponent
        card={def}
        size="sm"
        showDetails={false}
        disabled={!isMyTurn}
        onClick={() => onPlayMonster(card.instanceId)}
      />
    </div>
  )
}
