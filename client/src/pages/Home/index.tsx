import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

type ActionCard = {
  label: string
  icon: string
  to: '/lobby' | '/deck-editor' | '/options'
  color: string
}

const ACTIONS: ActionCard[] = [
  { label: 'Play', icon: '🎮', to: '/lobby', color: '#22c55e' },
  { label: 'Edit Deck', icon: '🗃️', to: '/deck-editor', color: '#3b82f6' },
  { label: 'Options', icon: '⚙️', to: '/options', color: '#9ca3af' },
]

export default function HomePage() {
  const navigate = useNavigate()
  const handleLogout = () => {
    localStorage.removeItem('authToken')
    localStorage.removeItem('authUser')
    navigate('/login')
  }

  const username = useMemo(() => {
    const raw = localStorage.getItem('authUser')
    if (!raw) return 'Player'
    try {
      const parsed = JSON.parse(raw) as { username?: string }
      return parsed.username?.trim() || 'Player'
    } catch {
      return 'Player'
    }
  }, [])

  return (
    <main className="flex min-h-screen flex-col bg-[var(--color-bg)] px-6 py-8 text-[var(--color-text)]">
      <header className="flex justify-end gap-3">
        <div
          className="border border-white/10 bg-[var(--color-surface)] px-4 py-2 text-xs text-[var(--color-muted)]"
          style={{ fontFamily: 'var(--font-display)', borderRadius: '4px' }}
        >
          {username}
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="border border-red-400/50 bg-red-500/20 px-4 py-2 text-xs text-red-300 transition hover:bg-red-500/30"
          style={{ fontFamily: 'var(--font-display)', borderRadius: '4px' }}
        >
          Log Out
        </button>
      </header>

      <section className="flex flex-1 items-center justify-center">
        <div className="grid w-full max-w-5xl gap-6 md:grid-cols-3">
          {ACTIONS.map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={() => navigate(action.to)}
              className="group flex h-56 flex-col items-center justify-center gap-5 border border-white/10 bg-[var(--color-surface)] shadow-[0_8px_28px_rgba(0,0,0,0.5)]"
              style={{
                borderRadius: '8px',
                boxShadow: `0 8px 28px rgba(0,0,0,0.5), 0 0 0 1px ${action.color}44 inset, 4px 4px 0 rgba(0,0,0,0.3)`,
              }}
              onMouseEnter={(e) => {
                ;(e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-4px)'
                ;(e.currentTarget as HTMLButtonElement).style.boxShadow = `0 12px 32px rgba(0,0,0,0.6), 0 0 0 2px ${action.color}88 inset, 4px 4px 0 rgba(0,0,0,0.3)`
              }}
              onMouseLeave={(e) => {
                ;(e.currentTarget as HTMLButtonElement).style.transform = ''
                ;(e.currentTarget as HTMLButtonElement).style.boxShadow = `0 8px 28px rgba(0,0,0,0.5), 0 0 0 1px ${action.color}44 inset, 4px 4px 0 rgba(0,0,0,0.3)`
              }}
            >
              <span className="text-6xl leading-none">{action.icon}</span>
              <span
                className="text-sm leading-none"
                style={{
                  color: action.color,
                  fontFamily: 'var(--font-display)',
                }}
              >
                {action.label}
              </span>
            </button>
          ))}
        </div>
      </section>
    </main>
  )
}
