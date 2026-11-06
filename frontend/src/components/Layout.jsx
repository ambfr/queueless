import { Link } from 'react-router-dom'
import { useAuth } from '../AuthContext'

export default function Layout({ children }) {
  const { profile, logout } = useAuth()
  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <header className="border-b border-slate-800">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold">QueueLess</Link>
          <div className="flex items-center gap-4 text-sm text-slate-400">
            <span>{profile?.full_name || profile?.email} · {profile?.role}</span>
            <button onClick={logout} className="hover:text-white">Log out</button>
          </div>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-8">{children}</main>
    </div>
  )
}