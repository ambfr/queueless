import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../AuthContext'
import { useLive } from '../lib/useLive'
import Layout from '../components/Layout'
import QRCard from '../components/QRCard'
import StaffPanel from '../components/StaffPanel'
import BusinessSettings from '../components/BusinessSettings'
function ServiceRow({ service, isOwner, canManage, canJoin, onChanged }) {
  const navigate = useNavigate()
  const [q, setQ] = useState(null)
  const [error, setError] = useState('')

  const load = () => api(`/services/${service.id}/queue`).then(setQ).catch(() => {})
  useEffect(() => { load() }, [service.id])
  useLive('queue_state', `service_id=eq.${service.id}`, load)

  async function join() {
    setError('')
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
    }
  }

  async function toggleOpen() {
    await api(`/services/${service.id}`, { method: 'PATCH', body: { is_open: !service.is_open } })
    onChanged()
  }

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="font-semibold">
            {service.name}
            {!service.is_open && <span className="pill bg-red-100 text-red-700 ml-2">Closed</span>}
          </p>
                    <p className="text-xs text-muted mt-1">
            ~{service.effective_minutes} min per person
            {service.estimate_basis !== 'owner' && (
              <span className="pill bg-emerald-100 text-emerald-800 ml-2">
                {service.estimate_basis === 'learned' ? 'live estimate' : 'learning'}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canManage && <Link to={`/manage/${service.id}`} className="btn btn-ghost btn-sm">Manage</Link>}
          {isOwner && (
            <button onClick={toggleOpen} className="btn btn-ghost btn-sm">
              {service.is_open ? 'Close' : 'Open'}
            </button>
          )}
          {canJoin && (
            <button onClick={join} disabled={!service.is_open} className="btn btn-accent btn-sm">
              Join queue
            </button>
          )}
        </div>
      </div>

      {q && (
        <div className="flex gap-6 mt-3 pt-3 border-t border-dashed border-line text-sm">
          <p><span className="font-mono font-bold text-lg">{q.waiting}</span> <span className="text-muted">waiting</span></p>
          <p><span className="font-mono font-bold text-lg">{q.now_serving ?? '—'}</span> <span className="text-muted">now serving</span></p>
        </div>
      )}
      {error && <p className="text-red-600 text-xs mt-2">{error}</p>}
    </div>
  )
}
function ShareLink({ businessId }) {
  const [copied, setCopied] = useState(false)
  const url = `${window.location.origin}/q/${businessId}`

  async function copy() {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <button onClick={copy} className="btn btn-ghost btn-sm mt-3">
      {copied ? 'Link copied!' : 'Copy join link'}
    </button>
  )
}
export default function BusinessPage() {
  const { id } = useParams()
  const { profile } = useAuth()
  const [business, setBusiness] = useState(null)
  const [branches, setBranches] = useState([])
  const [isStaff, setIsStaff] = useState(false)
  const [branchForm, setBranchForm] = useState({ name: '', address: '' })
  const [serviceForms, setServiceForms] = useState({})
  const [error, setError] = useState('')

  async function load() {
    const [b, brs, staff] = await Promise.all([
      api(`/businesses/${id}`),
      api(`/businesses/${id}/branches`),
      api(`/businesses/${id}/staff`).catch(() => []),
    ])
    const withServices = await Promise.all(
      brs.map(async (br) => ({ ...br, services: await api(`/branches/${br.id}/services`) }))
    )
    setBusiness(b)
    setBranches(withServices)
    setIsStaff(staff.some((s) => s.user_id === profile.id))
  }

  useEffect(() => {
    load().catch((e) => setError(e.message))
  }, [id])

  const isOwner = business && profile && business.owner_id === profile.id
  const canManage = isOwner || isStaff

  async function addBranch(e) {
    e.preventDefault()
    setError('')
    try {
      await api(`/businesses/${id}/branches`, { method: 'POST', body: branchForm })
      setBranchForm({ name: '', address: '' })
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  async function addService(e, branchId) {
    e.preventDefault()
    setError('')
    const f = serviceForms[branchId] || {}
    try {
      await api(`/branches/${branchId}/services`, {
        method: 'POST',
        body: { name: f.name, avg_service_minutes: Number(f.mins) || 5 },
      })
      setServiceForms({ ...serviceForms, [branchId]: { name: '', mins: '' } })
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  const setSF = (branchId, k) => (e) =>
    setServiceForms({ ...serviceForms, [branchId]: { ...serviceForms[branchId], [k]: e.target.value } })

  if (!business) {
    return <Layout><p className="text-muted">{error || 'Loading...'}</p></Layout>
  }

  return (
    <Layout>
      <Link to="/" className="text-sm text-muted hover:text-ink">← All businesses</Link>
      <h1 className="font-display font-extrabold text-4xl tracking-tight mt-2">{business.name}</h1>
      {business.description && <p className="text-muted mt-1">{business.description}</p>}
      {!canManage && <ShareLink businessId={business.id} />}
      {error && <p className="text-red-600 text-sm mt-3">{error}</p>}

      <div className="mt-8 space-y-8">
        {branches.map((br) => (
          <section key={br.id}>
            <div className="mb-3">
              <h2 className="font-display font-bold text-xl">{br.name}</h2>
              {br.address && <p className="text-sm text-muted">📍 {br.address}</p>}
            </div>

            <div className="space-y-3">
              {br.services.map((s) => (
                <ServiceRow
                  key={s.id}
                  service={s}
                  isOwner={isOwner}
                  canManage={canManage}
                  canJoin={!canManage}
                  onChanged={load}
                />
              ))}
              {br.services.length === 0 && <p className="text-sm text-muted">No services yet.</p>}
            </div>

            {isOwner && (
              <details className="mt-3">
                <summary className="text-sm font-semibold text-accent cursor-pointer select-none">+ Add service</summary>
                <form onSubmit={(e) => addService(e, br.id)} className="flex gap-2 mt-3">
                  <input className="field flex-1" placeholder="Service name" required
                    value={serviceForms[br.id]?.name || ''} onChange={setSF(br.id, 'name')} />
                  <input className="field w-24" placeholder="Min" type="number" min="1"
                    value={serviceForms[br.id]?.mins || ''} onChange={setSF(br.id, 'mins')} />
                  <button className="btn btn-accent">Add</button>
                </form>
              </details>
            )}
          </section>
        ))}
      </div>

      {isOwner && (
        <form onSubmit={addBranch} className="card p-4 mt-10 space-y-3">
          <p className="text-xs uppercase tracking-widest text-muted font-semibold">Add a branch</p>
          <input className="field" placeholder="Branch name" required
            value={branchForm.name} onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })} />
          <input className="field" placeholder="Address"
            value={branchForm.address} onChange={(e) => setBranchForm({ ...branchForm, address: e.target.value })} />
          <button className="btn">Add branch</button>
        </form>
      )}
      {isOwner && <StaffPanel businessId={business.id} />}
      {canManage && <QRCard businessId={business.id} name={business.name} />}
      {isOwner && <BusinessSettings key={business.id} business={business} onSaved={load} />}
    </Layout>
  )
}