import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  CornerDownLeft,
} from 'lucide-react'
import type { TerminalKey } from '#/domain/entities/interaction'

const KEYS: { key: TerminalKey; label: React.ReactNode; aria: string }[] = [
  { key: 'enter', label: <CornerDownLeft size={15} />, aria: 'Enter' },
  { key: 'escape', label: 'Esc', aria: 'Escape' },
  { key: 'ctrl+c', label: '⌃C', aria: 'Control C' },
  { key: 'tab', label: 'Tab', aria: 'Tab' },
  { key: 'up', label: <ArrowUp size={15} />, aria: 'Up' },
  { key: 'down', label: <ArrowDown size={15} />, aria: 'Down' },
  { key: 'left', label: <ArrowLeft size={15} />, aria: 'Left' },
  { key: 'right', label: <ArrowRight size={15} />, aria: 'Right' },
]

// Quick keys sent straight to the target surface. Horizontally scrollable
// so the row never wraps on a narrow phone.
export function KeyToolbar({
  onKey,
  disabled,
}: {
  onKey: (key: TerminalKey) => void
  disabled?: boolean
}) {
  return (
    <div
      className="flex gap-1.5 overflow-x-auto pb-1"
      style={{ scrollbarWidth: 'none' }}
    >
      {KEYS.map((k) => (
        <button
          key={k.key}
          type="button"
          className="btn btn-key"
          onClick={() => onKey(k.key)}
          disabled={disabled}
          aria-label={`Send ${k.aria}`}
          style={{ flex: '0 0 auto' }}
        >
          {k.label}
        </button>
      ))}
    </div>
  )
}
