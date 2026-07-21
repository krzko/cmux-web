import type { FeedItem } from '#/domain/entities/feed'
import type { Group } from '#/domain/entities/group'
import type {
  PermissionMode,
  PlanMode,
  TerminalKey,
} from '#/domain/entities/interaction'
import type { Notification } from '#/domain/entities/notification'
import type { Surface } from '#/domain/entities/surface'
import type { TerminalSnapshot } from '#/domain/entities/terminal'
import type { TerminalGrid } from '#/domain/entities/terminal-grid'
import type { Workspace } from '#/domain/entities/workspace'
import type { CmuxGateway, CmuxTarget } from '#/domain/ports/cmux-gateway'
import {
  toFeedItem,
  toGroup,
  toNotification,
  toSurface,
  toTerminalGrid,
  toWorkspace,
} from './mappers'
import type { CmuxTransport } from './transport'
import { CmuxError } from './transport'

type Raw = Record<string, unknown>

// Pull an array out of either a wrapped ({key:[...]}) or bare-array response.
function unwrap(result: unknown, key: string): Raw[] {
  if (Array.isArray(result)) return result as Raw[]
  const value = (result as Raw | null)?.[key]
  return Array.isArray(value) ? (value as Raw[]) : []
}

// Terminal I/O goes through ref-safe wrappers; the target maps to a CLI flag.
function targetFlags(target: CmuxTarget): string[] {
  if (target.surfaceRef) return ['--surface', target.surfaceRef]
  if (target.workspaceRef) return ['--workspace', target.workspaceRef]
  throw new CmuxError('A surface or workspace target is required', 'target')
}

// The concrete CmuxGateway. Method names/params mirror the verified cmux v2
// contract; every call is centralised here so a version change is a one-file fix.
export class CmuxCliGateway implements CmuxGateway {
  constructor(private readonly transport: CmuxTransport) {}

  async listGroups(): Promise<Group[]> {
    const res = await this.transport.rpc('workspace.group.list', {})
    return unwrap(res, 'groups').map(toGroup)
  }

  async listWorkspaces(): Promise<Workspace[]> {
    const res = await this.transport.rpc('workspace.list', {})
    return unwrap(res, 'workspaces').map(toWorkspace)
  }

  async listNotifications(): Promise<Notification[]> {
    const res = await this.transport.rpc('notification.list', {})
    return unwrap(res, 'notifications').map(toNotification)
  }

  async listSurfaces(workspaceRef: string): Promise<Surface[]> {
    // The rpc scopes to the workspace (accepts a ref in workspace_id).
    const res = await this.transport.rpc('surface.list', {
      workspace_id: workspaceRef,
    })
    return unwrap(res, 'surfaces').map(toSurface)
  }

  async listFeed(): Promise<FeedItem[]> {
    const res = await this.transport.rpc('feed.list', {})
    return unwrap(res, 'items').map(toFeedItem)
  }

  async readText(
    input: CmuxTarget & { lines?: number; scrollback?: boolean },
  ): Promise<TerminalSnapshot> {
    const args = ['read-screen', ...targetFlags(input)]
    if (input.scrollback || input.lines) args.push('--scrollback')
    if (input.lines) args.push('--lines', String(input.lines))
    const text = await this.transport.exec(args)
    return {
      surfaceRef: input.surfaceRef ?? input.workspaceRef ?? '',
      workspaceRef: input.workspaceRef,
      text,
      fetchedAt: new Date().toISOString(),
    }
  }

  async readGrid(target: CmuxTarget): Promise<TerminalGrid> {
    // terminal.replay honours a surface UUID or a workspace ref; surface_ref is
    // ignored (falls back to focused), so a specific tab must pass surfaceId.
    const params = target.surfaceId
      ? { surface_id: target.surfaceId }
      : target.workspaceRef
        ? { workspace_id: target.workspaceRef }
        : {}
    const res = await this.transport.rpc<Raw>('terminal.replay', params)
    return toTerminalGrid(res ?? {})
  }

  async sendText(target: CmuxTarget, text: string): Promise<void> {
    await this.transport.exec(['send', ...targetFlags(target), '--', text])
  }

  async sendKey(target: CmuxTarget, key: TerminalKey): Promise<void> {
    await this.transport.exec(['send-key', ...targetFlags(target), '--', key])
  }

  async submitPrompt(workspaceRef: string, text: string): Promise<void> {
    // workspace_id accepts a ref (verified 2026-07-21).
    await this.transport.rpc('workspace.prompt_submit', {
      workspace_id: workspaceRef,
      text,
    })
  }

  async answerQuestion(requestId: string, selections: string[]): Promise<void> {
    await this.transport.rpc('feed.question.reply', {
      request_id: requestId,
      selections,
    })
  }

  async replyPermission(
    requestId: string,
    mode: PermissionMode,
  ): Promise<void> {
    await this.transport.rpc('feed.permission.reply', {
      request_id: requestId,
      mode,
    })
  }

  async replyPlan(requestId: string, mode: PlanMode): Promise<void> {
    await this.transport.rpc('feed.exit_plan.reply', {
      request_id: requestId,
      mode,
    })
  }

  ping(): Promise<boolean> {
    return this.transport.ping()
  }
}
