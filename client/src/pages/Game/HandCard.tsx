/**
 * HandCard — a card rendered in the local player's hand.
 *
 * Two visual variants:
 *   - Monster card → the shared <Card/> component at size="sm".
 *   - Essence card → a distinctive gold-framed tile with a "✨ Essence" label.
 *
 * When it isn't the local player's turn the tile is visually disabled
 * (reduced opacity, no pointer events).
 *
 * Summoning-penalty preview:
 *   The authoritative server applies a partial-summoning penalty of
 *   `-player.summonedThisTurn` to each newly-summoned monster's attack and
 *   defense (floored at 1). The hand card previews the *effective* stats the
 *   card will have if played right now so the numbers the player sees in
 *   their hand always match what will land on the field.
 */
import type { CardDefinition } from '@shared'

import { Card as CardComponent } from '../../components/Card/Card'
import type { CardInstance } from './game.types'

export interface HandCardProps {
  card: CardInstance
  isMyTurn: boolean
  /**
   * Number of monsters the local player has already summoned this turn.
   * Each additional summon this turn subtracts 1 from the card's displayed
   * attack/defense (floored at 1) to match the server-side penalty.
   */
  summoningPenalty?: number
  onPlayMonster: (instanceId: string) => void
  onEssenceSelect: (instanceId: string) => void
}

export function HandCard({
  card,
  isMyTurn,
  summoningPenalty = 0,
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

  // Preview the penalized stats — mirrors `playMonster` in server/game/GameRoom.js.
  // When penalty === 0 the object is identical to `def` (referentially we still
  // allocate, but the badge path below is skipped).
  const penalty = Math.max(0, summoningPenalty)
  const displayDef: CardDefinition =
    penalty > 0
      ? {
          ...def,
          stats: {
            ...def.stats,
            attack: Math.max(1, def.stats.attack - penalty),
            defense: Math.max(1, def.stats.defense - penalty),
          },
        }
      : def

  return (
    <div
      style={{
        position: 'relative',
        opacity: isMyTurn ? 1 : 0.45,
        pointerEvents: isMyTurn ? 'auto' : 'none',
        flexShrink: 0,
        transition: 'opacity 0.15s ease',
      }}
    >
      <CardComponent
        card={displayDef}
        size="sm"
        showDetails={false}
        disabled={!isMyTurn}
        onClick={() => onPlayMonster(card.instanceId)}
      />
      {penalty > 0 && (
        <span
          aria-label={`Summoning penalty: -${penalty} attack and defense`}
          title={`Summoning penalty: -${penalty} ATK / -${penalty} DEF`}
          style={{
            position: 'absolute',
            top: 6,
            right: 6,
            zIndex: 10,
            padding: '2px 5px',
            borderRadius: 2,
            background: 'var(--color-accent)',
            color: '#fff',
            fontFamily: 'var(--font-display)',
            fontSize: '0.38rem',
            letterSpacing: 0.4,
            lineHeight: 1,
            boxShadow: '2px 2px 0 rgba(0, 0, 0, 0.55)',
            pointerEvents: 'none',
          }}
        >
          −{penalty}
        </span>
      )}
    </div>
  )
}
