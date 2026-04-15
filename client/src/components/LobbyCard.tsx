import type { LobbyState } from '@shared'

type LobbyCardProps = {
  lobby: LobbyState
}

export function LobbyCard({ lobby }: LobbyCardProps) {
  return (
    <section className="w-full max-w-xl rounded-3xl border border-white/10 bg-[var(--color-surface)]/95 p-6 shadow-2xl shadow-black/20">
      <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">Current Lobby</p>
      <h2 className="mt-2 font-[var(--font-display)] text-3xl text-[var(--color-gold)]">
        {lobby.id}
      </h2>
      <div className="mt-6 grid grid-cols-2 gap-4">
        <div className="rounded-2xl bg-[var(--color-card)] p-4">
          <p className="text-sm text-[var(--color-muted)]">Players</p>
          <p className="mt-1 text-2xl font-bold text-[var(--color-text)]">{lobby.players}</p>
        </div>
        <div className="rounded-2xl bg-[var(--color-card)] p-4">
          <p className="text-sm text-[var(--color-muted)]">Status</p>
          <p className="mt-1 text-2xl font-bold capitalize text-[var(--color-accent)]">{lobby.status}</p>
        </div>
      </div>
    </section>
  )
}
