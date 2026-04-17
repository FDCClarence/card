import bcrypt from 'bcrypt'
import express from 'express'

import { query } from '../src/db.js'
import { findUserById } from './auth.js'
import { requireAuth } from './middleware.js'

const router = express.Router()
const SALT_ROUNDS = 10

router.patch('/username', requireAuth, async (req, res) => {
  const { username } = req.body ?? {}
  const nextUsername = String(username ?? '').trim()
  if (nextUsername.length < 2) {
    return res.status(400).json({ error: 'Username must be at least 2 characters.' })
  }

  const user = await findUserById(req.userId)
  if (!user) {
    return res.status(404).json({ error: 'User not found.' })
  }

  const duplicate = await query('SELECT id FROM users WHERE username = ? AND id <> ? LIMIT 1', [
    nextUsername,
    user.id,
  ])
  if (duplicate.length > 0) {
    return res.status(409).json({ error: 'Username is already in use.' })
  }

  await query('UPDATE users SET username = ?, updated_at = CURDATE() WHERE id = ?', [nextUsername, user.id])

  return res.json({
    user: {
      id: user.id,
      username: nextUsername,
      email: user.email,
    },
  })
})

router.patch('/password', requireAuth, async (req, res) => {
  const { oldPassword, newPassword } = req.body ?? {}
  if (!oldPassword || !newPassword) {
    return res.status(400).json({ error: 'Both old and new password are required.' })
  }
  if (String(newPassword).length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters.' })
  }

  const user = await findUserById(req.userId)
  if (!user) {
    return res.status(404).json({ error: 'User not found.' })
  }

  const passwordOk = await bcrypt.compare(String(oldPassword), user.passwordHash)
  if (!passwordOk) {
    return res.status(401).json({ error: 'Old password is incorrect.' })
  }

  const nextPasswordHash = await bcrypt.hash(String(newPassword), SALT_ROUNDS)
  await query('UPDATE users SET password = ?, updated_at = CURDATE() WHERE id = ?', [
    nextPasswordHash,
    user.id,
  ])

  return res.json({ ok: true })
})

export default router
