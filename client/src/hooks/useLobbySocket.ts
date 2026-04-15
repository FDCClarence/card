/**
 * useLobbySocket
 *
 * Owns the socket lifecycle for the lobby screen:
 *   - Connects on mount, disconnects on unmount.
 *   - Exposes the full lobby phase state machine and emitter actions.
 *
 * Phase flow:
 *   idle → waiting (joinQueue / createRoom / joinRoom)
 *        → matchFound (auto, emitted by server)
 *        → (navigate to /game/:roomId from the page)
 *
 *   idle ← waiting (cancel)
 */
import { useCallback, useEffect, useRef, useState } from 'react'

import { socket } from '../lib/socket'

// ─── Types ────────────────────────────────────────────────────────────────────

export type LobbyPhase = 'idle' | 'waiting' | 'matchFound'

export type LobbyState = {
  phase: LobbyPhase
  /** Queue position in public matchmaking (1-based). null when not queued. */
  queuePosition: number | null
  /** Room key shown to the creator of a private room. */
  roomKey: string | null
  /** Room ID set when a match is found (public or private). */
  roomId: string | null
  /** Server error message (e.g. room not found). */
  error: string | null
}

const INITIAL_STATE: LobbyState = {
  phase: 'idle',
  queuePosition: null,
  roomKey: null,
  roomId: null,
  error: null,
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useLobbySocket() {
  const [state, setState] = useState<LobbyState>(INITIAL_STATE)
  // Track whether we're currently in the public queue so leaveQueue is safe.
  const inQueueRef = useRef(false)

  // ── Socket lifecycle ────────────────────────────────────────────────────────
  useEffect(() => {
    socket.connect()

    socket.on('lobby:waiting', ({ position }) => {
      inQueueRef.current = true
      setState((prev) => ({ ...prev, phase: 'waiting', queuePosition: position, error: null }))
    })

    socket.on('lobby:matchFound', ({ roomId }) => {
      inQueueRef.current = false
      setState((prev) => ({ ...prev, phase: 'matchFound', roomId, error: null }))
    })

    socket.on('lobby:roomCreated', ({ roomKey, roomId }) => {
      setState((prev) => ({
        ...prev,
        phase: 'waiting',
        roomKey,
        roomId,
        error: null,
      }))
    })

    socket.on('lobby:roomJoined', ({ roomId }) => {
      setState((prev) => ({ ...prev, phase: 'waiting', roomId, error: null }))
    })

    socket.on('lobby:roomNotFound', () => {
      setState((prev) => ({
        ...prev,
        phase: 'idle',
        error: 'Room not found. Check the key and try again.',
      }))
    })

    return () => {
      // If we were in the queue, tell the server before disconnecting.
      if (inQueueRef.current) {
        socket.emit('lobby:leaveQueue')
        inQueueRef.current = false
      }
      socket.off('lobby:waiting')
      socket.off('lobby:matchFound')
      socket.off('lobby:roomCreated')
      socket.off('lobby:roomJoined')
      socket.off('lobby:roomNotFound')
      socket.disconnect()
    }
  }, [])

  // ── Emitter actions ─────────────────────────────────────────────────────────

  const joinQueue = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }))
    socket.emit('lobby:joinQueue')
  }, [])

  const leaveQueue = useCallback(() => {
    inQueueRef.current = false
    socket.emit('lobby:leaveQueue')
    setState(INITIAL_STATE)
  }, [])

  const createRoom = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }))
    socket.emit('lobby:createRoom')
  }, [])

  const joinRoom = useCallback((key: string) => {
    setState((prev) => ({ ...prev, error: null }))
    socket.emit('lobby:joinRoom', { key })
  }, [])

  return { state, joinQueue, leaveQueue, createRoom, joinRoom }
}
