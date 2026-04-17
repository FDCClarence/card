import express from 'express'

import { query } from '../src/db.js'
import { requireAuth } from './middleware.js'

const router = express.Router()

const MAX_TOTAL = 20
const MAX_COPIES = 2

router.get('/', requireAuth, async (req, res) => {
  const rows = await query(
    'SELECT name, card_ids FROM decks WHERE user_id = ? AND is_active = 1 ORDER BY id DESC LIMIT 1',
    [Number(req.userId)],
  )
  const row = rows[0]
  const parsedCardIds =
    row && typeof row.card_ids === 'string'
      ? JSON.parse(row.card_ids)
      : Array.isArray(row?.card_ids)
        ? row.card_ids
        : []
  const deck = row ? { name: row.name, cardIds: parsedCardIds } : null
  return res.json({ deck })
})

router.post('/save', requireAuth, async (req, res) => {
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
  await query('UPDATE decks SET is_active = 0 WHERE user_id = ?', [Number(req.userId)])
  await query(
    'INSERT INTO decks (user_id, name, card_ids, is_active, created_at) VALUES (?, ?, ?, 1, CURDATE())',
    [
    Number(req.userId),
    deck.name,
    JSON.stringify(deck.cardIds),
    ],
  )

  return res.json({ deck })
})

export default router
