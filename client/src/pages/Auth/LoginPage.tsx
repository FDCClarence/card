import type { FormEvent } from 'react'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { AuthLayout } from './AuthLayout'
import { Spinner } from '../../components/UI/Spinner'

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

type LoginErrors = {
  username?: string
  password?: string
  form?: string
}

const inputClass =
  'w-full border border-white/15 bg-[var(--color-card)] px-3 py-2.5 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-accent)] focus:ring-0'
const labelClass = 'mb-1 block text-[10px] text-[var(--color-muted)] uppercase tracking-widest'

export function LoginPage() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<LoginErrors>({})
  const [submitting, setSubmitting] = useState(false)

  const canSubmit = useMemo(() => !submitting, [submitting])

  function validate() {
    const nextErrors: LoginErrors = {}
    if (username.trim().length < 2) {
      nextErrors.username = 'Username must be at least 2 characters.'
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
          username: username.trim(),
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
          <label className={labelClass} htmlFor="username">
            Username
          </label>
          <input
            id="username"
            type="text"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className={inputClass}
            style={{ borderRadius: '4px' }}
          />
          {errors.username ? <p className="mt-1 text-xs text-red-400">{errors.username}</p> : null}
        </div>

        <div>
          <label className={labelClass} htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
            style={{ borderRadius: '4px' }}
          />
          {errors.password ? <p className="mt-1 text-xs text-red-400">{errors.password}</p> : null}
        </div>

        {errors.form ? <p className="text-sm text-red-400">{errors.form}</p> : null}

        <button
          type="submit"
          disabled={!canSubmit}
          className="mt-2 flex w-full items-center justify-center gap-2 bg-[var(--color-accent)] px-4 py-3 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-70"
          style={{
            fontFamily: 'var(--font-display)',
            borderRadius: '4px',
            boxShadow: '3px 3px 0 rgba(0,0,0,0.4)',
            letterSpacing: 0,
          }}
        >
          {submitting ? (
            <>
              <Spinner size="sm" className="text-white" />
              Logging in...
            </>
          ) : (
            'Login'
          )}
        </button>

        <p className="pt-1 text-center text-xs text-[var(--color-muted)]">
          New here?{' '}
          <Link className="font-semibold text-[var(--color-accent)]" to="/register">
            Create an account
          </Link>
        </p>
      </form>
    </AuthLayout>
  )
}
