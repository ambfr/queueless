const STYLES = {
  waiting: 'bg-amber-100 text-amber-800',
  called: 'bg-accent text-white',
  serving: 'bg-sky-100 text-sky-800',
  done: 'bg-emerald-100 text-emerald-800',
  skipped: 'bg-stone-200 text-stone-600',
  cancelled: 'bg-stone-200 text-stone-600',
}

export default function StatusPill({ status }) {
  return <span className={`pill capitalize ${STYLES[status] || STYLES.cancelled}`}>{status}</span>
}