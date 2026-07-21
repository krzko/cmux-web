import { describe, expect, it } from 'vitest'
import type { FeedItem } from '#/domain/entities/feed'
import type { WorkspaceReader } from '#/domain/ports/cmux-gateway'
import { listPending } from './pending'

function feed(over: Partial<FeedItem> & { id: string }): FeedItem {
  return {
    kind: 'question',
    rawKind: 'question',
    source: 'claude',
    status: 'pending',
    resolved: false,
    createdAt: '',
    updatedAt: '',
    options: [],
    multiSelect: false,
    requestId: `req-${over.id}`,
    ...over,
  }
}

function reader(items: FeedItem[]): WorkspaceReader {
  return {
    listGroups: async () => [],
    listWorkspaces: async () => [],
    listNotifications: async () => [],
    listSurfaces: async () => [],
    listFeed: async () => items,
  }
}

describe('listPending use case', () => {
  it('keeps only unresolved interactive items matched to the workspace by cwd', async () => {
    const items = [
      feed({ id: 'match', cwd: '/repo' }),
      feed({ id: 'resolved', cwd: '/repo', resolved: true }),
      feed({
        id: 'activity',
        cwd: '/repo',
        kind: 'activity',
        requestId: undefined,
      }),
      feed({ id: 'other-cwd', cwd: '/elsewhere' }),
    ]
    const pending = await listPending(reader(items), {
      workspaceRef: 'workspace:1',
      cwd: '/repo',
    })
    expect(pending.map((p) => p.id)).toEqual(['match'])
  })

  it('matches by workspace ref when the feed item carries one', async () => {
    const items = [feed({ id: 'wref', workspaceRef: 'workspace:1' })]
    const pending = await listPending(reader(items), {
      workspaceRef: 'workspace:1',
    })
    expect(pending.map((p) => p.id)).toEqual(['wref'])
  })

  it('returns nothing when neither cwd nor workspace ref matches', async () => {
    const items = [feed({ id: 'x', cwd: '/repo' })]
    const pending = await listPending(reader(items), {
      workspaceRef: 'workspace:1',
    })
    expect(pending).toEqual([])
  })
})
