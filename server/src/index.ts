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
import { registerLobbyHandlers } from '../sockets/lobby.js'

const PORT = Number(process.env.PORT ?? 3001)

const app = express()
const httpServer = createServer(app)
app.use(express.json())
app.use('/api/auth', authRouter)
app.use('/api/user', userRouter)
app.use('/api/cards', cardsRouter)
app.use('/api/deck', deckRouter)

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: 'http://localhost:5173',
  },
})

const lobby: LobbyState = {
  id: 'cozy-tavern',
  players: 0,
  status: 'waiting',
}

app.get('/health', (_req, res) => {
  res.json({ ok: true, lobby })
})

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
})

httpServer.listen(PORT, () => {
  console.log(`Server + Socket.io listening on http://localhost:${PORT}`)
})
