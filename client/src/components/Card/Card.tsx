import type { CardDefinition } from '@shared'
import { useState } from 'react'

import styles from './Card.module.css'
import { CardStats } from './CardStats'

// ─── Rarity fallback emojis used when the card image fails to load ────────────
const RARITY_EMOJI: Record<CardDefinition['rarity'], string> = {
  common: '🪨',
  rare: '💎',
  epic: '✨',
  legendary: '🌟',
}

// ─── Props ────────────────────────────────────────────────────────────────────
export interface CardProps {
  card: CardDefinition
  size?: 'sm' | 'md' | 'lg'
  selected?: boolean
  disabled?: boolean
  onClick?: (card: CardDefinition) => void
  showDetails?: boolean
}

// ─── Component ────────────────────────────────────────────────────────────────
export function Card({
  card,
  size = 'md',
  selected = false,
  disabled = false,
  onClick,
  showDetails = true,
}: CardProps) {
  const [imgFailed, setImgFailed] = useState(false)

  const classNames = [
    styles.card,
    // Always include flipIn: animation plays once on mount via CSS, then idles.
    // Legendary cards chain straight into the border-glow animation after the flip.
    styles.flipIn,
    styles[size],
    styles[`rarity-${card.rarity}`],
    selected && styles.selected,
    disabled && styles.disabled,
  ]
    .filter(Boolean)
    .join(' ')

  function handleClick() {
    if (!disabled && onClick) {
      onClick(card)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleClick()
    }
  }

  return (
    <article
      className={classNames}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={disabled ? -1 : 0}
      role={onClick ? 'button' : 'article'}
      aria-label={`${card.name} — ${card.rarity} card`}
      aria-pressed={onClick ? selected : undefined}
      aria-disabled={disabled}
    >
      {/* ── "NEW" badge — CSS lifecycle animation auto-fades it after 2s ── */}
      <span className={styles.newBadge} aria-hidden="true">
        NEW
      </span>

      {/* ── Image area ── */}
      <div className={styles.imageWrap}>
        {imgFailed ? (
          <div className={styles.imageFallback} aria-hidden="true">
            {RARITY_EMOJI[card.rarity]}
          </div>
        ) : (
          <img
            src={card.image}
            alt={card.name}
            className={styles.image}
            onError={() => setImgFailed(true)}
            draggable={false}
          />
        )}
      </div>

      {/* ── Name bar ── */}
      <div className={styles.namebar}>
        <p className={styles.name}>{card.name}</p>
      </div>

      {/* ── Stat badges ── */}
      <CardStats stats={card.stats} />

      {/* ── Description + effects (conditionally shown) ── */}
      {showDetails && (
        <div className={styles.details}>
          <p className={styles.description}>{card.description}</p>

          {card.effects.length > 0 && (
            <ul className={styles.effectsList} aria-label="Effects">
              {card.effects.map((effectId) => (
                <li key={effectId} className={styles.effectPill}>
                  {effectId.replace(/_/g, ' ')}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* ── Rarity badge ── */}
      <span className={styles.rarityBadge} aria-hidden="true">
        {card.rarity}
      </span>
    </article>
  )
}
