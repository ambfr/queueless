import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../lib/api'
import { useLive } from '../lib/useLive'
import Layout from '../components/Layout'

const MESSAGES = {
  waiting: 'You are in the queue.',
  called: "It's your turn! Please go to the counter.",
  serving: 'You are being served.',
  done: 'All done. Thanks for visiting!',
  skipped: 'You were skipped. Join the queue again if you still need service.',
  cancelled: 'This token was cancelled.',
}

export default function TicketPage() {
  const { id } = useParams()
  const [info, setInfo] = useState(null)
  const [error, setError] = useState('')

  const load = () =>
    api(`/tokens/${id}`).then(setInfo).catch((e) => setError(e.message))

  useEffect(() => { load() }, [id])

  // your own token changes, and anyone ahead of you moving
  useLive('tokens', `id=eq.${id}`, load)
  useLive('queue_state', info ? `service_id=eq.${info.service_id}` : null, load)

  async function cancel() {
    try {
      await api(`/tokens/${id}/cancel`, { method: 'POST' })
      load()
    } catch (e) {
      setError(e.message)
    }
  }

  if (!info) {
    return <Layout><p className="text-slate-400">{error || 'Loading...'}</p></Layout>
  }

  const active = ['waiting', 'called'].includes(info.status)
  const highlight = info.status === 'called' ? 'border-green-500 bg-green-500/10' : 'border-slate-700 bg-slate-800'

  return (
    <Layout>
      <Link to="/" className="text-sm text-slate-400 hover:text-white">← Home</Link>

      <div className={`mt-4 rounded-2xl border p-8 text-center ${highlight}`}>
        <p className="text-slate-400 text-sm">Your token</p>
        <p className="text-7xl font-bold my-2">#{info.token_number}</p>
        <p className="capitalize text-indigo-300 font-semibold">{info.status}</p>
        <p className="text-slate-300 mt-3">{MESSAGES[info.status]}</p>

        {info.status === 'waiting' && (
          <div className="mt-6 grid grid-cols-2 gap-4">
            <div className="rounded-xl bg-slate-900/60 p-4">
              <p className="text-3xl font-bold">{info.people_ahead}</p>
              <p className="text-xs text-slate-400">people ahead</p>
            </div>
            <div className="rounded-xl bg-slate-900/60 p-4">
              <p className="text-3xl font-bold">{info.estimated_wait_minutes}</p>
              <p className="text-xs text-slate-400">min est. wait</p>
            </div>
          </div>
        )}
      </div>

      {error && <p className="text-red-400 text-sm mt-3">{error}</p>}

      {active && (
        <button onClick={cancel} className="mt-6 w-full text-sm text-red-400 hover:text-red-300">
          Cancel my token
        </button>
      )}
    </Layout>
  )
}