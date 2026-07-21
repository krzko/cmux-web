import { ChevronDown, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import type { GroupSection as GroupSectionModel } from '#/domain/services/triage'
import { WorkspaceList } from './WorkspaceList'

// A collapsible group of workspaces. Initial collapsed state comes from
// cmux; the operator can toggle locally.
export function GroupSection({ section }: { section: GroupSectionModel }) {
  const [collapsed, setCollapsed] = useState(section.group.collapsed)
  const needs = section.workspaces.filter(
    (w) => w.status === 'needs_input',
  ).length

  if (section.workspaces.length === 0) return null

  return (
    <section className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="flex items-center gap-2 px-1 py-1 text-left"
        style={{
          background: 'transparent',
          border: 0,
          cursor: 'pointer',
          color: 'var(--muted)',
        }}
        aria-expanded={!collapsed}
      >
        {collapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
        <span
          className="text-sm font-bold uppercase tracking-wide"
          style={{ letterSpacing: '0.05em' }}
        >
          {section.group.name}
        </span>
        <span className="chip">{section.workspaces.length}</span>
        {needs > 0 && (
          <span
            className="chip"
            style={{
              color: 'var(--status-needs)',
              borderColor: 'var(--status-needs)',
            }}
          >
            {needs} need input
          </span>
        )}
      </button>
      {!collapsed && <WorkspaceList workspaces={section.workspaces} />}
    </section>
  )
}
