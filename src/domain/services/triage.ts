import type { Group } from '../entities/group'
import type { Notification } from '../entities/notification'
import { STATUS_RANK } from '../entities/status'
import type { TriagedWorkspace, Workspace } from '../entities/workspace'
import { deriveStatus, deriveUnread } from './status'

export interface GroupSection {
  group: Group
  workspaces: TriagedWorkspace[]
}

// The list-view model. Grouped sections preserve cmux order; the
// needsInput section floats blocked agents to the top across all groups.
export interface TriageView {
  needsInput: TriagedWorkspace[]
  sections: GroupSection[]
  ungrouped: TriagedWorkspace[]
  counts: {
    total: number
    needsInput: number
    running: number
    idle: number
    unread: number
  }
}

function enrich(
  workspace: Workspace,
  notifications: Notification[],
  groupRef?: string,
): TriagedWorkspace {
  return {
    ...workspace,
    status: deriveStatus(workspace, notifications),
    unread: deriveUnread(workspace, notifications),
    groupRef,
  }
}

// Most recent activity first; stable for equal timestamps.
function byRecency(a: TriagedWorkspace, b: TriagedWorkspace): number {
  return (b.lastSubmittedAt ?? '').localeCompare(a.lastSubmittedAt ?? '')
}

export function buildTriageView(
  groups: Group[],
  workspaces: Workspace[],
  notifications: Notification[],
): TriageView {
  const byRef = new Map(workspaces.map((w) => [w.ref, w]))
  const grouped = new Set<string>()

  const sections: GroupSection[] = groups.map((group) => {
    const members = group.memberRefs
      .map((ref) => byRef.get(ref))
      .filter((w): w is Workspace => Boolean(w))
      .map((w) => {
        grouped.add(w.ref)
        return enrich(w, notifications, group.ref)
      })
    return { group, workspaces: members }
  })

  const ungrouped = workspaces
    .filter((w) => !grouped.has(w.ref))
    .map((w) => enrich(w, notifications))

  const all = [...sections.flatMap((s) => s.workspaces), ...ungrouped]
  const needsInput = all
    .filter((w) => w.status === 'needs_input')
    .sort(byRecency)

  return {
    needsInput,
    sections,
    ungrouped,
    counts: {
      total: all.length,
      needsInput: needsInput.length,
      running: all.filter((w) => w.status === 'running').length,
      idle: all.filter((w) => w.status === 'idle').length,
      unread: all.reduce((sum, w) => sum + w.unread, 0),
    },
  }
}

// Search across title, preview and cwd. Pure for testability.
export function matchesQuery(w: TriagedWorkspace, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return [w.title, w.preview, w.cwd]
    .filter(Boolean)
    .some((field) => field!.toLowerCase().includes(q))
}

// Priority ordering used for a flat view: status then recency.
export function byTriagePriority(
  a: TriagedWorkspace,
  b: TriagedWorkspace,
): number {
  const rank = STATUS_RANK[a.status] - STATUS_RANK[b.status]
  return rank !== 0 ? rank : byRecency(a, b)
}
