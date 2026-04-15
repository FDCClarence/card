import express from 'express'

import { requireAuth } from './middleware.js'

const router = express.Router()

const MAX_TOTAL = 20
const MAX_COPIES = 2

/**
 * In-memory deck store: userId → { name: string, cardIds: string[] }
 * Replace with a real DB when you add persistence.
 */
const decksByUserId = new Map()

router.get('/', requireAuth, (req, res) => {
  const deck = decksByUserId.get(req.userId) ?? null
  return res.json({ deck })
})

router.post('/save', requireAuth, (req, res) => {
  const { name, cardIds } = req.body ?? {}

  if (!name || String(name).trim().length === 0) {
    return res.status(400).json({ error: 'Deck name is required.' })
  }
  if (!Array.isArray(cardIds) || cardIds.length === 0) {
    return res.status(400).json({ error: 'Deck cannot be empty.' })
  }
  if (cardIds.length > MAX_TOTAL) {
    return res.status(400).json({ error: `Deck cannot exceed ${MAX_TOTAL} cards.` })
  }

  // Validate copy limits
  const copyCounts = {}
  for (const id of cardIds) {
    copyCounts[id] = (copyCounts[id] ?? 0) + 1
    if (copyCounts[id] > MAX_COPIES) {
      return res.status(400).json({ error: `Max ${MAX_COPIES} copies of any card.` })
    }
  }

  const deck = { name: String(name).trim(), cardIds }
  decksByUserId.set(req.userId, deck)

  return res.json({ deck })
})

export default router
