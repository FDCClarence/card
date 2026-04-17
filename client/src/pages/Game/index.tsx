/**
 * GamePage — socket bridge for a single match.
 *
 * Connects on mount, subscribes to the three authoritative game events
 * (`game:stateUpdate`, `game:over`, `game:combatResult`) plus `game:error`,
 * and hands everything off to <GameBoard/>.
 *
 * Known limitation: `socket.disconnect()` on unmount means navigating away
 * from this page closes the active match session. A full fix (keeping a
 * persistent socket for the lobby → game transition so the server-side
 * GameRoom's stored socket.id stays valid) is out of scope for this chunk.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { socket } from '../../lib/socket'
import { GameBoard } from './GameBoard'
import type {
  CombatResult,
  GameOverResult,
  GameState,
} from './game.types'

export default function GamePage() {
  const { roomId } = useParams<{ roomId: string }>()

  const [state, setState] = useState<GameState | null>(null)
  const [gameOver, setGameOver] = useState<GameOverResult | null>(null)
  const [lastCombat, setLastCombat] = useState<CombatResult | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Track the live socket id so myPlayerIndex stays correct across reconnects.
  const socketIdRef = useRef<string | undefined>(socket.id)
  const [, forceRerender] = useState(0)

  // ── Socket lifecycle ──────────────────────────────────────────────────────

  useEffect(() => {
    socket.connect()
    socketIdRef.current = socket.id

    const onConnect = () => {
      socketIdRef.current = socket.id
      forceRerender((n) => n + 1)
    }

    const onState = (nextState: GameState) => {
      setState(nextState)
      setErrorMessage(null)
    }

    const onOver = (result: GameOverResult) => {
      setGameOver(result)
    }

    const onCombat = (result: CombatResult) => {
      setLastCombat(result)
      // Auto-clear so children can key animations on identity changes.
      window.setTimeout(() => {
        setLastCombat((curr) => (curr === result ? null : curr))
      }, 1500)
    }

    const onError = (payload: { message: string }) => {
      setErrorMessage(payload.message)
      window.setTimeout(() => {
        setErrorMessage((curr) => (curr === payload.message ? null : curr))
      }, 3000)
    }

    socket.on('connect', onConnect)
    socket.on('game:stateUpdate', onState)
    socket.on('game:over', onOver)
    socket.on('game:combatResult', onCombat)
    socket.on('game:error', onError)

    return () => {
      socket.off('connect', onConnect)
      socket.off('game:stateUpdate', onState)
      socket.off('game:over', onOver)
      socket.off('game:combatResult', onCombat)
      socket.off('game:error', onError)
      socket.disconnect()
    }
  }, [])

  // ── Emit callbacks ────────────────────────────────────────────────────────

  const onPlayMonster = useCallback((instanceId: string) => {
    socket.emit('game:playMonster', { instanceId })
  }, [])

  const onAttackMonster = useCallback(
    (attackerInstanceId: string, targetInstanceId: string) => {
      socket.emit('game:attackMonster', { attackerInstanceId, targetInstanceId })
    },
    [],
  )

  const onAttackPlayer = useCallback((attackerInstanceId: string) => {
    socket.emit('game:attackPlayer', { attackerInstanceId })
  }, [])

  const onUseEssence = useCallback((targetInstanceId: string) => {
    socket.emit('game:useEssence', { targetInstanceId })
  }, [])

  const onEndTurn = useCallback(() => {
    socket.emit('game:endTurn')
  }, [])

  // ── Render ────────────────────────────────────────────────────────────────

  if (!state) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-[var(--color-bg)] px-6 text-[var(--color-text)]">
        <div className="rounded-2xl border border-white/10 bg-[var(--color-surface)] px-10 py-8 text-center">
          <h1
            className="text-2xl"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-gold)' }}
          >
            Connecting…
          </h1>
          <p className="mt-3 font-mono text-sm text-[var(--color-muted)]">
            Room: {roomId ?? '?'}
          </p>
        </div>
      </main>
    )
  }

  const sid = socketIdRef.current
  const myPlayerIndex: 0 | 1 | -1 =
    state.players[0].id === sid ? 0 : state.players[1].id === sid ? 1 : -1

  return (
    <div style={{ position: 'relative' }}>
      <GameBoard
        state={state}
        myPlayerIndex={myPlayerIndex}
        lastCombat={lastCombat}
        gameOver={gameOver}
        onPlayMonster={onPlayMonster}
        onAttackMonster={onAttackMonster}
        onAttackPlayer={onAttackPlayer}
        onUseEssence={onUseEssence}
        onEndTurn={onEndTurn}
      />
      {errorMessage && <ErrorToast message={errorMessage} />}
      {gameOver && (
        <GameOverOverlay
          result={gameOver}
          myPlayerIndex={myPlayerIndex === 1 ? 1 : 0}
        />
      )}
    </div>
  )
}

/**
 * Full-screen end-of-match banner. Shows Victory / Defeat / Draw depending on
 * the local player's perspective; the "Back to Home" button fades in 800ms
 * after mount so the result can land before we offer an exit.
 */
