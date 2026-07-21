import { describe, expect, it } from 'vitest'
import type { Surface } from '../entities/surface'
import { defaultSurface, groupSurfacesByPane } from './layout'

function surface(over: Partial<Surface> & { ref: string }): Surface {
  return {
    id: over.ref,
    kind: 'terminal',
    focused: false,
    selectedInPane: false,
    index: 0,
    indexInPane: 0,
    ...over,
  }
}

describe('groupSurfacesByPane', () => {
  it('groups by pane in first-surface order, tabs by index within a pane', () => {
    const surfaces = [
      surface({ ref: 's3', paneRef: 'pane:2', index: 2, indexInPane: 0 }),
      surface({ ref: 's1', paneRef: 'pane:1', index: 0, indexInPane: 0 }),
      surface({ ref: 's2', paneRef: 'pane:1', index: 1, indexInPane: 1 }),
    ]
    const panes = groupSurfacesByPane(surfaces)
    expect(panes.map((p) => p.paneRef)).toEqual(['pane:1', 'pane:2'])
    expect(panes[0].surfaces.map((s) => s.ref)).toEqual(['s1', 's2'])
    expect(panes[1].surfaces.map((s) => s.ref)).toEqual(['s3'])
  })

  it('falls back to surface ref when a pane ref is missing', () => {
    const panes = groupSurfacesByPane([surface({ ref: 's1' })])
    expect(panes[0].paneRef).toBe('s1')
  })
})

describe('defaultSurface', () => {
  it('prefers the focused surface, else the first', () => {
    const a = surface({ ref: 'a' })
    const b = surface({ ref: 'b', focused: true })
    expect(defaultSurface([a, b])?.ref).toBe('b')
    expect(defaultSurface([a])?.ref).toBe('a')
    expect(defaultSurface([])).toBeUndefined()
  })
})
