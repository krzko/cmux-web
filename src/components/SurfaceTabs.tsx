import { FileText, Globe, type LucideIcon, SquareTerminal } from 'lucide-react'
import type { PaneGroup, Surface } from '#/domain/entities/surface'
import { cleanTitle } from '#/lib/format'

function kindIcon(kind: string): LucideIcon {
  if (kind.includes('browser')) return Globe
  if (kind.includes('file') || kind.includes('preview')) return FileText
  return SquareTerminal
}

// Pane/tab switcher. Each pane (split) is a bordered group; its surfaces are
// tabs. Tapping a tab switches which surface's terminal is shown. Rendered only
// when a workspace has more than one surface.
export function SurfaceTabs({
  panes,
  activeId,
  onSelect,
}: {
  panes: PaneGroup[]
  activeId?: string
  onSelect: (surface: Surface) => void
}) {
  return (
    <div
      className="flex gap-2 overflow-x-auto pb-1"
      style={{ scrollbarWidth: 'none' }}
    >
      {panes.map((pane) => (
        <div
          key={pane.paneRef}
          className="flex flex-none items-center gap-1 rounded-xl p-1"
          style={{
            border: '1px solid var(--border)',
            background: 'var(--surface-2)',
          }}
        >
          {pane.surfaces.map((surface) => {
            const Icon = kindIcon(surface.kind)
            const active = surface.id === activeId
            return (
              <button
                key={surface.id}
                type="button"
                onClick={() => onSelect(surface)}
                aria-pressed={active}
                title={cleanTitle(surface.title ?? surface.ref)}
                className="flex items-center gap-1.5 rounded-lg px-2.5"
                style={{
                  minHeight: 34,
                  maxWidth: 190,
                  border: active
                    ? '1px solid var(--accent)'
                    : '1px solid transparent',
                  background: active ? 'var(--accent-weak)' : 'transparent',
                  color: active ? 'var(--accent)' : 'var(--muted)',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <Icon size={13} style={{ flex: '0 0 auto' }} />
                <span className="truncate">
                  {cleanTitle(surface.title ?? surface.ref)}
                </span>
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}
