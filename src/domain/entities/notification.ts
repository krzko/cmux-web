// Notification. Primary source for status + unread.
// subtitle === "Waiting" for a workspace implies needs_input.
export interface Notification {
  id: string
  title: string
  subtitle?: string
  body?: string
  read: boolean
  workspaceRef?: string
  surfaceRef?: string
  tabTitle?: string
  createdAt: string
}

export const WAITING_SUBTITLE = 'Waiting'
