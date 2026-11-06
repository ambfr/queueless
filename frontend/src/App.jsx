import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './AuthContext'
import AuthPage from './pages/AuthPage'
import Home from './pages/Home'
import BusinessPage from './pages/BusinessPage'
import TicketPage from './pages/TicketPage'
import ManagePage from './pages/ManagePage'

function Protected({ children }) {
  const { profile, loading } = useAuth()
  if (loading) {
    return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400">Loading...</div>
  }
  return profile ? children : <Navigate to="/auth" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/" element={<Protected><Home /></Protected>} />
          <Route path="/b/:id" element={<Protected><BusinessPage /></Protected>} />
          <Route path="/ticket/:id" element={<Protected><TicketPage /></Protected>} />
          <Route path="/manage/:serviceId" element={<Protected><ManagePage /></Protected>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}