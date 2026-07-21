import type { TriagedWorkspace } from '#/domain/entities/workspace'
import { WorkspaceRow } from './WorkspaceRow'

// Renders workspaces as one connected, rounded group (segmented list): rows
// share dividers with no gaps, and only the outer corners are rounded.
export function WorkspaceList({
  workspaces,
}: {
  workspaces: TriagedWorkspace[]
}) {
  if (workspaces.length === 0) return null
  return (
    <div className="card overflow-hidden" style={{ padding: 0 }}>
      {workspaces.map((workspace, index) => (
        <WorkspaceRow
          key={workspace.ref}
          workspace={workspace}
          divider={index < workspaces.length - 1}
        />
      ))}
    </div>
  )
}
