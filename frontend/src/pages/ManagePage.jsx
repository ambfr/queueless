import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../lib/api'
import { useLive } from '../lib/useLive'
import Layout from '../components/Layout'
import StatusPill from '../components/StatusPill'
export default function ManagePage() {
  const { serviceId } = useParams()
  const [ctx, setCtx] = useState(null)
  const [tokens, setTokens] = useState([])
  const [q, setQ] = useState(null)
  const [error, setError] = useState('')

 async function load() {
    const [t, s, c] = await Promise.all([
      api(`/services/${serviceId}/tokens`),
      api(`/services/${serviceId}/queue`),
      api(`/services/${serviceId}`),
    ])
    setTokens(t)
    setQ(s)
    setCtx(c)
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
      <Link to={ctx ? `/b/${ctx.business_id}` : '/'} className="text-sm text-muted hover:text-ink">
        ← {ctx ? ctx.business_name : 'Home'}
      </Link>
      <h1 className="font-display font-extrabold text-4xl tracking-tight mt-2">
        {ctx ? ctx.service_name : 'Queue control'}
      </h1>
      {ctx && <p className="text-muted mt-1">{ctx.business_name} · {ctx.branch_name}</p>}

      {ctx && (
        <div className="card p-4 mt-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted font-semibold">Avg service time</p>
            <p className="font-mono font-bold text-2xl mt-1">{ctx.effective_minutes} min</p>
          </div>
          <p className="text-muted text-right text-xs max-w-[55%]">
            {ctx.sample_count > 0
              ? `Learned from ${ctx.sample_count} recent visits (you set ${ctx.avg_service_minutes} min)`
              : `Using your ${ctx.avg_service_minutes} min estimate until visits are completed`}
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 mt-6">
        <div className="rounded-2xl bg-ink text-paper p-6 text-center">
          <p className="text-xs uppercase tracking-widest opacity-60">Now serving</p>
          <p className="font-mono font-bold text-6xl mt-2">
            {q?.now_serving != null ? String(q.now_serving).padStart(3, '0') : '—'}
          </p>
        </div>
        <div className="card p-6 text-center">
          <p className="text-xs uppercase tracking-widest text-muted">Waiting</p>
          <p className="font-mono font-bold text-6xl mt-2">{q?.waiting ?? 0}</p>
        </div>
      </div>

      <button onClick={callNext} className="btn btn-accent w-full mt-4 py-4 text-base">
        Call next customer →
      </button>

      {error && <p className="text-red-600 text-sm mt-3">{error}</p>}

      <h2 className="text-xs uppercase tracking-widest text-muted font-semibold mt-10 mb-3">Active tokens</h2>
      <div className="space-y-2">
        {tokens.map((t) => (
          <div key={t.id} className="card flex items-center justify-between gap-3 px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="font-mono font-bold text-xl">#{String(t.token_number).padStart(3, '0')}</span>
              <StatusPill status={t.status} />
            </div>
            <div className="flex gap-2">
              {t.status === 'called' && (
                <>
                  <button onClick={() => setStatus(t.id, 'serving')} className="btn btn-sm">Start</button>
                  <button onClick={() => setStatus(t.id, 'skipped')} className="btn btn-ghost btn-sm">No-show</button>
                </>
              )}
              {['called', 'serving'].includes(t.status) && (
                <button onClick={() => setStatus(t.id, 'done')} className="btn btn-sm !bg-ok">Done</button>
              )}
            </div>
          </div>
        ))}
        {tokens.length === 0 && <p className="text-muted text-sm">No active tokens right now.</p>}
      </div>
    </Layout>
  )
}