function GameOverOverlay({
  result,
  myPlayerIndex,
}: {
  result: GameOverResult
  myPlayerIndex: 0 | 1
}) {
  const navigate = useNavigate()
  const [showButton, setShowButton] = useState(false)

  useEffect(() => {
    const id = window.setTimeout(() => setShowButton(true), 800)
    return () => window.clearTimeout(id)
  }, [])

  let title = 'Draw 🤝'
  let titleColor = 'var(--color-gold)'
  if (result.winner === 'draw') {
    title = 'Draw 🤝'
    titleColor = 'var(--color-gold)'
  } else if (result.winner === myPlayerIndex) {
    title = 'Victory 🎉'
    titleColor = 'var(--color-gold)'
  } else {
    title = 'Defeat 💀'
    titleColor = 'var(--color-accent)'
  }

  // Inline opacity/transform initial states are intentionally omitted. The
  // keyframes start from opacity:0 / scale(0.8) and the animation's first
  // paint applies that state before the browser renders. For users with
  // `prefers-reduced-motion: reduce`, the animation classes are a no-op (the
  // rules live inside a `@media (prefers-reduced-motion: no-preference)`
  // block) and the overlay simply appears fully opaque at its natural size.
  return (
    <div
      role="alertdialog"
      aria-label="Game over"
      className="animate-gameover-fade"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(10, 8, 6, 0.82)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 40,
        zIndex: 200,
        backdropFilter: 'blur(2px)',
      }}
    >
      <h1
        className="animate-gameover-pop"
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(2.4rem, 9vw, 5.5rem)',
          color: titleColor,
          margin: 0,
          letterSpacing: 4,
          textShadow:
            '0 0 24px rgba(0, 0, 0, 0.8), 0 0 44px rgba(212, 150, 10, 0.35)',
        }}
      >
        {title}
      </h1>

      {showButton && (
        <button
          type="button"
          onClick={() => navigate('/home')}
          className="animate-gameover-button-in"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '0.7rem',
            color: '#1a1612',
            background: 'var(--color-gold)',
            border: '2px solid rgba(0, 0, 0, 0.45)',
            borderRadius: 4,
            padding: '14px 28px',
            cursor: 'pointer',
            letterSpacing: 2,
            boxShadow:
              '3px 3px 0 rgba(0, 0, 0, 0.55), 0 0 30px rgba(212, 150, 10, 0.4)',
          }}
        >
          BACK TO HOME
        </button>
      )}
    </div>
  )
}

function ErrorToast({ message }: { message: string }) {
  return (
    <div
      role="status"
      style={{
        position: 'fixed',
        top: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        padding: '8px 16px',
        background: 'rgba(192, 57, 43, 0.95)',
        color: '#fff',
        fontFamily: 'var(--font-display)',
        fontSize: '0.55rem',
        border: '2px solid rgba(0,0,0,0.4)',
        borderRadius: 3,
        boxShadow: '2px 2px 0 rgba(0, 0, 0, 0.6)',
        zIndex: 100,
        letterSpacing: 1,
      }}
    >
      {message}
    </div>
  )
}
