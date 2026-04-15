/**
 * Singleton Socket.io client instance.
 *
 * Import `socket` wherever you need to emit/listen.
 * The connection is lazy — it only opens on first import and reuses the same
 * socket for the lifetime of the tab, which avoids duplicate connections across
 * component remounts in StrictMode.
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
})
