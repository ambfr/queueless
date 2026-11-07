import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'

export default function QRCard({ businessId, name }) {
  const [copied, setCopied] = useState(false)
  const url = `${window.location.origin}/q/${businessId}`

  async function copy() {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <section className="mt-10">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs uppercase tracking-widest text-muted font-semibold">Business QR code</h2>
        <div className="flex gap-2">
          <button onClick={copy} className="btn btn-ghost btn-sm">{copied ? 'Copied!' : 'Copy link'}</button>
          <button onClick={() => window.print()} className="btn btn-ghost btn-sm">Print poster</button>
        </div>
      </div>

      <div className="print-area card p-8 text-center">
        <p className="text-xs uppercase tracking-widest text-muted font-semibold">Skip the line</p>
        <p className="font-display font-extrabold text-3xl mt-2">{name}</p>
        <p className="text-muted">Scan, pick a service, get your token</p>

        <div className="inline-block bg-white p-4 rounded-2xl border border-line mt-6">
          <QRCodeSVG value={url} size={220} level="M" />
        </div>

        <p className="mt-4 font-semibold">Scan to join a queue</p>
        <p className="text-xs text-muted mt-1 break-all">{url}</p>
      </div>
    </section>
  )
}