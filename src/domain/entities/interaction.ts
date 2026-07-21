// Value objects for writes. Enums mirror the cmux RPC contract discovered on
// this machine (empty-param probe, 2026-07-21) and are the single source of
// truth the UI and gateway share.

// surface.send_key accepts these named keys (cmux send-key).
export const TERMINAL_KEYS = [
  'enter',
  'escape',
  'tab',
  'backspace',
  'delete',
  'up',
  'down',
  'left',
  'right',
  'ctrl+c',
] as const
export type TerminalKey = (typeof TERMINAL_KEYS)[number]

// feed.permission.reply: mode enum.
export const PERMISSION_MODES = [
  'once',
  'always',
  'all',
  'bypass',
  'deny',
] as const
export type PermissionMode = (typeof PERMISSION_MODES)[number]

// feed.exit_plan.reply: mode enum.
export const PLAN_MODES = [
  'ultraplan',
  'bypassPermissions',
  'autoAccept',
  'manual',
  'deny',
] as const
export type PlanMode = (typeof PLAN_MODES)[number]

// UI-level decisions mapped to concrete modes by the use case, keeping the
// enum contract in one place (OCP: add a mode without touching components).
export type PermissionDecision = 'approve' | 'deny'
export type PlanDecision = 'accept' | 'reject'

export function permissionModeFor(
  decision: PermissionDecision,
): PermissionMode {
  return decision === 'approve' ? 'once' : 'deny'
}

export function planModeFor(decision: PlanDecision): PlanMode {
  return decision === 'accept' ? 'autoAccept' : 'deny'
}
