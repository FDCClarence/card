import './env.js'

import { createServer } from 'node:http'

import type {
  ClientToServerEvents,
  LobbyState,
  ServerToClientEvents,
} from '@shared'
import express from 'express'
import { Server } from 'socket.io'

import authRouter from '../routes/auth.js'
import cardsRouter from '../routes/cards.js'
import deckRouter from '../routes/deck.js'
import userRouter from '../routes/user.js'
import { registerGameHandlers } from '../sockets/game.js'
import { registerLobbyHandlers } from '../sockets/lobby.js'
import { checkDbConnection } from './db.js'
import { httpPayloadFromDbError } from './httpErrors.js'

const PORT = Number(process.env.PORT ?? 3001)
const CORS_ORIGINS = (process.env.CORS_ORIGINS ?? 'http://localhost:5173,http://localhost:5174')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)
const CORS_ORIGIN_SET = new Set(CORS_ORIGINS)

const app = express()
const httpServer = createServer(app)

app.use((req, res, next) => {
  const requestOrigin = req.headers.origin
  if (requestOrigin && CORS_ORIGIN_SET.has(requestOrigin)) {
    res.setHeader('Access-Control-Allow-Origin', requestOrigin)
    res.setHeader('Vary', 'Origin')
    res.setHeader('Access-Control-Allow-Credentials', 'true')
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS')
    res.setHeader(
      'Access-Control-Allow-Headers',
      req.headers['access-control-request-headers'] ?? 'Content-Type,Authorization',
    )
  }

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204)
  }

  next()
})

app.use(express.json())
app.use('/api/auth', authRouter)
app.use('/api/user', userRouter)
app.use('/api/cards', cardsRouter)
app.use('/api/deck', deckRouter)

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: CORS_ORIGINS,
    credentials: true,
  },
})

const lobby: LobbyState = {
  id: 'cozy-tavern',
  players: 0,
  status: 'waiting',
}

app.get('/health', async (_req, res) => {
  try {
    await checkDbConnection()
    res.json({ ok: true, db: true, lobby })
  } catch {
    res.status(503).json({ ok: false, db: false, lobby })
  }
})

// Last: async route rejections and thrown errors from /api/* (Express 5 forwards them here)
app.use(
  (
    err: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error('API error:', err)
    if (res.headersSent) {
      return
    }
    const mapped = err instanceof Error ? httpPayloadFromDbError(err) : null
    if (mapped) {
      return res.status(mapped.status).json(mapped.body)
    }
    const message =
      err instanceof Error ? err.message : 'Internal server error'
    return res.status(500).json({
      error: process.env.NODE_ENV === 'production' ? 'Internal server error.' : message,
    })
  },
)

io.on('connection', (socket) => {
  io.emit('lobbyState', lobby)

  socket.on('joinLobby', (playerName: string) => {
    if (playerName.trim().length === 0) return
    lobby.players += 1
    io.emit('lobbyState', lobby)
  })

  socket.on('disconnect', () => {
    lobby.players = Math.max(lobby.players - 1, 0)
    io.emit('lobbyState', lobby)
  })

  registerLobbyHandlers(io, socket)
  registerGameHandlers(io, socket)
})

httpServer.listen(PORT, () => {
  console.log(`Server + Socket.io listening on http://localhost:${PORT}`)
})
