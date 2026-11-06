import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../lib/api'
import { useLive } from '../lib/useLive'
import Layout from '../components/Layout'

const small = 'rounded-md px-3 py-1 text-xs font-semibold'

export default function ManagePage() {
  const { serviceId } = useParams()
  const [tokens, setTokens] = useState([])
  const [q, setQ] = useState(null)
  const [error, setError] = useState('')

  async function load() {
    const [t, s] = await Promise.all([
      api(`/services/${serviceId}/tokens`),
      api(`/services/${serviceId}/queue`),
    ])
    setTokens(t)
    setQ(s)
  }

  useEffect(() => {
    load().catch((e) => setError(e.message))
  }, [serviceId])

  useLive('tokens', `service_id=eq.${serviceId}`, () => load().catch(() => {}))

  async function act(fn) {
    setError('')
    try {
      await fn()
      await load()
    } catch (e) {
      setError(e.message)
    }
  }

  const callNext = () => act(() => api(`/services/${serviceId}/call-next`, { method: 'POST' }))
  const setStatus = (id, status) =>
    act(() => api(`/tokens/${id}/status`, { method: 'POST', body: { status } }))

  return (
    <Layout>
      <Link to="/" className="text-sm text-slate-400 hover:text-white">← Home</Link>
      <h1 className="text-2xl font-bold mt-2">Queue control</h1>

      {q && (
        <div className="grid grid-cols-2 gap-4 mt-6">
          <div className="rounded-xl bg-slate-800 p-4 text-center">
            <p className="text-3xl font-bold">{q.waiting}</p>
            <p className="text-xs text-slate-400">waiting</p>
          </div>
          <div className="rounded-xl bg-slate-800 p-4 text-center">
            <p className="text-3xl font-bold">{q.now_serving ?? '—'}</p>
            <p className="text-xs text-slate-400">now serving</p>
          </div>
        </div>
      )}

      <button
        onClick={callNext}
        className="mt-6 w-full rounded-xl bg-indigo-600 hover:bg-indigo-500 py-3 font-semibold"
      >
        Call next
      </button>

      {error && <p className="text-red-400 text-sm mt-3">{error}</p>}

      <div className="mt-8 space-y-2">
        {tokens.map((t) => (
          <div key={t.id} className="flex items-center justify-between rounded-lg bg-slate-800 px-4 py-3">
            <div>
              <span className="font-bold">#{t.token_number}</span>
              <span className="ml-3 text-sm capitalize text-slate-400">{t.status}</span>
            </div>
            <div className="flex gap-2">
              {t.status === 'called' && (
                <>
                  <button onClick={() => setStatus(t.id, 'serving')} className={`${small} bg-indigo-600`}>Start</button>
                  <button onClick={() => setStatus(t.id, 'skipped')} className={`${small} bg-slate-700`}>No-show</button>
                </>
              )}
              {['called', 'serving'].includes(t.status) && (
                <button onClick={() => setStatus(t.id, 'done')} className={`${small} bg-green-600`}>Done</button>
              )}
            </div>
          </div>
        ))}
        {tokens.length === 0 && <p className="text-slate-500 text-sm">No active tokens.</p>}
      </div>
    </Layout>
  )
}