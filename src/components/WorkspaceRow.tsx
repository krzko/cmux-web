import { Link } from '@tanstack/react-router'
import { ChevronRight, Folder } from 'lucide-react'
import type { TriagedWorkspace } from '#/domain/entities/workspace'
import { cleanTitle, relativeTime, shortCwd } from '#/lib/format'
import { Redactable } from './Redactable'
import { StatusIndicator } from './StatusIndicator'

// One workspace in the list. The whole row is the tap target. Colour bar
// mirrors the cmux sidebar; status uses icon + colour, unread shows a badge.
// Rows render inside WorkspaceList as a connected group, so the row itself has
// no card chrome, only an optional divider to the next row.
export function WorkspaceRow({
  workspace,
  divider = false,
}: {
  workspace: TriagedWorkspace
  divider?: boolean
}) {
  const cwd = shortCwd(workspace.cwd)
  const age = relativeTime(workspace.lastSubmittedAt)

  return (
    <Link
      to="/w/$ref"
      params={{ ref: workspace.ref }}
      className="flex items-stretch gap-0 transition-colors hover:bg-[var(--surface-2)] active:opacity-90"
      style={{
        textDecoration: 'none',
        color: 'inherit',
        borderBottom: divider ? '1px solid var(--border)' : undefined,
      }}
    >
      <span
        aria-hidden
        style={{
          width: 4,
          background: workspace.color ?? 'var(--border-strong)',
          flex: '0 0 auto',
        }}
      />
      <span className="flex min-w-0 flex-1 items-center gap-3 p-3">
        <StatusIndicator status={workspace.status} />
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="flex items-center gap-2">
            <span className="min-w-0 flex-1 truncate font-semibold">
              {cleanTitle(workspace.title)}
            </span>
            {workspace.unread > 0 && (
              <span
                className="chip"
                style={{
                  color: 'var(--accent-ink)',
                  background: 'var(--accent)',
                  borderColor: 'var(--accent)',
                  minWidth: 22,
                  justifyContent: 'center',
                }}
              >
                {workspace.unread}
              </span>
            )}
          </span>
          {workspace.preview && (
            <Redactable className="truncate text-sm">
              <span
                style={{ color: 'var(--muted)' }}
                className="block truncate"
              >
                {workspace.preview}
              </span>
            </Redactable>
          )}
          <span className="flex flex-wrap items-center gap-1.5">
            {cwd && (
              <span className="chip mono">
                <Folder size={11} /> {cwd}
              </span>
            )}
            {age && <span className="chip">{age} ago</span>}
          </span>
        </span>
        <ChevronRight
          size={18}
          style={{ color: 'var(--faint)', flex: '0 0 auto' }}
        />
      </span>
    </Link>
  )
}
