import { ChevronDown } from 'lucide-react'

// Floating control that snaps a follow-tail scroll region back to the latest.
export function JumpToBottom({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Scroll to latest"
      style={{
        position: 'absolute',
        right: 12,
        bottom: 12,
        width: 40,
        height: 40,
        borderRadius: 999,
        border: '1px solid var(--accent)',
        background: 'var(--accent)',
        color: 'var(--accent-ink)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: 'var(--shadow)',
        cursor: 'pointer',
      }}
    >
      <ChevronDown size={20} />
    </button>
  )
}
