import type { CardDefinition } from '@shared'
import { useCallback, useEffect, useMemo, useReducer } from 'react'

import { apiFetch } from '../../lib/api'

// ─── Constants ────────────────────────────────────────────────────────────────

export const MAX_TOTAL = 20
export const MAX_COPIES = 2

// ─── Types ────────────────────────────────────────────────────────────────────

/** cardId → copy count (always 1 or 2) */
export type DeckSlots = Record<string, number>

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

type State = {
  allCards: CardDefinition[]
  loadingCards: boolean
  loadError: string | null
  deckName: string
  slots: DeckSlots
  saveStatus: SaveStatus
  saveError: string | null
}

type Action =
  | { type: 'CARDS_LOADED'; cards: CardDefinition[]; savedDeck: { name: string; cardIds: string[] } | null }
  | { type: 'LOAD_ERROR'; message: string }
  | { type: 'SET_DECK_NAME'; name: string }
  | { type: 'ADD_CARD'; cardId: string }
  | { type: 'REMOVE_CARD'; cardId: string }
  | { type: 'CLEAR_DECK' }
  | { type: 'SAVE_START' }
  | { type: 'SAVE_SUCCESS' }
  | { type: 'SAVE_ERROR'; message: string }

// ─── Reducer ─────────────────────────────────────────────────────────────────

function slotsFromCardIds(cardIds: string[]): DeckSlots {
  const slots: DeckSlots = {}
  for (const id of cardIds) {
    slots[id] = (slots[id] ?? 0) + 1
  }
  return slots
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'CARDS_LOADED': {
      const slots = action.savedDeck ? slotsFromCardIds(action.savedDeck.cardIds) : {}
      const deckName = action.savedDeck?.name ?? 'My Deck'
      return { ...state, allCards: action.cards, loadingCards: false, slots, deckName }
    }
    case 'LOAD_ERROR':
      return { ...state, loadingCards: false, loadError: action.message }

    case 'SET_DECK_NAME':
      return { ...state, deckName: action.name }

    case 'ADD_CARD': {
      const current = state.slots[action.cardId] ?? 0
      const total = Object.values(state.slots).reduce((s, n) => s + n, 0)
      if (current >= MAX_COPIES || total >= MAX_TOTAL) return state
      return { ...state, slots: { ...state.slots, [action.cardId]: current + 1 } }
    }
    case 'REMOVE_CARD': {
      const current = state.slots[action.cardId] ?? 0
      if (current <= 0) return state
      if (current === 1) {
        const next = { ...state.slots }
        delete next[action.cardId]
        return { ...state, slots: next }
      }
      return { ...state, slots: { ...state.slots, [action.cardId]: current - 1 } }
    }
    case 'CLEAR_DECK':
      return { ...state, slots: {}, saveStatus: 'idle', saveError: null }

    case 'SAVE_START':
      return { ...state, saveStatus: 'saving', saveError: null }
    case 'SAVE_SUCCESS':
      return { ...state, saveStatus: 'saved' }
    case 'SAVE_ERROR':
      return { ...state, saveStatus: 'error', saveError: action.message }

    default:
      return state
  }
}

const INITIAL_STATE: State = {
  allCards: [],
  loadingCards: true,
  loadError: null,
  deckName: 'My Deck',
  slots: {},
  saveStatus: 'idle',
  saveError: null,
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useDeckEditor() {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE)

  // ── Initial data load ───────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      try {
        const [cards, deckPayload] = await Promise.all([
          apiFetch<CardDefinition[]>('/api/cards'),
          apiFetch<{ deck: { name: string; cardIds: string[] } | null }>('/api/deck'),
        ])
        dispatch({ type: 'CARDS_LOADED', cards, savedDeck: deckPayload.deck })
      } catch (err) {
        dispatch({
          type: 'LOAD_ERROR',
          message: err instanceof Error ? err.message : 'Failed to load cards.',
        })
      }
    }
    load()
  }, [])

  // ── Derived values ──────────────────────────────────────────────────────────
  const totalCards = useMemo(
    () => Object.values(state.slots).reduce((sum, n) => sum + n, 0),
    [state.slots],
  )

  const deckCards = useMemo(
    () =>
      state.allCards
        .filter((c) => state.slots[c.id] !== undefined)
        .map((c) => ({ card: c, count: state.slots[c.id] })),
    [state.allCards, state.slots],
  )

  const isValid = totalCards > 0 && state.deckName.trim().length > 0

  // ── Actions ─────────────────────────────────────────────────────────────────
  const setDeckName = useCallback((name: string) => {
    dispatch({ type: 'SET_DECK_NAME', name })
  }, [])

  const addCard = useCallback((cardId: string) => {
    dispatch({ type: 'ADD_CARD', cardId })
  }, [])

  const removeCard = useCallback((cardId: string) => {
    dispatch({ type: 'REMOVE_CARD', cardId })
  }, [])

  const clearDeck = useCallback(() => {
    dispatch({ type: 'CLEAR_DECK' })
  }, [])

  const saveDeck = useCallback(async () => {
    if (!isValid) return
    dispatch({ type: 'SAVE_START' })

    // Expand slots back into a flat cardIds array ordered by deckCards order.
    const cardIds: string[] = []
    for (const { card, count } of deckCards) {
      for (let i = 0; i < count; i++) cardIds.push(card.id)
    }

    try {
      await apiFetch('/api/deck/save', {
        method: 'POST',
        body: JSON.stringify({ name: state.deckName.trim(), cardIds }),
      })
      dispatch({ type: 'SAVE_SUCCESS' })
    } catch (err) {
      dispatch({
        type: 'SAVE_ERROR',
        message: err instanceof Error ? err.message : 'Failed to save deck.',
      })
    }
  }, [isValid, deckCards, state.deckName])

  return {
    // data
    allCards: state.allCards,
    loadingCards: state.loadingCards,
    loadError: state.loadError,
    // deck state
    deckName: state.deckName,
    slots: state.slots,
    totalCards,
    deckCards,
    isValid,
    // save
    saveStatus: state.saveStatus,
    saveError: state.saveError,
    // actions
    setDeckName,
    addCard,
    removeCard,
    clearDeck,
    saveDeck,
  }
}
