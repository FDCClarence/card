import type { CardDefinition } from '@shared'
import { useEffect, useRef, useState } from 'react'

import type { SaveStatus } from './useDeckEditor'
import { MAX_TOTAL } from './useDeckEditor'

// ─── Rarity colours (mirrors Card.module.css) ─────────────────────────────────

const RARITY_COLOR: Record<CardDefinition['rarity'], string> = {
  common: '#9ca3af',
  rare: '#3b82f6',
  epic: '#a855f7',
  legendary: '#f59e0b',
}

const RARITY_EMOJI: Record<CardDefinition['rarity'], string> = {
  common: '🪨',
  rare: '💎',
  epic: '✨',
  legendary: '🌟',
}

// ─── DeckEntry row ────────────────────────────────────────────────────────────

type DeckEntryProps = {
  card: CardDefinition
  count: number
  isRemoving: boolean
  onRemove: (cardId: string) => void
}

function DeckEntry({ card, count, isRemoving, onRemove }: DeckEntryProps) {
  const [imgFailed, setImgFailed] = useState(false)
  const color = RARITY_COLOR[card.rarity]

  // The <li> itself carries deck-card-pop — plays once when DeckEntry mounts
  // (i.e. when the card is first added to the deck).
  // The count badge uses key={count} so it remounts and pops on every count
  // change — no state or effects needed.
  return (
    <li
      style={{ overflow: 'hidden' }}
      className={`deck-card-pop${isRemoving ? ' deck-card-remove' : ''}`}
    >
      <div className="flex items-center gap-3 rounded-xl border border-white/8 bg-[var(--color-card)]/60 px-3 py-2 transition hover:bg-[var(--color-card)]/90">
        {/* Tiny card thumbnail */}
        <div
          className="h-10 w-8 shrink-0 overflow-hidden rounded-lg border"
          style={{ borderColor: `${color}88` }}
        >
          {imgFailed ? (
            <div
              className="flex h-full w-full items-center justify-center text-base"
              style={{ background: `${color}22` }}
              aria-hidden="true"
            >
              {RARITY_EMOJI[card.rarity]}
            </div>
          ) : (
            <img
              src={card.image}
              alt=""
              className="h-full w-full object-cover"
              onError={() => setImgFailed(true)}
              draggable={false}
            />
          )}
        </div>

        {/* Name */}
        <span
          className="flex-1 truncate text-sm font-semibold text-[var(--color-text)]"
          title={card.name}
        >
          {card.name}
        </span>

        {/* Count badge — key={count} remounts element → replays pop animation */}
        <span
          key={count}
          className="deck-card-pop shrink-0 rounded-full px-2 py-0.5 text-xs font-black text-[#0f1117]"
          style={{ background: color }}
          aria-label={`${count} cop${count === 1 ? 'y' : 'ies'}`}
        >
          ×{count}
        </span>

        {/* Remove one copy */}
        <button
          type="button"
          onClick={() => onRemove(card.id)}
          className="shrink-0 cursor-pointer rounded-lg px-2 py-1 text-[var(--color-muted)] transition hover:bg-red-500/20 hover:text-red-400 active:scale-90"
          aria-label={`Remove one ${card.name}`}
        >
          −
        </button>
      </div>
    </li>
  )
}

// ─── DeckPanel ────────────────────────────────────────────────────────────────

type DeckPanelProps = {
  deckName: string
  deckCards: Array<{ card: CardDefinition; count: number }>
  totalCards: number
  isValid: boolean
  saveStatus: SaveStatus
  saveError: string | null
  onSetName: (name: string) => void
  onRemove: (cardId: string) => void
  onSave: () => void
  onClear: () => void
}

const EXIT_ANIM_MS = 210

