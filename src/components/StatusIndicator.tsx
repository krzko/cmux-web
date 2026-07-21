import { Bell, Circle, Loader2 } from 'lucide-react'
import type { WorkspaceStatus } from '#/domain/entities/status'

// Status is conveyed by colour AND icon AND label (accessibility).
const CONFIG: Record<
  WorkspaceStatus,
  { label: string; color: string; weak: string }
> = {
  needs_input: {
    label: 'Needs input',
    color: 'var(--status-needs)',
    weak: 'var(--status-needs-weak)',
  },
  running: {
    label: 'Running',
    color: 'var(--status-run)',
    weak: 'var(--status-run-weak)',
  },
  idle: {
    label: 'Idle',
    color: 'var(--status-idle)',
    weak: 'var(--status-idle-weak)',
  },
}

function Glyph({ status, size }: { status: WorkspaceStatus; size: number }) {
  if (status === 'needs_input') return <Bell size={size} />
  if (status === 'running') return <Loader2 size={size} className="spin" />
  return <Circle size={size} />
}

export function StatusIndicator({
  status,
  withLabel = false,
}: {
  status: WorkspaceStatus
  withLabel?: boolean
}) {
  const config = CONFIG[status]
  if (!withLabel) {
    return (
      <span
        role="img"
        aria-label={config.label}
        title={config.label}
        style={{ color: config.color }}
        className="inline-flex items-center"
      >
        <Glyph status={status} size={16} />
      </span>
    )
  }
  return (
    <span
      className="chip"
      style={{
        color: config.color,
        background: config.weak,
        borderColor: config.color,
      }}
    >
      <Glyph status={status} size={13} />
      {config.label}
    </span>
  )
}
