import type { WorkspaceStatus } from './status'

// A workspace (agent session). Maps from workspace.list.
// status/unread are derived later from notifications, not raw fields.
export interface Workspace {
  ref: string
  id: string
  index: number
  title: string
  color?: string
  cwd: string
  preview?: string
  lastSubmittedAt?: string
  selected: boolean
  remoteEnabled: boolean
  remoteState?: string
}

// Workspace enriched with derived triage fields and its group.
export interface TriagedWorkspace extends Workspace {
  status: WorkspaceStatus
  unread: number
  groupRef?: string
}
