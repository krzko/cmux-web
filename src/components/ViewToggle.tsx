import { MessageSquare, SquareTerminal } from 'lucide-react'

export type ViewMode = 'chat' | 'terminal'

// Segmented control that swaps the workspace body between the chat and terminal
// renderings of the same captured transcript.
export function ViewToggle({
  mode,
  onChange,
}: {
  mode: ViewMode
  onChange: (mode: ViewMode) => void
}) {
  return (
    <div
      className="flex items-center gap-0.5 rounded-lg p-0.5"
      style={{
        background: 'var(--surface-2)',
        border: '1px solid var(--border)',
      }}
      role="tablist"
      aria-label="View mode"
    >
      <Segment
        active={mode === 'chat'}
        onClick={() => onChange('chat')}
        label="Chat"
      >
        <MessageSquare size={14} />
      </Segment>
      <Segment
        active={mode === 'terminal'}
        onClick={() => onChange('terminal')}
        label="Terminal"
      >
        <SquareTerminal size={14} />
      </Segment>
    </div>
  )
}

function Segment({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean
  onClick: () => void
  label: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      role="tab"
      aria-selected={active}
      className="flex items-center gap-1.5 rounded-md px-2.5"
      style={{
        minHeight: 30,
        border: active ? '1px solid var(--accent)' : '1px solid transparent',
        background: active ? 'var(--accent-weak)' : 'transparent',
        color: active ? 'var(--accent)' : 'var(--muted)',
        fontSize: '0.78rem',
        fontWeight: 600,
        cursor: 'pointer',
      }}
    >
      {children}
      <span>{label}</span>
    </button>
  )
}
