import type { FeedItem } from '../entities/feed'
import type { Group } from '../entities/group'
import type {
  PermissionMode,
  PlanMode,
  TerminalKey,
} from '../entities/interaction'
import type { Notification } from '../entities/notification'
import type { Surface } from '../entities/surface'
import type { TerminalSnapshot } from '../entities/terminal'
import type { TerminalGrid } from '../entities/terminal-grid'
import type { Workspace } from '../entities/workspace'

// Ports are segregated by capability (ISP) so a caller depends only on what it
// uses and fakes are trivial to write for tests. One adapter implements all.

export interface WorkspaceReader {
  listGroups(): Promise<Group[]>
  listWorkspaces(): Promise<Workspace[]>
  listNotifications(): Promise<Notification[]>
  listSurfaces(workspaceRef: string): Promise<Surface[]>
  listFeed(): Promise<FeedItem[]>
}

// An explicit target for terminal I/O. One of the two must be set; never rely
// on the focused-surface default (it leaks input across workspaces, verified
// 2026-07-21). Refs are resolved safely by the cmux CLI wrappers.
export interface CmuxTarget {
  surfaceRef?: string
  surfaceId?: string // UUID, required to target a surface via raw rpc (replay)
  workspaceRef?: string
}

export interface TerminalReader {
  readText(
    input: CmuxTarget & { lines?: number; scrollback?: boolean },
  ): Promise<TerminalSnapshot>
  // Styled grid (true colours) via terminal.replay, for the terminal view.
  readGrid(target: CmuxTarget): Promise<TerminalGrid>
}

export interface InteractionWriter {
  sendText(target: CmuxTarget, text: string): Promise<void>
  sendKey(target: CmuxTarget, key: TerminalKey): Promise<void>
  submitPrompt(workspaceRef: string, text: string): Promise<void>
}

export interface FeedResponder {
  answerQuestion(requestId: string, selections: string[]): Promise<void>
  replyPermission(requestId: string, mode: PermissionMode): Promise<void>
  replyPlan(requestId: string, mode: PlanMode): Promise<void>
}

export interface HealthChecker {
  ping(): Promise<boolean>
}

// Composite the composition root wires to the concrete adapter.
export interface CmuxGateway
  extends WorkspaceReader,
    TerminalReader,
    InteractionWriter,
    FeedResponder,
    HealthChecker {}
