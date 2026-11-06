import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../lib/api'
import { useLive } from '../lib/useLive'
import Layout from '../components/Layout'
import StatusPill from '../components/StatusPill'

const STEPS = ['waiting', 'called', 'serving', 'done']

const MESSAGES = {
  waiting: 'Sit tight. We will update this page live.',
  called: "It's your turn! Please head to the counter.",
  serving: 'You are being served right now.',
  done: 'All done. Thanks for visiting!',
  skipped: 'You were skipped. Join again if you still need service.',
  cancelled: 'This token was cancelled.',
}

function Live() {
  return (
    <span className="flex items-center gap-1.5 text-xs text-muted">
      <span className="relative flex size-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-ok opacity-75" />
        <span className="relative inline-flex rounded-full size-2 bg-ok" />
      </span>
      Live
    </span>
  )
}

export default function TicketPage() {
  const { id } = useParams()
  const [info, setInfo] = useState(null)
  const [error, setError] = useState('')

  const load = () => api(`/tokens/${id}`).then(setInfo).catch((e) => setError(e.message))

  useEffect(() => { load() }, [id])
  useLive('tokens', `id=eq.${id}`, load)
  useLive('queue_state', info ? `service_id=eq.${info.service_id}` : null, load)

  useEffect(() => {
    if (!info) return
    document.title =
      info.status === 'called' ? `🔔 Your turn! #${info.token_number}` : `#${info.token_number} · QueueLess`
    return () => { document.title = 'QueueLess' }
  }, [info])

  async function cancel() {
    try {
      await api(`/tokens/${id}/cancel`, { method: 'POST' })
      load()
    } catch (e) {
      setError(e.message)
    }
  }

  if (!info) {
    return <Layout><p className="text-muted">{error || 'Loading...'}</p></Layout>
  }

  const called = info.status === 'called'
  const stepIndex = STEPS.indexOf(info.status)
  const cancellable = ['waiting', 'called'].includes(info.status)

  return (
    <Layout>
      <Link to="/" className="text-sm text-muted hover:text-ink">← Home</Link>

      <div className={`card overflow-hidden mt-4 ${called ? 'ring-2 ring-accent' : ''}`}>
        <div className="p-8 text-center">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-widest text-muted font-semibold">Your token</span>
            <Live />
          </div>

          <div className="mt-4">
            <p className="font-display font-bold text-xl">{info.business_name}</p>
            <p className="text-sm text-muted">{info.service_name} · {info.branch_name}</p>
          </div>

          <p className={`font-mono font-bold text-8xl mt-4 ${called ? 'text-accent' : ''}`}>
            {String(info.token_number).padStart(3, '0')}
          </p>
          <div className="mt-3"><StatusPill status={info.status} /></div>
          <p className="mt-3 text-muted">{MESSAGES[info.status]}</p>
        </div>

        <div className="relative border-t-2 border-dashed border-line">
          <span className="absolute -left-3 -top-3 size-6 rounded-full bg-paper border border-line" />
          <span className="absolute -right-3 -top-3 size-6 rounded-full bg-paper border border-line" />
        </div>

        <div className="p-6 space-y-6">
          {info.status === 'waiting' && (
            <div>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="font-mono font-bold text-4xl">{info.people_ahead}</p>
                  <p className="text-xs text-muted mt-1">people ahead</p>
                </div>
                <div>
                  <p className="font-mono font-bold text-4xl">
                    {info.people_ahead === 0 ? 'Next!' : info.estimated_wait_minutes}
                  </p>
                  <p className="text-xs text-muted mt-1">
                    {info.people_ahead === 0 ? "you're up soon" : 'min estimated wait'}
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted text-center mt-4">
                ~{info.minutes_per_person} min per person ·{' '}
                {info.confidence === 'learned'
                  ? `based on the last ${info.samples} visits`
                  : info.confidence === 'learning'
                  ? `learning from ${info.samples} visits so far`
                  : "business's own estimate"}
              </p>
            </div>
          )}

          {stepIndex >= 0 && (
            <ol className="flex justify-between text-xs">
              {STEPS.map((s, i) => (
                <li key={s} className="flex-1 flex flex-col items-center gap-1.5">
                  <span className={`size-3 rounded-full ${i <= stepIndex ? 'bg-ink' : 'bg-line'}`} />
                  <span className={`capitalize ${i <= stepIndex ? 'font-semibold' : 'text-muted'}`}>{s}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>

      {error && <p className="text-red-600 text-sm mt-3">{error}</p>}

      {cancellable && (
        <button onClick={cancel} className="btn btn-ghost w-full mt-5 text-red-600">
          Cancel my token
        </button>
      )}
    </Layout>
  )
}