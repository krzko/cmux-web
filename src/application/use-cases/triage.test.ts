import { describe, expect, it } from 'vitest'
import type { Group } from '#/domain/entities/group'
import type { Notification } from '#/domain/entities/notification'
import type { Workspace } from '#/domain/entities/workspace'
import type { WorkspaceReader } from '#/domain/ports/cmux-gateway'
import { getTriageView } from './triage'

function reader(data: {
  groups?: Group[]
  workspaces?: Workspace[]
  notifications?: Notification[]
}): WorkspaceReader {
  return {
    listGroups: async () => data.groups ?? [],
    listWorkspaces: async () => data.workspaces ?? [],
    listNotifications: async () => data.notifications ?? [],
    listSurfaces: async () => [],
    listFeed: async () => [],
  }
}

function ws(ref: string, over: Partial<Workspace> = {}): Workspace {
  return {
    ref,
    id: ref,
    index: 0,
    title: ref,
    cwd: '/x',
    selected: false,
    remoteEnabled: false,
    ...over,
  }
}

describe('getTriageView use case', () => {
  it('composes the snapshots and derives the triage view', async () => {
    const group: Group = {
      id: 'g',
      ref: 'workspace_group:1',
      name: 'Personal',
      collapsed: false,
      pinned: false,
      memberRefs: ['workspace:1', 'workspace:2'],
    }
    const view = await getTriageView(
      reader({
        groups: [group],
        workspaces: [ws('workspace:1'), ws('workspace:2'), ws('workspace:9')],
        notifications: [
          {
            id: 'n',
            title: 'Claude Code',
            subtitle: 'Waiting',
            read: false,
            workspaceRef: 'workspace:2',
            createdAt: '',
          },
        ],
      }),
    )

    expect(view.counts.total).toBe(3)
    expect(view.needsInput.map((w) => w.ref)).toEqual(['workspace:2'])
    expect(view.sections[0].group.name).toBe('Personal')
    expect(view.ungrouped.map((w) => w.ref)).toEqual(['workspace:9'])
    expect(view.counts.unread).toBe(1)
  })
})
