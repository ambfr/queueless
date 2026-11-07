import { useEffect, useState } from 'react'
import { api } from '../lib/api'

export default function StaffPanel({ businessId }) {
  const [staff, setStaff] = useState(null)
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const load = () =>
    api(`/businesses/${businessId}/staff`)
      .then(setStaff)
      .catch((e) => setError(e.message))

  useEffect(() => { load() }, [businessId])

  async function add(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await api(`/businesses/${businessId}/staff`, { method: 'POST', body: { email } })
      setEmail('')
      await load()
    } catch (err) {
      setError(
        err.message.includes('user not found')
          ? 'No account with that email. They need to sign up first.'
          : err.message
      )
    } finally {
      setBusy(false)
    }
  }

  async function remove(userId, name) {
    if (!window.confirm(`Remove ${name} from your staff?`)) return
    setError('')
    try {
      await api(`/businesses/${businessId}/staff/${userId}`, { method: 'DELETE' })
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <section className="mt-10">
      <h2 className="text-xs uppercase tracking-widest text-muted font-semibold mb-3">Staff</h2>

      <div className="card p-4">
        <div className="space-y-2">
          {staff === null && <div className="h-10 rounded-lg bg-paper animate-pulse" />}

          {staff?.map((s) => {
            const name = s.profiles?.full_name || 'Unnamed staff'
            return (
              <div key={s.user_id} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="grid place-items-center size-9 shrink-0 rounded-lg bg-sky-100 text-sky-800 font-display font-extrabold">
                    {name[0]}
                  </span>
                  <p className="font-medium truncate">{name}</p>
                </div>
                <button onClick={() => remove(s.user_id, name)} className="btn btn-ghost btn-sm text-red-600">
                  Remove
                </button>
              </div>
            )
          })}

          {staff?.length === 0 && (
            <p className="text-sm text-muted">No staff yet. Add someone below so they can run your queues.</p>
          )}
        </div>

        <form onSubmit={add} className="flex gap-2 mt-4 pt-4 border-t border-dashed border-line">
          <input
            className="field flex-1"
            type="email"
            placeholder="Staff member's email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <button disabled={busy} className="btn btn-accent">{busy ? 'Adding...' : 'Add staff'}</button>
        </form>

        {error && <p className="text-red-600 text-sm mt-3">{error}</p>}
        <p className="text-xs text-muted mt-3">
          Staff can call, serve and skip customers at every branch of this business. They can't edit the business or manage other staff.
        </p>
      </div>
    </section>
  )
}