export function DeckPanel({
  deckName,
  deckCards,
  totalCards,
  isValid,
  saveStatus,
  saveError,
  onSetName,
  onRemove,
  onSave,
  onClear,
}: DeckPanelProps) {
  const [confirmClear, setConfirmClear] = useState(false)
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set())
  const nameRef = useRef<HTMLInputElement>(null)
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const isEmpty = totalCards === 0
  const isFull = totalCards >= MAX_TOTAL
  const savingNow = saveStatus === 'saving'

  function handleRemove(cardId: string) {
    // Mark as exiting so the animation class is applied
    setRemovingIds((prev) => new Set(prev).add(cardId))

    const timer = setTimeout(() => {
      onRemove(cardId)
      setRemovingIds((prev) => {
        const next = new Set(prev)
        next.delete(cardId)
        return next
      })
      timersRef.current.delete(cardId)
    }, EXIT_ANIM_MS)

    timersRef.current.set(cardId, timer)
  }

  // Clean up timers on unmount
  useEffect(() => {
    const timers = timersRef.current
    return () => {
      for (const t of timers.values()) clearTimeout(t)
    }
  }, [])

  function handleClearClick() {
    if (confirmClear) {
      onClear()
      setConfirmClear(false)
    } else {
      setConfirmClear(true)
    }
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[var(--color-bg)]">
      {/* ── Header ── */}
      <div className="shrink-0 border-b border-white/10 px-5 py-4">
        <label className="block text-xs uppercase tracking-widest text-[var(--color-muted)]" htmlFor="deck-name">
          Deck name
        </label>
        <input
          id="deck-name"
          ref={nameRef}
          type="text"
          value={deckName}
          maxLength={40}
          onChange={(e) => onSetName(e.target.value)}
          className="mt-1 w-full bg-transparent font-[var(--font-display)] text-2xl text-[var(--color-gold)] outline-none placeholder:text-[var(--color-muted)]"
          placeholder="My Deck"
        />

        <p className="mt-2 text-sm text-[var(--color-muted)]">
          <span
            className="font-bold"
            style={{ color: isFull ? '#ef4444' : 'var(--color-text)' }}
          >
            {totalCards}
          </span>
          <span className="text-[var(--color-muted)]"> / {MAX_TOTAL} cards</span>
          {isFull && <span className="ml-2 text-xs font-bold text-red-400">FULL</span>}
        </p>
      </div>

      {/* ── Card list ── */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {isEmpty ? (
          <p className="py-10 text-center text-sm text-[var(--color-muted)]">
            Click cards on the left to add them.
          </p>
        ) : (
          <ul className="space-y-2">
            {deckCards.map(({ card, count }) => (
              <DeckEntry
                key={card.id}
                card={card}
                count={count}
                isRemoving={removingIds.has(card.id)}
                onRemove={handleRemove}
              />
            ))}
          </ul>
        )}
      </div>

      {/* ── Actions ── */}
      <div className="shrink-0 space-y-2 border-t border-white/10 px-5 py-4">
        {saveStatus === 'error' && saveError && (
          <p className="text-center text-xs text-red-400">{saveError}</p>
        )}

        <button
          type="button"
          onClick={onSave}
          disabled={!isValid || savingNow}
          className="w-full cursor-pointer rounded-xl bg-[var(--color-accent)] py-2.5 font-bold text-white transition hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {savingNow ? 'Saving…' : 'Save Deck'}
        </button>

        <button
          type="button"
          onClick={handleClearClick}
          disabled={isEmpty}
          className="w-full cursor-pointer rounded-xl border py-2 text-sm font-semibold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
          style={
            confirmClear
              ? { borderColor: '#ef4444', color: '#ef4444', background: 'rgba(239,68,68,0.1)' }
              : { borderColor: 'rgba(255,255,255,0.15)', color: 'var(--color-muted)' }
          }
          onBlur={() => setConfirmClear(false)}
        >
          {confirmClear ? '⚠️ Confirm Clear' : 'Clear Deck'}
        </button>
      </div>
    </div>
  )
}
