import express from 'express'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { query } from '../src/db.js'
import { requireAuth } from './middleware.js'

const router = express.Router()

const MAX_TOTAL = 20
const MAX_COPIES = 2
const __dirname = dirname(fileURLToPath(import.meta.url))
const CARDS_PATH = join(__dirname, '../../shared/cards/registry/cards.json')
const allCards = JSON.parse(readFileSync(CARDS_PATH, 'utf-8'))
const maxCopiesByCardId = new Map(
  allCards.map((card) => [card.id, Number.isInteger(card.max_copies) && card.max_copies > 0 ? card.max_copies : MAX_COPIES]),
)

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
    const maxCopiesForCard = maxCopiesByCardId.get(id) ?? MAX_COPIES
    if (copyCounts[id] > maxCopiesForCard) {
      return res.status(400).json({ error: `Max ${maxCopiesForCard} copies for card "${id}".` })
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
