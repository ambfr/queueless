import { Link } from 'react-router-dom'
import { useAuth } from '../AuthContext'

export default function Layout({ children }) {
  const { profile, logout } = useAuth()

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 backdrop-blur bg-paper/80 border-b border-line">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="grid place-items-center size-8 rounded-lg bg-accent text-white font-display font-extrabold">Q</span>
            <span className="font-display font-extrabold text-xl tracking-tight">QueueLess</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/account" className="text-right leading-tight hover:opacity-70 transition">
              <p className="text-sm font-semibold max-w-32 sm:max-w-none truncate">
                {profile?.full_name || profile?.email}
              </p>
              <p className="text-xs text-muted capitalize hidden sm:block">{profile?.role?.replace('_', ' ')}</p>
            </Link>
            <button onClick={logout} className="btn btn-ghost btn-sm">Log out</button>
          </div>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-8">{children}</main>
    </div>
  )
}