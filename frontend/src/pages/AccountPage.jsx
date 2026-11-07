import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { supabase } from '../lib/supabase'
import { useAuth } from '../AuthContext'
import Layout from '../components/Layout'

export default function AccountPage() {
  const { profile, refreshProfile } = useAuth()
  const [name, setName] = useState(profile.full_name || '')
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState('')
  const [delError, setDelError] = useState('')
  const [deleting, setDeleting] = useState(false)

  async function save(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await api('/auth/me', { method: 'PATCH', body: { full_name: name } })
      await refreshProfile()
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function deleteAccount() {
    setDelError('')
    setDeleting(true)
    try {
      await api('/auth/me', { method: 'DELETE' })
      await supabase.auth.signOut({ scope: 'local' }).catch(() => {})
      window.location.assign('/auth')
    } catch (err) {
      setDelError(err.message)
      setDeleting(false)
    }
  }

  return (
    <Layout>
      <Link to="/" className="text-sm text-muted hover:text-ink">← Home</Link>
      <h1 className="font-display font-extrabold text-4xl tracking-tight mt-2">Your account</h1>

      <form onSubmit={save} className="card p-5 mt-6 space-y-4">
        <div>
          <label className="text-xs uppercase tracking-widest text-muted font-semibold">Email</label>
          <p className="mt-1 font-medium">{profile.email}</p>
        </div>
        <div>
          <label className="text-xs uppercase tracking-widest text-muted font-semibold">Role</label>
          <p className="mt-1 font-medium capitalize">{profile.role.replace('_', ' ')}</p>
        </div>
        <div>
          <label className="text-xs uppercase tracking-widest text-muted font-semibold">Full name</label>
          <input className="field mt-1" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={60} />
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button disabled={busy || name.trim() === (profile.full_name || '')} className="btn btn-accent">
          {saved ? 'Saved ✓' : busy ? 'Saving...' : 'Save changes'}
        </button>
      </form>

      <section className="mt-10 rounded-2xl border border-red-300 bg-red-50 p-5">
        <h2 className="font-display font-bold text-lg text-red-700">Delete account</h2>
        <p className="text-sm text-red-900/80 mt-1">
          This permanently removes your account, your active tokens and your staff access. If you own a business, delete it first.
        </p>
        <p className="text-sm mt-4">Type <span className="font-mono font-bold">DELETE</span> to confirm:</p>
        <div className="flex gap-2 mt-2">
          <input className="field flex-1" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="DELETE" />
          <button
            onClick={deleteAccount}
            disabled={confirm !== 'DELETE' || deleting}
            className="btn !bg-red-600 hover:!bg-red-700"
          >
            {deleting ? 'Deleting...' : 'Delete my account'}
          </button>
        </div>
        {delError && <p className="text-red-700 text-sm mt-3">{delError}</p>}
      </section>
    </Layout>
  )
}