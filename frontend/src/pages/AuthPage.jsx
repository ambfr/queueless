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

  const tab = (m) =>
    `rounded-lg py-2 transition ${mode === m ? 'bg-ink text-paper' : 'text-muted hover:text-ink'}`

  return (
    <div className="min-h-screen grid place-items-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="inline-grid place-items-center size-12 rounded-2xl bg-accent text-white font-display font-extrabold text-2xl">Q</span>
          <h1 className="font-display font-extrabold text-4xl tracking-tight mt-4">QueueLess</h1>
          <p className="text-muted mt-1">Skip the line. Not the service.</p>
        </div>

        <form onSubmit={submit} className="card p-6 space-y-3">
          <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-paper border border-line text-sm font-semibold">
            <button type="button" className={tab('login')} onClick={() => { setMode('login'); setError('') }}>Sign in</button>
            <button type="button" className={tab('register')} onClick={() => { setMode('register'); setError('') }}>Sign up</button>
          </div>

          {mode === 'register' && (
            <input className="field" placeholder="Full name" value={form.full_name} onChange={set('full_name')} />
          )}
          <input className="field" type="email" placeholder="Email" value={form.email} onChange={set('email')} required />
          <input className="field" type="password" placeholder="Password (min 6)" value={form.password} onChange={set('password')} required />

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <button disabled={busy} className="btn btn-accent w-full py-3">
            {busy ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>
      </div>
    </div>
  )
}