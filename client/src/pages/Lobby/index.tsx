import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useLobbySocket } from '../../hooks/useLobbySocket'

// ─── Idle panel ───────────────────────────────────────────────────────────────

type IdlePanelProps = {
  onJoinQueue: () => void
  onCreateRoom: () => void
  onJoinRoom: (key: string) => void
  error: string | null
}

function IdlePanel({ onJoinQueue, onCreateRoom, onJoinRoom, error }: IdlePanelProps) {
  const [roomKey, setRoomKey] = useState('')

  return (
    <div className="flex w-full max-w-3xl flex-col gap-6 md:flex-row md:items-stretch">
      {/* Public queue */}
      <button
        type="button"
        onClick={onJoinQueue}
        className="group flex flex-1 flex-col items-center justify-center gap-3 rounded-3xl border border-[#22c55e]/30 bg-[var(--color-surface)] py-10 shadow-[0_0_32px_rgba(34,197,94,0.18)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_0_48px_rgba(34,197,94,0.35)] cursor-pointer active:scale-95"
      >
        <span className="text-5xl">🎮</span>
        <span
          className="text-3xl"
          style={{ fontFamily: 'var(--font-display)', color: '#22c55e' }}
        >
          Join Public Queue
        </span>
        <span className="text-sm text-[var(--color-muted)]">
          Get matched with a random opponent
        </span>
      </button>

      {/* Private room */}
      <div className="flex flex-1 flex-col gap-4 rounded-3xl border border-white/10 bg-[var(--color-surface)] p-6 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
        <h2 className="font-[var(--font-display)] text-2xl text-[#3b82f6]">Private Room</h2>

        <div className="flex gap-2">
          <input
            type="text"
            maxLength={6}
            placeholder="ROOM KEY"
            value={roomKey}
            onChange={(e) => setRoomKey(e.target.value.toUpperCase())}
            className="w-full rounded-xl border border-white/15 bg-[var(--color-card)] px-3 py-2.5 font-mono text-center uppercase tracking-widest text-[var(--color-text)] outline-none transition focus:border-[#3b82f6] focus:ring-2 focus:ring-[#3b82f6]/40"
          />
          <button
            type="button"
            onClick={() => onJoinRoom(roomKey)}
            disabled={roomKey.trim().length < 4}
            className="cursor-pointer rounded-xl bg-[#3b82f6] px-4 py-2.5 font-bold text-white transition hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Join
          </button>
        </div>

        <button
          type="button"
          onClick={onCreateRoom}
          className="w-full cursor-pointer rounded-xl border border-[#3b82f6]/40 py-2.5 font-semibold text-[#3b82f6] transition hover:bg-[#3b82f6]/10 active:scale-95"
        >
          Create Room
        </button>

        {error ? (
          <p className="text-center text-sm text-red-400">{error}</p>
        ) : null}
      </div>
    </div>
  )
}

// ─── Animated queue position number ──────────────────────────────────────────
// Using key={position} on the span causes React to remount it whenever the
// position changes, which re-triggers the CSS animation without needing state.

function QueuePosition({ position }: { position: number }) {
  return (
    <p className="mt-2 text-[var(--color-muted)]">
      Queue position:{' '}
      <span
        key={position}
        className="queue-number-pop inline-block font-bold"
        style={{ color: 'var(--color-gold)' }}
      >
        #{position}
      </span>
    </p>
  )
}

// ─── Waiting panel ────────────────────────────────────────────────────────────

type WaitingPanelProps = {
  queuePosition: number | null
  roomKey: string | null
  onCancel: () => void
}

