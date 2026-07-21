import type { FeedItem, FeedKind, FeedOption } from '#/domain/entities/feed'
import type { Group } from '#/domain/entities/group'
import type { Notification } from '#/domain/entities/notification'
import type { Surface } from '#/domain/entities/surface'
import type {
  TerminalGrid,
  TerminalLine,
  TerminalStyle,
} from '#/domain/entities/terminal-grid'
import type { Workspace } from '#/domain/entities/workspace'

// Raw payloads use snake_case and vary across cmux versions, so access is
// defensive: read the first present key, coerce, never assume presence.
type Raw = Record<string, unknown>

function str(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined
}
function num(v: unknown): number {
  return typeof v === 'number' ? v : 0
}
function pick(o: Raw, ...keys: string[]): unknown {
  for (const k of keys) if (o[k] !== undefined && o[k] !== null) return o[k]
  return undefined
}
function strOf(o: Raw, ...keys: string[]): string | undefined {
  return str(pick(o, ...keys))
}
function boolOf(o: Raw, ...keys: string[]): boolean {
  return pick(o, ...keys) === true
}
function strArray(v: unknown): string[] {
  return Array.isArray(v)
    ? v.filter((x): x is string => typeof x === 'string')
    : []
}

export function toGroup(o: Raw): Group {
  return {
    id: strOf(o, 'id') ?? strOf(o, 'ref') ?? '',
    ref: strOf(o, 'ref') ?? '',
    name: strOf(o, 'name') ?? 'Group',
    color: strOf(o, 'custom_color'),
    icon: strOf(o, 'icon_symbol'),
    collapsed: boolOf(o, 'is_collapsed'),
    pinned: boolOf(o, 'is_pinned'),
    memberRefs: strArray(pick(o, 'member_workspace_refs')),
    anchorRef: strOf(o, 'anchor_workspace_ref'),
  }
}

export function toWorkspace(o: Raw): Workspace {
  const remote = (pick(o, 'remote') as Raw) ?? {}
  return {
    ref: strOf(o, 'ref') ?? '',
    id: strOf(o, 'id') ?? '',
    index: typeof o.index === 'number' ? o.index : 0,
    // Keep the raw title: it carries the activity glyph status derivation needs.
    title: strOf(o, 'title') ?? strOf(o, 'custom_title') ?? 'Untitled',
    color: strOf(o, 'custom_color'),
    cwd: strOf(o, 'current_directory') ?? '',
    preview: strOf(
      o,
      'latest_conversation_message',
      'latest_submitted_message',
    ),
    lastSubmittedAt: strOf(o, 'latest_submitted_at'),
    selected: boolOf(o, 'selected'),
    remoteEnabled: boolOf(remote, 'enabled'),
    remoteState: strOf(remote, 'state'),
  }
}

export function toNotification(o: Raw): Notification {
  return {
    id: strOf(o, 'id') ?? '',
    title: strOf(o, 'title') ?? '',
    subtitle: strOf(o, 'subtitle'),
    body: strOf(o, 'body'),
    read: boolOf(o, 'is_read'),
    workspaceRef: strOf(o, 'workspace_ref'),
    surfaceRef: strOf(o, 'surface_ref'),
    tabTitle: strOf(o, 'tab_title'),
    createdAt: strOf(o, 'created_at') ?? '',
  }
}

export function toSurface(o: Raw): Surface {
  const binding = (pick(o, 'resume_binding') as Raw) ?? {}
  return {
    ref: strOf(o, 'ref') ?? '',
    id: strOf(o, 'id') ?? '',
    paneRef: strOf(o, 'pane_ref'),
    kind: strOf(o, 'type', 'kind', 'surface_type') ?? 'terminal',
    title: strOf(o, 'title', 'tab_title') ?? strOf(binding, 'name'),
    focused: boolOf(o, 'focused'),
    selectedInPane: boolOf(o, 'selected_in_pane'),
    index: num(pick(o, 'index')),
    indexInPane: num(pick(o, 'index_in_pane')),
    agentKind: strOf(binding, 'kind'),
    agentName: strOf(binding, 'name'),
  }
}

function toFeedKind(rawKind: string): FeedKind {
  const k = rawKind.toLowerCase()
  if (k.includes('question')) return 'question'
  if (k.includes('permission')) return 'permission'
  if (k.includes('plan')) return 'exit_plan'
  return 'activity'
}

