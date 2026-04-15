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
      <header className="flex justify-end">
        <div className="rounded-full border border-white/10 bg-[var(--color-surface)] px-4 py-2 text-sm text-[var(--color-muted)]">
          {username}
        </div>
      </header>

      <section className="flex flex-1 items-center justify-center">
        <div className="grid w-full max-w-5xl gap-6 md:grid-cols-3">
          {ACTIONS.map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={() => navigate(action.to)}
              className="group flex h-56 flex-col items-center justify-center gap-4 rounded-3xl border border-white/10 bg-[var(--color-surface)] shadow-[0_12px_36px_rgba(0,0,0,0.4)] transition duration-300 hover:-translate-y-2"
              style={{ boxShadow: `0 12px 36px rgba(0,0,0,0.4), 0 0 0 1px ${action.color}44 inset` }}
            >
              <span className="text-6xl leading-none">{action.icon}</span>
              <span
                className="text-3xl leading-none"
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
