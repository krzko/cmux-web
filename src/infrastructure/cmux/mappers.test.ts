import { describe, expect, it } from 'vitest'
import {
  toFeedItem,
  toGroup,
  toNotification,
  toSurface,
  toTerminalGrid,
  toWorkspace,
} from './mappers'

describe('toGroup', () => {
  it('maps snake_case fields and ordered member refs', () => {
    const g = toGroup({
      id: 'G1',
      ref: 'workspace_group:6',
      name: 'Personal',
      custom_color: '#fff',
      icon_symbol: 'star',
      is_collapsed: true,
      is_pinned: true,
      member_workspace_refs: ['workspace:1', 'workspace:2'],
      anchor_workspace_ref: 'workspace:1',
    })
    expect(g).toEqual({
      id: 'G1',
      ref: 'workspace_group:6',
      name: 'Personal',
      color: '#fff',
      icon: 'star',
      collapsed: true,
      pinned: true,
      memberRefs: ['workspace:1', 'workspace:2'],
      anchorRef: 'workspace:1',
    })
  })

  it('tolerates missing fields', () => {
    const g = toGroup({ ref: 'workspace_group:1' })
    expect(g.name).toBe('Group')
    expect(g.memberRefs).toEqual([])
    expect(g.collapsed).toBe(false)
  })
})

describe('toWorkspace', () => {
  it('keeps the raw title and maps cwd/preview/remote', () => {
    const w = toWorkspace({
      ref: 'workspace:28',
      id: 'W1',
      index: 1,
      selected: true,
      title: '✳ Do a thing',
      custom_color: '#C0392B',
      current_directory: '/Users/x/repo',
      latest_conversation_message: 'preview line',
      latest_submitted_at: '2026-07-20T13:59:28.456Z',
      remote: { enabled: true, state: 'connected' },
    })
    expect(w.title).toBe('✳ Do a thing')
    expect(w.cwd).toBe('/Users/x/repo')
    expect(w.preview).toBe('preview line')
    expect(w.selected).toBe(true)
    expect(w.remoteEnabled).toBe(true)
    expect(w.remoteState).toBe('connected')
  })

  it('falls back to custom_title and defaults', () => {
    const w = toWorkspace({ ref: 'workspace:1', custom_title: 'Group 5' })
    expect(w.title).toBe('Group 5')
    expect(w.cwd).toBe('')
    expect(w.remoteEnabled).toBe(false)
  })
})

describe('toNotification', () => {
  it('maps is_read -> read and the Waiting subtitle', () => {
    const n = toNotification({
      id: 'N1',
      title: 'Claude Code',
      subtitle: 'Waiting',
      body: 'Claude is waiting for your input',
      is_read: false,
      workspace_ref: 'workspace:16',
      surface_ref: 'surface:19',
      created_at: '2026-07-20T13:33:48Z',
    })
    expect(n.subtitle).toBe('Waiting')
    expect(n.read).toBe(false)
    expect(n.workspaceRef).toBe('workspace:16')
  })
})

describe('toSurface', () => {
  it('reads type, pane, selection and the bound agent', () => {
    const s = toSurface({
      ref: 'surface:34',
      id: 'S1',
      index: 0,
      index_in_pane: 0,
      focused: true,
      selected_in_pane: true,
      pane_ref: 'pane:32',
      type: 'terminal',
      title: 'Run code',
      resume_binding: { kind: 'claude', name: 'Claude Code' },
    })
    expect(s.kind).toBe('terminal')
    expect(s.paneRef).toBe('pane:32')
    expect(s.selectedInPane).toBe(true)
    expect(s.agentKind).toBe('claude')
    expect(s.agentName).toBe('Claude Code')
  })

  it('leaves agent fields undefined for a plain shell', () => {
    const s = toSurface({ ref: 'surface:29', id: 'S2', type: 'terminal' })
    expect(s.agentKind).toBeUndefined()
    expect(s.agentName).toBeUndefined()
  })
})

describe('toFeedItem', () => {
  it('maps a pending question with options', () => {
    const item = toFeedItem({
      id: 'Q1',
      kind: 'question',
      source: 'claude',
      status: 'pending',
      request_id: 'req-1',
      question_prompt: 'Pick one',
      question_options: [
        { id: 'opt0', label: 'A', description: 'first' },
        { id: 'opt1', label: 'B' },
      ],
      question_multi_select: false,
      created_at: 'c',
      updated_at: 'u',
    })
    expect(item.kind).toBe('question')
    expect(item.requestId).toBe('req-1')
    expect(item.prompt).toBe('Pick one')
    expect(item.resolved).toBe(false)
    expect(item.options).toEqual([
      { value: 'opt0', label: 'A', description: 'first' },
      { value: 'opt1', label: 'B', description: undefined },
    ])
  })

  it('classifies telemetry tool use as activity and marks resolved', () => {
    const item = toFeedItem({
      id: 'A1',
      kind: 'toolUse',
      status: 'telemetry',
      resolved_at: '2026-07-20T12:13:56Z',
    })
    expect(item.kind).toBe('activity')
    expect(item.resolved).toBe(true)
    expect(item.options).toEqual([])
  })
})

describe('toTerminalGrid', () => {
  it('resolves styles, fills column gaps via cell_width, and trims blanks', () => {
    const grid = toTerminalGrid({
      surface_id: 'S1',
      columns: 80,
      render_grid: {
        columns: 80,
        rows: 2,
        scrollback_rows: 0,
        terminal_theme: { background: '#1E1E1E', foreground: '#FFFFFF' },
        styles: [
          { id: 0, foreground: '#FFFFFF', background: '#1E1E1E' },
          { id: 1, foreground: '#B1B9F9', background: '#1E1E1E', bold: true },
        ],
        row_spans: [
          { row: 0, column: 0, cell_width: 2, style_id: 0, text: 'hi' },
          { row: 0, column: 3, cell_width: 4, style_id: 1, text: 'bold' },
          { row: 1, column: 0, cell_width: 1, style_id: 0, text: ' ' },
        ],
      },
    })
    expect(grid.background).toBe('#1E1E1E')
    expect(grid.foreground).toBe('#FFFFFF')
    expect(grid.styles[1].bold).toBe(true)
    // Trailing blank row 1 is trimmed; row 0 keeps two spans with a gap width.
    expect(grid.lines).toHaveLength(1)
    expect(grid.lines[0]).toEqual([
      { col: 0, width: 2, text: 'hi', style: 0 },
      { col: 3, width: 4, text: 'bold', style: 1 },
    ])
  })
})
