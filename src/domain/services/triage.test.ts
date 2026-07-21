import { describe, expect, it } from 'vitest'
import type { Group } from '../entities/group'
import type { Notification } from '../entities/notification'
import type { Workspace } from '../entities/workspace'
import { deriveStatus, deriveUnread } from './status'
import { buildTriageView } from './triage'

function ws(over: Partial<Workspace> & { ref: string }): Workspace {
  return {
    id: over.ref,
    index: 0,
    title: 'Untitled',
    cwd: '/x',
    selected: false,
    remoteEnabled: false,
    ...over,
  }
}

function note(
  over: Partial<Notification> & { workspaceRef: string },
): Notification {
  return { id: 'n', title: 'Claude Code', read: true, createdAt: '', ...over }
}

describe('deriveStatus', () => {
  it('is needs_input when a Waiting notification targets the workspace', () => {
    const w = ws({ ref: 'workspace:1' })
    const n = note({ workspaceRef: 'workspace:1', subtitle: 'Waiting' })
    expect(deriveStatus(w, [n])).toBe('needs_input')
  })

  it('is running when the title carries an activity glyph', () => {
    expect(
      deriveStatus(ws({ ref: 'workspace:2', title: '✳ working' }), []),
    ).toBe('running')
  })

  it('is idle otherwise', () => {
    expect(deriveStatus(ws({ ref: 'workspace:3', title: 'quiet' }), [])).toBe(
      'idle',
    )
  })
})

describe('deriveUnread', () => {
  it('counts only unread notifications for the workspace', () => {
    const w = ws({ ref: 'workspace:1' })
    const notes = [
      note({ workspaceRef: 'workspace:1', read: false }),
      note({ workspaceRef: 'workspace:1', read: true }),
      note({ workspaceRef: 'workspace:2', read: false }),
    ]
    expect(deriveUnread(w, notes)).toBe(1)
  })
})

describe('buildTriageView', () => {
  const group: Group = {
    id: 'g',
    ref: 'workspace_group:1',
    name: 'Personal',
    collapsed: false,
    pinned: false,
    memberRefs: ['workspace:1', 'workspace:2'],
  }
  const members = [ws({ ref: 'workspace:1' }), ws({ ref: 'workspace:2' })]
  const orphan = ws({ ref: 'workspace:9' })
  const waiting = note({ workspaceRef: 'workspace:2', subtitle: 'Waiting' })

  it('floats needs_input across groups and preserves group membership', () => {
    const view = buildTriageView([group], [...members, orphan], [waiting])
    expect(view.needsInput.map((w) => w.ref)).toEqual(['workspace:2'])
    expect(view.sections[0].workspaces).toHaveLength(2)
    expect(view.ungrouped.map((w) => w.ref)).toEqual(['workspace:9'])
    expect(view.counts.total).toBe(3)
    expect(view.counts.needsInput).toBe(1)
  })
})
