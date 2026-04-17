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
import { useParams } from 'react-router-dom'

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
