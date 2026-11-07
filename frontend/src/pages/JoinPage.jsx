import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../lib/api'
import { useLive } from '../lib/useLive'
import Layout from '../components/Layout'

export default function JoinPage() {
  const { serviceId } = useParams()
  const navigate = useNavigate()
  const [ctx, setCtx] = useState(null)
  const [q, setQ] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const load = () =>
    Promise.all([api(`/services/${serviceId}`), api(`/services/${serviceId}/queue`)])
      .then(([c, s]) => { setCtx(c); setQ(s) })
      .catch((e) => setError(e.message))

  useEffect(() => { load() }, [serviceId])
  useLive('queue_state', `service_id=eq.${serviceId}`, load)

  async function join() {
    setError('')
    setBusy(true)
    try {
      const t = await api(`/services/${serviceId}/join`, { method: 'POST' })
      navigate(`/ticket/${t.id}`, { replace: true })
    } catch (e) {
      if (e.message.includes('already')) {
        const mine = await api('/tokens/mine')
        const existing = mine.find((t) => t.service_id === serviceId)
        if (existing) return navigate(`/ticket/${existing.id}`, { replace: true })
      }
      setError(e.message)
      setBusy(false)
    }
  }

  if (!ctx) {
    return <Layout><p className="text-muted">{error || 'Loading...'}</p></Layout>
  }

  const ahead = q ? q.waiting + (q.now_serving != null ? 1 : 0) : 0
  const estWait = Math.ceil(ahead * ctx.effective_minutes)

  return (
    <Layout>
      <div className="card p-8 text-center max-w-md mx-auto">
        <p className="text-xs uppercase tracking-widest text-muted font-semibold">Join the queue</p>
        <h1 className="font-display font-extrabold text-3xl tracking-tight mt-3">{ctx.business_name}</h1>
        <p className="text-muted">{ctx.service_name} · {ctx.branch_name}</p>

        {q && (
          <div className="grid grid-cols-3 gap-3 mt-8">
            <div className="rounded-xl bg-paper p-3">
              <p className="font-mono font-bold text-2xl">{q.waiting}</p>
              <p className="text-xs text-muted mt-1">waiting</p>
            </div>
            <div className="rounded-xl bg-paper p-3">
              <p className="font-mono font-bold text-2xl">{q.now_serving ?? '—'}</p>
              <p className="text-xs text-muted mt-1">now serving</p>
            </div>
            <div className="rounded-xl bg-paper p-3">
              <p className="font-mono font-bold text-2xl">{estWait}</p>
              <p className="text-xs text-muted mt-1">min wait</p>
            </div>
          </div>
        )}

        {!ctx.is_open && <p className="mt-6 text-red-600 font-semibold">This service is closed right now.</p>}
        {error && <p className="text-red-600 text-sm mt-4">{error}</p>}

        <button onClick={join} disabled={!ctx.is_open || busy} className="btn btn-accent w-full py-3 mt-6 text-base">
          {busy ? 'Joining...' : 'Get my token'}
        </button>

        <Link to="/" className="inline-block mt-4 text-sm text-muted hover:text-ink">Back to home</Link>
      </div>
    </Layout>
  )
}