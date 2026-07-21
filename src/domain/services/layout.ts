import type { PaneGroup, Surface } from '../entities/surface'

// Group a workspace's surfaces into panes (splits), preserving cmux order:
// panes by first surface index, tabs by index within the pane.
export function groupSurfacesByPane(surfaces: Surface[]): PaneGroup[] {
  const order: string[] = []
  const byPane = new Map<string, Surface[]>()
  for (const surface of [...surfaces].sort((a, b) => a.index - b.index)) {
    const key = surface.paneRef ?? surface.ref
    if (!byPane.has(key)) {
      byPane.set(key, [])
      order.push(key)
    }
    byPane.get(key)!.push(surface)
  }
  return order.map((paneRef) => ({
    paneRef,
    surfaces: byPane
      .get(paneRef)!
      .sort((a, b) => a.indexInPane - b.indexInPane),
  }))
}

// The surface to show by default: the focused one, else the first.
export function defaultSurface(surfaces: Surface[]): Surface | undefined {
  return surfaces.find((s) => s.focused) ?? surfaces[0]
}
