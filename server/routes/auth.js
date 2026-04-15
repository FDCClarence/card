import { randomUUID } from 'node:crypto'

import bcrypt from 'bcrypt'
import express from 'express'
import jwt from 'jsonwebtoken'

const router = express.Router()

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-only-change-me'
const JWT_EXPIRES_IN = '7d'
const SALT_ROUNDS = 10

/**
 * Minimal in-memory user DB for local development.
 * Replace with your real persistence layer later.
 */
export const usersByEmail = new Map()

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function toPublicUser(user) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
  }
}

export function findUserById(userId) {
  for (const user of usersByEmail.values()) {
    if (user.id === userId) {
      return user
    }
  }
  return null
}

router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body ?? {}

    if (!username || username.trim().length < 2) {
      return res.status(400).json({ error: 'Username must be at least 2 characters.' })
    }
    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ error: 'Please provide a valid email.' })
    }
    if (!password || password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' })
    }

    const normalizedEmail = String(email).toLowerCase().trim()
    if (usersByEmail.has(normalizedEmail)) {
      return res.status(409).json({ error: 'Email is already registered.' })
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS)
    const user = {
      id: randomUUID(),
      username: String(username).trim(),
      email: normalizedEmail,
      passwordHash,
    }

    usersByEmail.set(normalizedEmail, user)

    const token = jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    })

    return res.status(201).json({ token, user: toPublicUser(user) })
  } catch (error) {
    console.error('Register error:', error)
    return res.status(500).json({ error: 'Registration failed.' })
  }
})

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body ?? {}

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ error: 'Please provide a valid email.' })
    }
    if (!password || password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' })
    }

    const normalizedEmail = String(email).toLowerCase().trim()
    const user = usersByEmail.get(normalizedEmail)
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials.' })
    }

    const ok = await bcrypt.compare(password, user.passwordHash)
    if (!ok) {
      return res.status(401).json({ error: 'Invalid credentials.' })
    }

    const token = jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    })

    return res.json({ token, user: toPublicUser(user) })
  } catch (error) {
    console.error('Login error:', error)
    return res.status(500).json({ error: 'Login failed.' })
  }
})

export default router
