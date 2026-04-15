import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'

interface PageTransitionProps {
  children: ReactNode
}

/**
 * Re-keyed on every navigation so the CSS `page-enter` animation
 * replays each time. Exit animations aren't needed — the instant swap
 * feels snappier for a card game UI.
 */
export function PageTransition({ children }: PageTransitionProps) {
  const { key } = useLocation()

  return (
    <div
      key={key}
      className="page-enter"
      style={{ position: 'relative', zIndex: 1, minHeight: '100dvh' }}
    >
      {children}
    </div>
  )
}
