import { type FeedItem, isInteractive } from '#/domain/entities/feed'
import type { WorkspaceReader } from '#/domain/ports/cmux-gateway'

// Interactive feed items (question/permission/plan) awaiting a reply for a
// workspace. Feed items carry cwd, not a workspace ref, so the cwd is the join
// key; without it we return nothing rather than bleed prompts across workspaces.
export async function listPending(
  reader: WorkspaceReader,
  target: { workspaceRef: string; cwd?: string },
): Promise<FeedItem[]> {
  const items = await reader.listFeed()
  return items.filter((item) => {
    if (!isInteractive(item)) return false
    if (item.workspaceRef) return item.workspaceRef === target.workspaceRef
    return Boolean(target.cwd) && item.cwd === target.cwd
  })
}
