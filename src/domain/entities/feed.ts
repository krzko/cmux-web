// Feed item: agent activity + interactive prompts. Shapes verified
// live 2026-07-21: a question item carries kind:"question", request_id,
// question_prompt, and question_options[{id,label,description}]; it is pending
// only while resolved_at is null (status flips to "expired"/resolved otherwise).
export type FeedKind = 'question' | 'permission' | 'exit_plan' | 'activity'

export interface FeedOption {
  value: string // option id sent back as the selection
  label: string
  description?: string
}

export interface FeedItem {
  id: string
  kind: FeedKind
  rawKind: string
  source: string
  status: string
  resolved: boolean
  title?: string
  toolName?: string
  toolInput?: string
  workspaceRef?: string
  cwd?: string
  createdAt: string
  updatedAt: string
  // Present only on interactive items (question/permission/exit_plan).
  requestId?: string
  prompt?: string
  options: FeedOption[]
  multiSelect: boolean
}

// Interactive and still awaiting a reply.
export function isInteractive(item: FeedItem): boolean {
  return item.kind !== 'activity' && Boolean(item.requestId) && !item.resolved
}