function WaitingPanel({ queuePosition, roomKey, onCancel }: WaitingPanelProps) {
  return (
    <div className="flex flex-col items-center gap-8">
      {/* Bouncing card icons */}
      <div className="flex gap-3" aria-hidden="true">
        {(['🃏', '🎴', '🃏'] as const).map((icon, i) => (
          <span
            key={i}
            className="text-5xl"
            style={{
              animation: `bounce 1s ease-in-out ${i * 0.18}s infinite alternate`,
            }}
          >
            {icon}
          </span>
        ))}
      </div>

      <div className="text-center">
        {/* "Connecting…" pulse indicator */}
        <div className="mb-3 flex items-center justify-center gap-2">
          <span
            className="connecting-pulse inline-block h-2 w-2 rounded-full bg-[var(--color-accent)]"
            aria-hidden="true"
          />
          <span className="text-xs uppercase tracking-widest text-[var(--color-muted)]">
            Connecting…
          </span>
          <span
            className="connecting-pulse inline-block h-2 w-2 rounded-full bg-[var(--color-accent)]"
            style={{ animationDelay: '0.5s' }}
            aria-hidden="true"
          />
        </div>

        <h2
          className="text-3xl"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
        >
          Finding opponent…
        </h2>

        {queuePosition !== null ? (
          <QueuePosition position={queuePosition} />
        ) : null}

        {roomKey ? (
          <div className="mt-4 rounded-2xl border border-white/10 bg-[var(--color-surface)] px-6 py-3">
            <p className="text-xs uppercase tracking-widest text-[var(--color-muted)]">Share this room key</p>
            <p className="mt-1 font-mono text-3xl font-bold tracking-[0.3em] text-[var(--color-gold)]">
              {roomKey}
            </p>
          </div>
        ) : null}
      </div>

      <button
        type="button"
        onClick={onCancel}
        className="cursor-pointer rounded-xl border border-white/15 px-6 py-2.5 text-sm font-semibold text-[var(--color-muted)] transition hover:border-white/35 hover:text-[var(--color-text)] active:scale-95"
      >
        Cancel
      </button>

      <style>{`
        @media (prefers-reduced-motion: no-preference) {
          @keyframes bounce {
            from { transform: translateY(0px) rotate(-4deg); }
            to   { transform: translateY(-16px) rotate(4deg); }
          }
        }
      `}</style>
    </div>
  )
}

// ─── Match found flash ────────────────────────────────────────────────────────

function MatchFoundPanel() {
  return (
    <div className="flex flex-col items-center gap-4 animate-pulse">
      <span className="text-6xl">⚔️</span>
      <h2
        className="text-4xl"
        style={{ fontFamily: 'var(--font-display)', color: 'var(--color-gold)' }}
      >
        Opponent Found!
      </h2>
      <p className="text-[var(--color-muted)]">Entering the arena…</p>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LobbyPage() {
  const navigate = useNavigate()
  const { state, joinQueue, leaveQueue, createRoom, joinRoom } = useLobbySocket()
  const navigatedRef = useRef(false)

  useEffect(() => {
    if (state.phase === 'matchFound' && state.roomId && !navigatedRef.current) {
      navigatedRef.current = true
      const timer = setTimeout(() => {
        navigate(`/game/${state.roomId}`)
      }, 1200)
      return () => clearTimeout(timer)
    }
  }, [state.phase, state.roomId, navigate])

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[var(--color-bg)] px-6 py-14 text-[var(--color-text)]">
      <header className="mb-12 text-center">
        <h1
          className="text-5xl"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--color-gold)' }}
        >
          Tavern Lobby
        </h1>
        <p className="mt-2 text-[var(--color-muted)]">
          Choose your battle mode
        </p>
      </header>

      {state.phase === 'idle' && (
        <IdlePanel
          onJoinQueue={joinQueue}
          onCreateRoom={createRoom}
          onJoinRoom={joinRoom}
          error={state.error}
        />
      )}

      {state.phase === 'waiting' && (
        <WaitingPanel
          queuePosition={state.queuePosition}
          roomKey={state.roomKey}
          onCancel={leaveQueue}
        />
      )}

      {state.phase === 'matchFound' && <MatchFoundPanel />}
    </main>
  )
}
