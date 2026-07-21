import { Loader2, Wifi, WifiOff } from 'lucide-react'
import type { StreamStatus } from '#/hooks/use-event-stream'

// Live-connection state for the SSE stream.
export function ConnectionBadge({ status }: { status: StreamStatus }) {
  if (status === 'open') {
    return (
      <span className="chip" style={{ color: 'var(--status-run)' }}>
        <Wifi size={13} /> Live
      </span>
    )
  }
  if (status === 'connecting') {
    return (
      <span className="chip" style={{ color: 'var(--muted)' }}>
        <Loader2 size={13} className="spin" /> Connecting
      </span>
    )
  }
  return (
    <span className="chip" style={{ color: 'var(--danger)' }}>
      <WifiOff size={13} /> Offline
    </span>
  )
}
