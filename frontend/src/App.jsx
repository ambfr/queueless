import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './AuthContext'
import AuthPage from './pages/AuthPage'
import Home from './pages/Home'
import BusinessPage from './pages/BusinessPage'
import TicketPage from './pages/TicketPage'
import ManagePage from './pages/ManagePage'
import JoinPage from './pages/JoinPage'
import BusinessJoinPage from './pages/BusinessJoinPage'

function Protected({ children }) {
  const { profile, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <div className="min-h-screen grid place-items-center text-muted">Loading...</div>
  }
  if (!profile) {
    return <Navigate to={`/auth?next=${encodeURIComponent(location.pathname)}`} replace />
  }
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/" element={<Protected><Home /></Protected>} />
          <Route path="/b/:id" element={<Protected><BusinessPage /></Protected>} />
          <Route path="/q/:id" element={<Protected><BusinessJoinPage /></Protected>} />
          <Route path="/join/:serviceId" element={<Protected><JoinPage /></Protected>} />
          <Route path="/ticket/:id" element={<Protected><TicketPage /></Protected>} />
          <Route path="/manage/:serviceId" element={<Protected><ManagePage /></Protected>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}