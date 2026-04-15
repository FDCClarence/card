import type { FormEvent } from 'react'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { AuthLayout } from './AuthLayout'

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

type LoginErrors = {
  email?: string
  password?: string
  form?: string
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<LoginErrors>({})
  const [submitting, setSubmitting] = useState(false)

  const canSubmit = useMemo(() => !submitting, [submitting])

  function validate() {
    const nextErrors: LoginErrors = {}
    if (!isValidEmail(email.trim())) {
      nextErrors.email = 'Please enter a valid email.'
    }
    if (password.length < 8) {
      nextErrors.password = 'Password must be at least 8 characters.'
    }
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!validate()) return

    setSubmitting(true)
    setErrors({})
    try {
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      })

      const payload = (await response.json()) as {
        token?: string
        user?: unknown
        error?: string
      }

      if (!response.ok || !payload.token) {
        setErrors({ form: payload.error ?? 'Login failed. Please try again.' })
        return
      }

      localStorage.setItem('authToken', payload.token)
      if (payload.user) {
        localStorage.setItem('authUser', JSON.stringify(payload.user))
      }
      navigate('/home')
    } catch {
      setErrors({ form: 'Unable to reach the server. Try again in a moment.' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout title="Welcome Back" subtitle="Log in to continue your card adventure.">
      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        <div>
          <label className="mb-1 block text-sm font-semibold text-[var(--color-text)]" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-white/15 bg-[var(--color-card)] px-3 py-2.5 text-[var(--color-text)] outline-none transition focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/50"
          />
          {errors.email ? <p className="mt-1 text-xs text-red-400">{errors.email}</p> : null}
        </div>

        <div>
          <label
            className="mb-1 block text-sm font-semibold text-[var(--color-text)]"
            htmlFor="password"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-white/15 bg-[var(--color-card)] px-3 py-2.5 text-[var(--color-text)] outline-none transition focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/50"
          />
          {errors.password ? <p className="mt-1 text-xs text-red-400">{errors.password}</p> : null}
        </div>

        {errors.form ? <p className="text-sm text-red-400">{errors.form}</p> : null}

        <button
          type="submit"
          disabled={!canSubmit}
          className="mt-2 w-full rounded-xl bg-[var(--color-accent)] px-4 py-2.5 font-bold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {submitting ? 'Logging in...' : 'Login'}
        </button>

        <p className="pt-1 text-center text-sm text-[var(--color-muted)]">
          New here?{' '}
          <Link className="font-semibold text-[var(--color-accent)] hover:brightness-110" to="/register">
            Create an account
          </Link>
        </p>
      </form>
    </AuthLayout>
  )
}
