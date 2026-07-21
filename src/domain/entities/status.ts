// Triage status. Order encodes triage priority.
export type WorkspaceStatus = 'needs_input' | 'running' | 'idle'

export const STATUS_RANK: Record<WorkspaceStatus, number> = {
  needs_input: 0,
  running: 1,
  idle: 2,
}
