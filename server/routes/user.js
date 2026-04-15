import bcrypt from 'bcrypt'
import express from 'express'

import { findUserById, usersByEmail } from './auth.js'
import { requireAuth } from './middleware.js'

const router = express.Router()
const SALT_ROUNDS = 10

router.patch('/username', requireAuth, (req, res) => {
  const { username } = req.body ?? {}
  if (!username || String(username).trim().length < 2) {
    return res.status(400).json({ error: 'Username must be at least 2 characters.' })
  }

  const user = findUserById(req.userId)
  if (!user) {
    return res.status(404).json({ error: 'User not found.' })
  }

  user.username = String(username).trim()
  usersByEmail.set(user.email, user)

  return res.json({
    user: {
      id: user.id,
      username: user.username,
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

  const user = findUserById(req.userId)
  if (!user) {
    return res.status(404).json({ error: 'User not found.' })
  }

  const passwordOk = await bcrypt.compare(String(oldPassword), user.passwordHash)
  if (!passwordOk) {
    return res.status(401).json({ error: 'Old password is incorrect.' })
  }

  user.passwordHash = await bcrypt.hash(String(newPassword), SALT_ROUNDS)
  usersByEmail.set(user.email, user)

  return res.json({ ok: true })
})

export default router
