import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../AuthContext'

export default function BusinessSettings({ business, onSaved }) {
  const navigate = useNavigate()
  const { refreshProfile } = useAuth()
  const [form, setForm] = useState({ name: business.name, description: business.description || '' })
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState('')
  const [deleting, setDeleting] = useState(false)

  async function save(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await api(`/businesses/${business.id}`, {
        method: 'PATCH',
        body: { name: form.name.trim(), description: form.description.trim() || null },
      })
      await onSaved()
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    setError('')
    setDeleting(true)
    try {
      await api(`/businesses/${business.id}`, { method: 'DELETE' })
      await refreshProfile()
      navigate('/', { replace: true })
    } catch (err) {
      setError(err.message)
      setDeleting(false)
    }
  }

  return (
    <section className="mt-10">
      <h2 className="text-xs uppercase tracking-widest text-muted font-semibold mb-3">Business settings</h2>

      <form onSubmit={save} className="card p-4 space-y-3">
        <input className="field" placeholder="Business name" value={form.name} required minLength={2} maxLength={100}
          onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input className="field" placeholder="Description" value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <button disabled={busy} className="btn btn-accent">
          {saved ? 'Saved ✓' : busy ? 'Saving...' : 'Save changes'}
        </button>
      </form>

      {error && <p className="text-red-600 text-sm mt-3">{error}</p>}

      <div className="mt-4 rounded-2xl border border-red-300 bg-red-50 p-5">
        <h3 className="font-display font-bold text-lg text-red-700">Delete business</h3>
        <p className="text-sm text-red-900/80 mt-1">
          Permanently deletes this business, all its branches, services, staff access and every token in its queues. Customers waiting will lose their tokens.
        </p>
        <p className="text-sm mt-4">Type <span className="font-mono font-bold">{business.name}</span> to confirm:</p>
        <div className="flex gap-2 mt-2">
          <input className="field flex-1" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          <button onClick={remove} disabled={confirm !== business.name || deleting} className="btn !bg-red-600 hover:!bg-red-700">
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </section>
  )
}