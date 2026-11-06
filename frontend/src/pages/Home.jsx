import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../AuthContext'
import Layout from '../components/Layout'
import StatusPill from '../components/StatusPill'

const TINTS = ['bg-orange-200', 'bg-emerald-200', 'bg-sky-200', 'bg-rose-200', 'bg-violet-200', 'bg-amber-200']
const tint = (s) => TINTS[[...s].reduce((a, c) => a + c.charCodeAt(0), 0) % TINTS.length]

function Avatar({ name, size = 'size-12 text-xl' }) {
  return (
    <span className={`grid place-items-center shrink-0 rounded-xl font-display font-extrabold ${size} ${tint(name)}`}>
      {name[0]}
    </span>
  )
}

export default function Home() {
  const { profile, refreshProfile } = useAuth()
  const [businesses, setBusinesses] = useState(null)
  const [mine, setMine] = useState([])
  const [tickets, setTickets] = useState([])
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', description: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function load() {
    const [b, m, t] = await Promise.all([api('/businesses'), api('/businesses/mine'), api('/tokens/mine')])
    setBusinesses(b)
    setMine(m)
    setTickets(t)
  }

  useEffect(() => {
    load().catch((e) => setError(e.message))
  }, [])

  async function createBusiness(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await api('/businesses', { method: 'POST', body: form })
      setForm({ name: '', description: '' })
      setShowForm(false)
      await load()
      await refreshProfile()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return (businesses || []).filter((b) => `${b.name} ${b.description || ''}`.toLowerCase().includes(q))
  }, [businesses, search])

  const firstName = (profile?.full_name || profile?.email || '').split(' ')[0]

  return (
    <Layout>
      <h1 className="font-display font-extrabold text-4xl tracking-tight">Hi {firstName} 👋</h1>
      <p className="text-muted mt-1">Pick a business, grab a token, and wait from anywhere.</p>

      {error && <p className="text-red-600 text-sm mt-4">{error}</p>}

      {mine.length > 0 && (
        <section className="mt-8">
          <h2 className="text-xs uppercase tracking-widest text-muted font-semibold mb-3">Where you work</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {mine.map((b) => (
              <Link key={b.id} to={`/b/${b.id}`} className="card p-4 flex items-center gap-3 border-ink hover:bg-white transition">
                <Avatar name={b.name} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold truncate">{b.name}</p>
                  <p className="text-xs text-muted">Open dashboard →</p>
                </div>
                <span className={`pill ${b.my_role === 'owner' ? 'bg-ink text-paper' : 'bg-sky-100 text-sky-800'}`}>
                  {b.my_role === 'owner' ? 'Owner' : 'Staff'}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {tickets.length > 0 && (
        <section className="mt-8">
          <h2 className="text-xs uppercase tracking-widest text-muted font-semibold mb-3">Your active tokens</h2>
          <div className="grid gap-3">
            {tickets.map((t) => (
              <Link key={t.id} to={`/ticket/${t.id}`} className="card flex items-center gap-4 px-5 py-4 hover:border-ink transition">
                <span className="font-mono font-bold text-3xl">#{String(t.token_number).padStart(3, '0')}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold truncate">{t.business_name}</p>
                  <p className="text-sm text-muted truncate">{t.service_name} · {t.branch_name}</p>
                </div>
                <StatusPill status={t.status} />
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mt-10">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="text-xs uppercase tracking-widest text-muted font-semibold">All businesses</h2>
          <button onClick={() => setShowForm(!showForm)} className="btn btn-ghost btn-sm">
            {showForm ? 'Cancel' : '+ Register your business'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={createBusiness} className="card p-4 space-y-3 mb-5">
            <input className="field" placeholder="Business name" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <input className="field" placeholder="Short description (optional)" value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <button disabled={busy} className="btn btn-accent">Create business</button>
          </form>
        )}

        <input className="field mb-4" placeholder="Search businesses..." value={search}
          onChange={(e) => setSearch(e.target.value)} />

        {businesses === null && (
          <div className="grid gap-3 sm:grid-cols-2">
            {[1, 2, 3, 4].map((i) => <div key={i} className="card h-24 animate-pulse" />)}
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((b) => (
            <Link key={b.id} to={`/b/${b.id}`} className="card p-4 flex gap-3 hover:border-ink transition">
              <Avatar name={b.name} />
              <div className="min-w-0">
                <p className="font-semibold truncate">{b.name}</p>
                <p className="text-sm text-muted line-clamp-2">{b.description || 'No description'}</p>
              </div>
            </Link>
          ))}
        </div>

        {businesses && filtered.length === 0 && <p className="text-muted text-sm">No businesses match your search.</p>}
      </section>
    </Layout>
  )
}