// Options come as [{id,label,description}] (question_options) or a plain string
// array on other prompt kinds. The option id is the selection token sent back.
function toOptions(v: unknown): FeedOption[] {
  if (!Array.isArray(v)) return []
  return v.map((raw, index) => {
    if (typeof raw === 'string') return { value: raw, label: raw }
    const o = raw as Raw
    const label = strOf(o, 'label', 'title') ?? `Option ${index + 1}`
    return {
      value: strOf(o, 'id', 'value') ?? label,
      label,
      description: strOf(o, 'description'),
    }
  })
}

export function toFeedItem(o: Raw): FeedItem {
  const rawKind = strOf(o, 'kind') ?? 'activity'
  return {
    id: strOf(o, 'id') ?? '',
    rawKind,
    kind: toFeedKind(rawKind),
    source: strOf(o, 'source') ?? '',
    status: strOf(o, 'status') ?? '',
    resolved: pick(o, 'resolved_at') != null,
    title: strOf(o, 'title'),
    toolName: strOf(o, 'tool_name'),
    toolInput: strOf(o, 'tool_input'),
    workspaceRef: strOf(o, 'workspace_ref'),
    cwd: strOf(o, 'cwd'),
    createdAt: strOf(o, 'created_at') ?? '',
    updatedAt: strOf(o, 'updated_at') ?? '',
    requestId: strOf(o, 'request_id'),
    prompt: strOf(o, 'question_prompt', 'permission_prompt', 'prompt', 'body'),
    options: toOptions(pick(o, 'question_options', 'options', 'choices')),
    multiSelect: boolOf(o, 'question_multi_select', 'multi_select'),
  }
}

function toStyle(o: Raw): TerminalStyle {
  return {
    fg: strOf(o, 'foreground') ?? '#ffffff',
    bg: strOf(o, 'background') ?? '#000000',
    bold: boolOf(o, 'bold'),
    faint: boolOf(o, 'faint'),
    italic: boolOf(o, 'italic'),
    underline: boolOf(o, 'underline'),
    strike: boolOf(o, 'strikethrough'),
    inverse: boolOf(o, 'inverse'),
  }
}

// Maps a terminal.replay payload (cmux.render-grid.v1) into styled lines.
// Spans reference a shared style table; scrollback rows precede the viewport.
export function toTerminalGrid(raw: Raw): TerminalGrid {
  const rg = (pick(raw, 'render_grid') as Raw) ?? raw
  const theme = (pick(rg, 'terminal_theme') as Raw) ?? {}

  const styles: TerminalStyle[] = []
  const stylesRaw = pick(rg, 'styles')
  if (Array.isArray(stylesRaw)) {
    for (const s of stylesRaw as Raw[]) {
      styles[typeof s.id === 'number' ? s.id : styles.length] = toStyle(s)
    }
  }

  const scrollbackRows = num(pick(rg, 'scrollback_rows'))
  const lines: TerminalLine[] = []
  const ensure = (index: number) => {
    while (lines.length <= index) lines.push([])
  }
  const addSpans = (spans: unknown, offset: number) => {
    if (!Array.isArray(spans)) return
    for (const sp of spans as Raw[]) {
      const row = num(sp.row) + offset
      ensure(row)
      const text = strOf(sp, 'text') ?? ''
      lines[row].push({
        col: num(sp.column),
        width: num(pick(sp, 'cell_width')) || text.length,
        text,
        style: num(sp.style_id),
      })
    }
  }
  addSpans(pick(rg, 'scrollback_spans'), 0)
  addSpans(pick(rg, 'row_spans'), scrollbackRows)
  for (const line of lines) line.sort((a, b) => a.col - b.col)
  // Drop the trailing all-blank rows so the view ends at the last real content.
  while (
    lines.length &&
    lines[lines.length - 1].every((s) => s.text.trim() === '')
  ) {
    lines.pop()
  }

  return {
    surfaceRef: strOf(raw, 'surface_id') ?? strOf(rg, 'surface_id') ?? '',
    columns: num(pick(rg, 'columns')) || num(pick(raw, 'columns')) || 80,
    background:
      strOf(theme, 'background') ??
      strOf(rg, 'terminal_background') ??
      '#1e1e1e',
    foreground:
      strOf(theme, 'foreground') ??
      strOf(rg, 'terminal_foreground') ??
      '#ffffff',
    styles,
    lines,
    fetchedAt: new Date().toISOString(),
  }
}
