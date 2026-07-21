import { Search, X } from 'lucide-react'

// Filter across all workspaces.
export function SearchBar({
  value,
  onChange,
}: {
  value: string
  onChange: (next: string) => void
}) {
  return (
    <div className="relative">
      <Search
        size={16}
        style={{
          color: 'var(--faint)',
          position: 'absolute',
          left: 12,
          top: 14,
        }}
      />
      <input
        className="input"
        style={{ paddingLeft: 36, paddingRight: 36 }}
        placeholder="Search workspaces"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="off"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        aria-label="Search workspaces"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Clear search"
          style={{
            position: 'absolute',
            right: 8,
            top: 8,
            background: 'transparent',
            border: 0,
            color: 'var(--faint)',
            cursor: 'pointer',
          }}
        >
          <X size={18} />
        </button>
      )}
    </div>
  )
}
