/**
 * Singleton Socket.io client instance.
 *
 * Import `socket` wherever you need to emit/listen.
 * The connection is lazy — it only opens on first import and reuses the same
 * socket for the lifetime of the tab, which avoids duplicate connections across
 * component remounts in StrictMode.
 *
 * Auth: the JWT stored in localStorage under `authToken` is attached to every
 * handshake via a function-form `auth` callback. socket.io-client invokes this
 * on each (re)connection attempt, so rotating the token in localStorage — e.g.
 * after login or logout — is picked up automatically on the next reconnect
 * without needing to recreate the singleton.
 */
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from '@shared'
import { io, type Socket } from 'socket.io-client'

const SOCKET_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>

export const socket: AppSocket = io(SOCKET_URL, {
  autoConnect: false,
  withCredentials: false,
  auth: (cb) => {
    const token =
      typeof window !== 'undefined'
        ? window.localStorage.getItem('authToken')
        : null
    cb({ token: token ?? '' })
  },
})
