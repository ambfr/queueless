import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../AuthContext'
import { useLive } from '../lib/useLive'
import Layout from '../components/Layout'

const input =
  'rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500'
const btn = 'rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-4 py-2 text-sm font-semibold'

function ServiceRow({ service, isOwner, canManage, onChanged }) {
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
    <div className="rounded-lg bg-slate-800 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-medium">
            {service.name}
            {!service.is_open && <span className="ml-2 text-xs text-red-400">closed</span>}
          </p>
          <p className="text-xs text-slate-400">
            ~{service.avg_service_minutes} min each
            {q && ` · ${q.waiting} waiting · now serving ${q.now_serving ?? '—'}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canManage && (
            <Link to={`/manage/${service.id}`} className="text-sm text-indigo-400 hover:text-indigo-300">
              Manage
            </Link>
          )}
          {isOwner && (
            <button onClick={toggleOpen} className="text-xs text-slate-400 hover:text-white">
              {service.is_open ? 'Close' : 'Open'}
            </button>
          )}
          <button onClick={join} disabled={!service.is_open} className={btn}>Join queue</button>
        </div>
      </div>
      {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
    </div>
  )
}

export default function BusinessPage() {
  const { id } = useParams()
  const { profile } = useAuth()
  const [business, setBusiness] = useState(null)
  const [branches, setBranches] = useState([])
  const [branchForm, setBranchForm] = useState({ name: '', address: '' })
  const [serviceForms, setServiceForms] = useState({})
  const [error, setError] = useState('')

  async function load() {
    const [b, brs] = await Promise.all([
      api(`/businesses/${id}`),
      api(`/businesses/${id}/branches`),
    ])
    const withServices = await Promise.all(
      brs.map(async (br) => ({ ...br, services: await api(`/branches/${br.id}/services`) }))
    )
    setBusiness(b)
    setBranches(withServices)
  }

  useEffect(() => {
    load().catch((e) => setError(e.message))
  }, [id])

  const isOwner = business && profile && business.owner_id === profile.id
  const canManage = isOwner || profile?.role === 'staff'

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
    return <Layout><p className="text-slate-400">{error || 'Loading...'}</p></Layout>
  }

  return (
    <Layout>
      <Link to="/" className="text-sm text-slate-400 hover:text-white">← Back</Link>
      <h1 className="text-2xl font-bold mt-2">{business.name}</h1>
      {business.description && <p className="text-slate-400">{business.description}</p>}
      {error && <p className="text-red-400 text-sm mt-3">{error}</p>}

      <div className="mt-8 space-y-6">
        {branches.map((br) => (
          <section key={br.id}>
            <h2 className="font-semibold">{br.name}</h2>
            {br.address && <p className="text-sm text-slate-400 mb-3">{br.address}</p>}

            <div className="space-y-2">
              {br.services.map((s) => (
                <ServiceRow key={s.id} service={s} isOwner={isOwner} canManage={canManage} onChanged={load} />
              ))}
              {br.services.length === 0 && <p className="text-sm text-slate-500">No services yet.</p>}
            </div>

            {isOwner && (
              <form onSubmit={(e) => addService(e, br.id)} className="flex gap-2 mt-3">
                <input className={`${input} flex-1`} placeholder="New service" required
                  value={serviceForms[br.id]?.name || ''} onChange={setSF(br.id, 'name')} />
                <input className={`${input} w-24`} placeholder="Min" type="number" min="1"
                  value={serviceForms[br.id]?.mins || ''} onChange={setSF(br.id, 'mins')} />
                <button className={btn}>Add</button>
              </form>
            )}
          </section>
        ))}
      </div>

      {isOwner && (
        <form onSubmit={addBranch} className="mt-8 rounded-xl bg-slate-800/50 p-4 space-y-3">
          <p className="text-sm font-semibold">Add branch</p>
          <input className={`${input} w-full`} placeholder="Branch name" required
            value={branchForm.name} onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })} />
          <input className={`${input} w-full`} placeholder="Address"
            value={branchForm.address} onChange={(e) => setBranchForm({ ...branchForm, address: e.target.value })} />
          <button className={btn}>Add branch</button>
        </form>
      )}
    </Layout>
  )
}