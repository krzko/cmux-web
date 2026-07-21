import type { WorkspaceReader } from '#/domain/ports/cmux-gateway'
import { buildTriageView, type TriageView } from '#/domain/services/triage'

// Compose the three snapshots the list view needs, then derive the model.
// Reads run in parallel to keep the list view fast.
export async function getTriageView(
  reader: WorkspaceReader,
): Promise<TriageView> {
  const [groups, workspaces, notifications] = await Promise.all([
    reader.listGroups(),
    reader.listWorkspaces(),
    reader.listNotifications(),
  ])
  return buildTriageView(groups, workspaces, notifications)
}
