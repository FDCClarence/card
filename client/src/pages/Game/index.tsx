import { useParams } from 'react-router-dom'

export default function GamePage() {
  const { roomId } = useParams<{ roomId: string }>()

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[var(--color-bg)] px-6 text-[var(--color-text)]">
      <div className="rounded-2xl border border-white/10 bg-[var(--color-surface)] px-10 py-8 text-center">
        <h1
          className="text-4xl"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--color-gold)' }}
        >
          ⚔️ Game
        </h1>
        <p className="mt-3 font-mono text-sm text-[var(--color-muted)]">Room: {roomId}</p>
        <p className="mt-4 text-[var(--color-muted)]">Game board coming soon…</p>
      </div>
    </main>
  )
}
