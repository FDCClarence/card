import { Card } from '@components/Card'
import type { CardDefinition, Rarity } from '@shared'
import { useMemo, useState } from 'react'

import { MAX_COPIES, MAX_TOTAL } from './useDeckEditor'

// ─── Types ────────────────────────────────────────────────────────────────────

type SortKey = 'name' | 'attack' | 'health'

type CollectionPanelProps = {
  cards: CardDefinition[]
  slots: Record<string, number>
  totalCards: number
  onAdd: (cardId: string) => void
}

// ─── Rarity filter config ─────────────────────────────────────────────────────

const RARITIES: Array<{ label: string; value: 'all' | Rarity; color: string }> = [
  { label: 'All', value: 'all', color: '#8892a4' },
  { label: 'Common', value: 'common', color: '#9ca3af' },
  { label: 'Rare', value: 'rare', color: '#3b82f6' },
  { label: 'Epic', value: 'epic', color: '#a855f7' },
  { label: 'Legendary', value: 'legendary', color: '#f59e0b' },
]

const SORTS: Array<{ label: string; value: SortKey }> = [
  { label: 'Name', value: 'name' },
  { label: 'Attack', value: 'attack' },
  { label: 'Health', value: 'health' },
]

// ─── Component ────────────────────────────────────────────────────────────────

export function CollectionPanel({ cards, slots, totalCards, onAdd }: CollectionPanelProps) {
  const [search, setSearch] = useState('')
  const [rarityFilter, setRarityFilter] = useState<'all' | Rarity>('all')
  const [sort, setSort] = useState<SortKey>('name')

  const filtered = useMemo(() => {
    const query = search.toLowerCase().trim()

    const base = cards.filter((c) => {
      if (rarityFilter !== 'all' && c.rarity !== rarityFilter) return false
      if (query && !c.name.toLowerCase().includes(query)) return false
      return true
    })

    return [...base].sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name)
      if (sort === 'attack') return b.stats.attack - a.stats.attack
      return b.stats.health - a.stats.health
    })
  }, [cards, search, rarityFilter, sort])

  const deckFull = totalCards >= MAX_TOTAL

  return (
    <div className="flex h-full flex-col overflow-hidden border-r border-white/10">
      {/* ── Toolbar ── */}
      <div className="shrink-0 space-y-3 border-b border-white/10 bg-[var(--color-bg)] px-5 py-4">
        {/* Search */}
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search cards…"
          className="w-full border border-white/15 bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] outline-none placeholder:text-[var(--color-muted)] focus:border-[var(--color-accent)] focus:ring-0"
          style={{ borderRadius: '4px' }}
        />

        {/* Rarity filter chips */}
        <div className="flex flex-wrap gap-2">
          {RARITIES.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => setRarityFilter(r.value)}
              className="px-3 py-1 text-xs font-semibold"
              style={
                rarityFilter === r.value
                  ? { background: r.color, color: '#0f1117', borderRadius: '3px', boxShadow: '2px 2px 0 rgba(0,0,0,0.35)' }
                  : {
                      background: 'rgba(255,255,255,0.06)',
                      color: r.color,
                      border: `1px solid ${r.color}66`,
                      borderRadius: '3px',
                    }
              }
            >
              {r.label}
            </button>
          ))}

          {/* Sort — pushed right with ml-auto */}
          <div className="ml-auto flex items-center gap-1">
            <span className="text-xs text-[var(--color-muted)]">Sort:</span>
            {SORTS.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => setSort(s.value)}
                className="px-3 py-1 text-xs font-semibold"
                style={
                  sort === s.value
                    ? { background: 'var(--color-accent)', color: '#fff', borderRadius: '3px', boxShadow: '2px 2px 0 rgba(0,0,0,0.35)' }
                    : {
                        background: 'rgba(255,255,255,0.06)',
                        color: 'var(--color-muted)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        borderRadius: '3px',
                      }
                }
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Results summary */}
        <p className="text-xs text-[var(--color-muted)]">
          {filtered.length} card{filtered.length !== 1 ? 's' : ''} · Deck full in{' '}
          <span className="font-bold text-[var(--color-text)]">{MAX_TOTAL - totalCards}</span> slots
        </p>
      </div>

      {/* ── Card grid ── */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        <div className="flex flex-wrap gap-3">
          {filtered.map((card) => {
            const count = slots[card.id] ?? 0
            const maxed = count >= MAX_COPIES

            return (
              <div key={card.id} className="relative">
                <Card
                  card={card}
                  size="sm"
                  selected={count > 0}
                  disabled={maxed || deckFull}
                  showDetails={false}
                  onClick={() => onAdd(card.id)}
                />
                {/* Count pip — shown whenever at least one copy is in the deck */}
                {count > 0 && (
                  <span
                    className="pointer-events-none absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center text-[10px] font-black text-white"
                    style={{
                      borderRadius: '2px',
                      boxShadow: '1px 1px 0 rgba(0,0,0,0.4)',
                      background: maxed ? '#ef4444' : '#22c55e',
                    }}
                    aria-label={`${count} in deck`}
                  >
                    {count}
                  </span>
                )}
                {/* MAX overlay */}
                {maxed && (
                  <div
                    className="pointer-events-none absolute inset-0 flex items-end justify-center pb-2"
                    style={{ borderRadius: '6px' }}
                    aria-hidden="true"
                  >
                    <span className="bg-black/70 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-red-400" style={{ borderRadius: '2px' }}>
                      MAX ×2
                    </span>
                  </div>
                )}
              </div>
            )
          })}

          {filtered.length === 0 && (
            <p className="py-16 text-center text-[var(--color-muted)] w-full">
              No cards match your filters.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
