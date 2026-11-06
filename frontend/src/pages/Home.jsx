import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../AuthContext'
import Layout from '../components/Layout'

const input =
  'w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500'

export default function Home() {
  const { refreshProfile } = useAuth()
  const [businesses, setBusinesses] = useState([])
  const [tickets, setTickets] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', description: '' })
  const [error, setError] = useState('')

  async function load() {
    const [b, t] = await Promise.all([api('/businesses'), api('/tokens/mine')])
    setBusinesses(b)
    setTickets(t)
  }

  useEffect(() => {
    load().catch((e) => setError(e.message))
  }, [])

  async function createBusiness(e) {
    e.preventDefault()
    setError('')
    try {
      await api('/businesses', { method: 'POST', body: form })
      setForm({ name: '', description: '' })
      setShowForm(false)
      await load()
      await refreshProfile()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <Layout>
      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      {tickets.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Your active tokens</h2>
          <div className="space-y-2">
            {tickets.map((t) => (
              <Link
                key={t.id}
                to={`/ticket/${t.id}`}
                className="flex items-center justify-between rounded-xl bg-indigo-600/20 border border-indigo-500/40 px-4 py-3"
              >
                <span className="font-semibold">Token #{t.token_number}</span>
                <span className="text-sm text-indigo-300 capitalize">{t.status}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Businesses</h2>
          <button
            onClick={() => setShowForm(!showForm)}
            className="text-sm text-indigo-400 hover:text-indigo-300"
          >
            {showForm ? 'Cancel' : '+ Register your business'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={createBusiness} className="space-y-3 mb-6 rounded-xl bg-slate-800/50 p-4">
            <input className={input} placeholder="Business name" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <input className={input} placeholder="Description (optional)" value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <button className="rounded-lg bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-sm font-semibold">
              Create
            </button>
          </form>
        )}

        <div className="space-y-2">
          {businesses.map((b) => (
            <Link
              key={b.id}
              to={`/b/${b.id}`}
              className="block rounded-xl bg-slate-800 hover:bg-slate-700 px-4 py-3 transition"
            >
              <p className="font-semibold">{b.name}</p>
              {b.description && <p className="text-sm text-slate-400">{b.description}</p>}
            </Link>
          ))}
          {businesses.length === 0 && <p className="text-slate-500 text-sm">No businesses yet.</p>}
        </div>
      </section>
    </Layout>
  )
}