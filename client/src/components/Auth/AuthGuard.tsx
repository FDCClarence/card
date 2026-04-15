import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'

type JwtPayload = {
  exp?: number
}

type AuthGuardProps = {
  children: ReactNode
}

function parseJwtPayload(token: string): JwtPayload | null {
  try {
    const payloadBase64 = token.split('.')[1]
    if (!payloadBase64) return null
    const normalized = payloadBase64.replace(/-/g, '+').replace(/_/g, '/')
    const payloadString = atob(normalized)
    return JSON.parse(payloadString) as JwtPayload
  } catch {
    return null
  }
}

function isTokenValid(token: string | null): boolean {
  if (!token) return false
  const payload = parseJwtPayload(token)
  if (!payload?.exp) return false
  const nowSeconds = Math.floor(Date.now() / 1000)
  return payload.exp > nowSeconds
}

export function AuthGuard({ children }: AuthGuardProps) {
  const token = localStorage.getItem('authToken')
  const valid = isTokenValid(token)

  if (!valid) {
    localStorage.removeItem('authToken')
    localStorage.removeItem('authUser')
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
