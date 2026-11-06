import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'

export default function AuthPage() {
  const { login, register } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ full_name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  async function submit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      if (mode === 'login') await login(form.email, form.password)
      else await register(form.full_name, form.email, form.password)
      navigate('/')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const input =
    'w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500'

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4">
        <h1 className="text-3xl font-bold text-white text-center">QueueLess</h1>
        <p className="text-slate-400 text-center text-sm">
          {mode === 'login' ? 'Sign in to your account' : 'Create an account'}
        </p>

        {mode === 'register' && (
          <input className={input} placeholder="Full name" value={form.full_name} onChange={set('full_name')} />
        )}
        <input className={input} type="email" placeholder="Email" value={form.email} onChange={set('email')} required />
        <input className={input} type="password" placeholder="Password (min 6)" value={form.password} onChange={set('password')} required />

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button
          disabled={busy}
          className="w-full rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 py-2.5 font-semibold text-white"
        >
          {busy ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Sign up'}
        </button>

        <button
          type="button"
          onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }}
          className="w-full text-sm text-slate-400 hover:text-white"
        >
          {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
        </button>
      </form>
    </div>
  )
}