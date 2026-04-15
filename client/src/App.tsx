import { Navigate, Route, Routes } from 'react-router-dom'

import { AuthGuard } from './components/Auth/AuthGuard'
import { PageTransition } from './components/Layout/PageTransition'
import { StarfieldBackground } from './components/Layout/StarfieldBackground'
import { ToastContainer } from './components/UI/ToastContainer'
import { LoginPage } from './pages/Auth/LoginPage'
import { RegisterPage } from './pages/Auth/RegisterPage'
import DeckEditorPage from './pages/DeckEditor'
import GamePage from './pages/Game'
import HomePage from './pages/Home'
import LobbyPage from './pages/Lobby'
import OptionsPage from './pages/Options'

export default function App() {
  return (
    <>
      <StarfieldBackground />

      <PageTransition>
        <Routes>
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/home"
            element={
              <AuthGuard>
                <HomePage />
              </AuthGuard>
            }
          />
          <Route
            path="/lobby"
            element={
              <AuthGuard>
                <LobbyPage />
              </AuthGuard>
            }
          />
          <Route
            path="/game/:roomId"
            element={
              <AuthGuard>
                <GamePage />
              </AuthGuard>
            }
          />
          <Route
            path="/deck-editor"
            element={
              <AuthGuard>
                <DeckEditorPage />
              </AuthGuard>
            }
          />
          <Route
            path="/options"
            element={
              <AuthGuard>
                <OptionsPage />
              </AuthGuard>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </PageTransition>

      <ToastContainer />
    </>
  )
}
