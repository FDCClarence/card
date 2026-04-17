import bcrypt from 'bcrypt'
import express from 'express'
import jwt from 'jsonwebtoken'
import { query } from '../src/db.js'
import { httpPayloadFromDbError } from '../src/httpErrors.js'

const router = express.Router()

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-only-change-me'
const JWT_EXPIRES_IN = '7d'
const SALT_ROUNDS = 10

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

export async function findUserById(userId) {
  const numericUserId = Number(userId)
  if (!Number.isInteger(numericUserId)) return null

  const rows = await query('SELECT id, username, email, password FROM users WHERE id = ? LIMIT 1', [
    numericUserId,
  ])
  const user = rows[0]
  if (!user) return null

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    passwordHash: user.password,
  }
}

router.post('/register', async (req, res) => {
  console.log('Register request:', req.body);
  try {
    const { username, email, password } = req.body ?? {}

    const normalizedUsername = String(username ?? '').trim()
    if (normalizedUsername.length < 2) {
      return res.status(400).json({ error: 'Username must be at least 2 characters.' })
    }

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ error: 'Please provide a valid email.' })
    }
    if (!password || password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' })
    }

    const normalizedEmail = String(email).toLowerCase().trim()
    const existingUsers = await query('SELECT id FROM users WHERE email = ? LIMIT 1', [normalizedEmail])
    if (existingUsers.length > 0) {
      return res.status(409).json({ error: 'Email is already registered.' })
    }

    const existingUsername = await query('SELECT id FROM users WHERE username = ? LIMIT 1', [normalizedUsername])
    if (existingUsername.length > 0) {
      return res.status(409).json({ error: 'Username is already taken.' })
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS)
    const result = await query(
      'INSERT INTO users (username, email, password, created_at, updated_at) VALUES (?, ?, ?, CURDATE(), CURDATE())',
      [normalizedUsername, normalizedEmail, passwordHash],
    )
    const user = {
      id: result.insertId,
      username: normalizedUsername,
      email: normalizedEmail,
      passwordHash,
    }

    const token = jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    })

    return res.status(201).json({ token, user: toPublicUser(user) })
  } catch (error) {
    console.error('Register error:', error)
    const mapped = httpPayloadFromDbError(error)
    if (mapped) {
      return res.status(mapped.status).json(mapped.body)
    }
    return res.status(500).json({ error: 'Registration failed.' })
  }
})

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body ?? {}
    const normalizedUsername = String(username ?? '').trim()

    if (normalizedUsername.length < 2) {
      return res.status(400).json({ error: 'Username must be at least 2 characters.' })
    }
    if (!password || password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' })
    }

    const rows = await query('SELECT id, username, email, password FROM users WHERE username = ? LIMIT 1', [
      normalizedUsername,
    ])
    const dbUser = rows[0]
    const user = dbUser
      ? {
          id: dbUser.id,
          username: dbUser.username,
          email: dbUser.email,
          passwordHash: dbUser.password,
        }
      : null
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials.' })
    }

    const ok = await bcrypt.compare(password, user.passwordHash)
    if (!ok) {
      return res.status(401).json({ error: 'Invalid credentials.' })
    }

    await query('UPDATE users SET last_login_time = NOW() WHERE id = ?', [user.id])

    const token = jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    })

    return res.json({ token, user: toPublicUser(user) })
  } catch (error) {
    console.error('Login error:', error)
    const mapped = httpPayloadFromDbError(error)
    if (mapped) {
      return res.status(mapped.status).json(mapped.body)
    }
    return res.status(500).json({ error: 'Login failed.' })
  }
})

export default router
