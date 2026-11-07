import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../AuthContext'
import { useLive } from '../lib/useLive'
import Layout from '../components/Layout'

function ServiceOption({ service, canJoin, myToken }) {
  const navigate = useNavigate()
  const [q, setQ] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const load = () => api(`/services/${service.id}/queue`).then(setQ).catch(() => {})
  useEffect(() => { load() }, [service.id])
  useLive('queue_state', `service_id=eq.${service.id}`, load)

  const ahead = q ? q.waiting + (q.now_serving != null ? 1 : 0) : 0
  const wait = Math.ceil(ahead * service.effective_minutes)

  async function join() {
    setError('')
    setBusy(true)
    try {
      const t = await api(`/services/${service.id}/join`, { method: 'POST' })
      navigate(`/ticket/${t.id}`)
    } catch (e) {
      if (e.message.includes('already')) {
        const mine = await api('/tokens/mine')
        const existing = mine.find((t) => t.service_id === service.id)
        if (existing) return navigate(`/ticket/${existing.id}`)
      }
      setError(e.message)
      setBusy(false)
    }
  }

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold">
            {service.name}
            {!service.is_open && <span className="pill bg-red-100 text-red-700 ml-2">Closed</span>}
          </p>
          <p className="text-xs text-muted mt-1">
            ~{service.effective_minutes} min per person
            {q && ` · ${q.waiting} waiting · ~${wait} min wait`}
          </p>
        </div>

        {myToken ? (
          <Link to={`/ticket/${myToken.id}`} className="btn btn-ghost btn-sm shrink-0">View my token</Link>
        ) : (
          canJoin && (
            <button onClick={join} disabled={!service.is_open || busy} className="btn btn-accent btn-sm shrink-0">
              {busy ? 'Joining...' : 'Join'}
            </button>
          )
        )}
      </div>
      {error && <p className="text-red-600 text-xs mt-2">{error}</p>}
    </div>
  )
}

export default function BusinessJoinPage() {
  const { id } = useParams()
  const { profile } = useAuth()
  const [business, setBusiness] = useState(null)
  const [branches, setBranches] = useState([])
  const [isStaff, setIsStaff] = useState(false)
  const [myTokens, setMyTokens] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      const [b, brs, staff, mine] = await Promise.all([
        api(`/businesses/${id}`),
        api(`/businesses/${id}/branches`),
        api(`/businesses/${id}/staff`).catch(() => []),
        api('/tokens/mine').catch(() => []),
      ])
      const withServices = await Promise.all(
        brs.map(async (br) => ({ ...br, services: await api(`/branches/${br.id}/services`) }))
      )
      setBusiness(b)
      setBranches(withServices)
      setIsStaff(staff.some((s) => s.user_id === profile.id))
      setMyTokens(mine)
    }
    load().catch((e) => setError(e.message))
  }, [id])

  if (!business) {
    return <Layout><p className="text-muted">{error || 'Loading...'}</p></Layout>
  }

  const isMember = business.owner_id === profile.id || isStaff

  return (
    <Layout>
      <div className="text-center">
        <p className="text-xs uppercase tracking-widest text-muted font-semibold">Join a queue at</p>
        <h1 className="font-display font-extrabold text-4xl tracking-tight mt-2">{business.name}</h1>
        {business.description && <p className="text-muted mt-1">{business.description}</p>}
      </div>

      {isMember && (
        <div className="card p-4 mt-6 text-sm text-center">
          You work here, so you can't join these queues.{' '}
          <Link to={`/b/${business.id}`} className="font-semibold text-accent">Open dashboard →</Link>
        </div>
      )}

      {error && <p className="text-red-600 text-sm mt-4">{error}</p>}

      <div className="mt-8 space-y-8">
        {branches.map((br) => (
          <section key={br.id}>
            <div className="mb-3">
              <h2 className="font-display font-bold text-xl">{br.name}</h2>
              {br.address && <p className="text-sm text-muted">📍 {br.address}</p>}
            </div>
            <div className="space-y-3">
              {br.services.map((s) => (
                <ServiceOption
                  key={s.id}
                  service={s}
                  canJoin={!isMember}
                  myToken={myTokens.find((t) => t.service_id === s.id)}
                />
              ))}
              {br.services.length === 0 && <p className="text-sm text-muted">No services yet.</p>}
            </div>
          </section>
        ))}
        {branches.length === 0 && <p className="text-muted text-center">This business has no branches yet.</p>}
      </div>
    </Layout>
  )
}