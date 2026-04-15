import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import express from 'express'

const router = express.Router()

const __dirname = dirname(fileURLToPath(import.meta.url))
const CARDS_PATH = join(__dirname, '../../shared/cards/registry/cards.json')

// Parse once at startup — the registry is static at runtime.
const allCards = JSON.parse(readFileSync(CARDS_PATH, 'utf-8'))

router.get('/', (_req, res) => {
  return res.json(allCards)
})

export default router
