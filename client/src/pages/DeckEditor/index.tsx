import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

import { Spinner } from '../../components/UI/Spinner'
import { useToast } from '../../context/ToastContext'

import { CollectionPanel } from './CollectionPanel'
import { DeckPanel } from './DeckPanel'
import { useDeckEditor } from './useDeckEditor'

export default function DeckEditorPage() {
  const navigate = useNavigate()
  const { addToast } = useToast()
  const {
    allCards,
    loadingCards,
    loadError,
    deckName,
    slots,
    totalCards,
    deckCards,
    isValid,
    saveStatus,
    saveError,
    setDeckName,
    addCard,
    removeCard,
    clearDeck,
    saveDeck,
  } = useDeckEditor()

  // Toast notifications on save state changes
  useEffect(() => {
    if (saveStatus === 'saved') {
      addToast('Deck saved!', 'success')
    } else if (saveStatus === 'error') {
      addToast(saveError ?? 'Failed to save deck.', 'error')
    }
    // Intentionally only reacting to saveStatus changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saveStatus])

  return (
    <div
      className="flex flex-col bg-[var(--color-bg)] text-[var(--color-text)]"
      style={{ height: '100dvh' }}
    >
      {/* ── Top bar ── */}
      <header className="flex shrink-0 items-center gap-4 border-b border-white/10 px-5 py-3">
        <button
          type="button"
          onClick={() => navigate('/home')}
          className="cursor-pointer rounded-xl border border-white/15 px-3 py-1.5 text-sm text-[var(--color-muted)] transition hover:border-white/35 hover:text-[var(--color-text)] active:scale-95"
          aria-label="Back to home"
        >
          ← Home
        </button>
        <h1 className="font-[var(--font-display)] text-2xl text-[var(--color-gold)]">
          Deck Editor
        </h1>
      </header>

      {/* ── Loading state ── */}
      {loadingCards && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4">
          <Spinner size="lg" color="var(--color-accent)" />
          <p className="text-sm text-[var(--color-muted)]">Loading cards…</p>
        </div>
      )}

      {/* ── Error state ── */}
      {loadError && (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-red-400">{loadError}</p>
        </div>
      )}

      {/* ── Split view ── */}
      {!loadingCards && !loadError && (
        <div className="flex min-h-0 flex-1">
          {/* Left: 65% collection */}
          <div className="flex flex-col" style={{ width: '65%' }}>
            <CollectionPanel
              cards={allCards}
              slots={slots}
              totalCards={totalCards}
              onAdd={addCard}
            />
          </div>

          {/* Right: 35% deck */}
          <div className="flex flex-col" style={{ width: '35%' }}>
            <DeckPanel
              deckName={deckName}
              deckCards={deckCards}
              totalCards={totalCards}
              isValid={isValid}
              saveStatus={saveStatus}
              saveError={saveError}
              onSetName={setDeckName}
              onRemove={removeCard}
              onSave={saveDeck}
              onClear={clearDeck}
            />
          </div>
        </div>
      )}
    </div>
  )
}
