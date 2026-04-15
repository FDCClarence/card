import type { FormEvent } from 'react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useToast } from '../../context/ToastContext'

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

function authHeaders() {
  const token = localStorage.getItem('authToken')
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token ?? ''}`,
  }
}

export default function OptionsPage() {
  const navigate = useNavigate()
  const { addToast } = useToast()

  const [username, setUsername] = useState('')
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  // Inline validation errors (field-level)
  const [usernameError, setUsernameError] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)

  async function handleUsernameSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setUsernameError(null)
    if (username.trim().length < 2) {
      setUsernameError('Username must be at least 2 characters.')
      return
    }

    const response = await fetch(`${API_BASE}/api/user/username`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ username: username.trim() }),
    })
    const payload = (await response.json()) as { error?: string; user?: unknown }

    if (!response.ok) {
      addToast(payload.error ?? 'Failed to save username.', 'error')
      return
    }

    if (payload.user) {
      localStorage.setItem('authUser', JSON.stringify(payload.user))
    }
    setUsername('')
    addToast('Username updated!', 'success')
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPasswordError(null)
    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.')
      return
    }

    const response = await fetch(`${API_BASE}/api/user/password`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ oldPassword, newPassword }),
    })
    const payload = (await response.json()) as { error?: string }

    if (!response.ok) {
      addToast(payload.error ?? 'Failed to update password.', 'error')
      return
    }

    setOldPassword('')
    setNewPassword('')
    setConfirmPassword('')
    addToast('Password updated!', 'success')
  }

  const inputClass =
    'w-full rounded-xl border border-white/15 bg-[var(--color-card)] px-3 py-2.5 outline-none transition focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/50'
  const btnClass =
    'cursor-pointer rounded-xl bg-[var(--color-accent)] px-4 py-2 font-semibold text-white transition hover:brightness-110 active:scale-95'

  return (
    <main className="min-h-screen bg-[var(--color-bg)] px-6 py-10 text-[var(--color-text)]">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
        {/* Back nav */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/home')}
            className="cursor-pointer rounded-xl border border-white/15 px-3 py-1.5 text-sm text-[var(--color-muted)] transition hover:border-white/35 hover:text-[var(--color-text)] active:scale-95"
          >
            ← Home
          </button>
          <h1 className="font-[var(--font-display)] text-4xl text-[var(--color-gold)]">Options</h1>
        </div>

        <section className="rounded-2xl border border-white/10 bg-[var(--color-surface)] p-6">
          <h2 className="text-xl font-bold">Change Username</h2>
          <form className="mt-4 space-y-3" onSubmit={handleUsernameSubmit}>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="New username"
              className={inputClass}
            />
            {usernameError ? (
              <p className="text-sm text-red-400">{usernameError}</p>
            ) : null}
            <button type="submit" className={btnClass}>
              Save
            </button>
          </form>
        </section>

        <section className="rounded-2xl border border-white/10 bg-[var(--color-surface)] p-6">
          <h2 className="text-xl font-bold">Change Password</h2>
          <form className="mt-4 space-y-3" onSubmit={handlePasswordSubmit}>
            <input
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              placeholder="Current password"
              className={inputClass}
            />
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New password"
              className={inputClass}
            />
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              className={inputClass}
            />
            {passwordError ? (
              <p className="text-sm text-red-400">{passwordError}</p>
            ) : null}
            <button type="submit" className={btnClass}>
              Save
            </button>
          </form>
        </section>
      </div>
    </main>
  )
}
