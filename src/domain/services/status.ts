import type { Notification } from '../entities/notification'
import { WAITING_SUBTITLE } from '../entities/notification'
import type { WorkspaceStatus } from '../entities/status'
import type { Workspace } from '../entities/workspace'

// Activity glyphs cmux embeds in the title while an agent is working: braille
// spinner frames (U+2800..U+28FF) and asterisk-style markers. Presence implies
// running. Kept conservative to avoid false positives.
const ACTIVITY_MARKERS = /[⠀-⣿✳✻✽✶✹·]/

function isRunningTitle(title: string): boolean {
  // Only the leading glyph region matters; the branch bar uses U+00B7 later.
  return ACTIVITY_MARKERS.test(title.trimStart().slice(0, 2))
}

// Notifications belonging to a workspace, matched by ref then id.
function notificationsFor(
  workspace: Workspace,
  notifications: Notification[],
): Notification[] {
  return notifications.filter(
    (n) => n.workspaceRef === workspace.ref || n.workspaceRef === workspace.id,
  )
}

// Status derivation. needs_input wins over running wins over idle.
export function deriveStatus(
  workspace: Workspace,
  notifications: Notification[],
): WorkspaceStatus {
  const own = notificationsFor(workspace, notifications)
  if (own.some((n) => n.subtitle === WAITING_SUBTITLE)) {
    return 'needs_input'
  }
  if (isRunningTitle(workspace.title)) {
    return 'running'
  }
  return 'idle'
}

// Unread badge count: unread notifications for the workspace.
export function deriveUnread(
  workspace: Workspace,
  notifications: Notification[],
): number {
  return notificationsFor(workspace, notifications).filter((n) => !n.read)
    .length
}
