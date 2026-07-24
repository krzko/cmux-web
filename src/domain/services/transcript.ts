import type { Chat, ChatMessage, ChatRole } from '#/domain/entities/chat'
import type {
  TerminalGrid,
  TerminalLine,
} from '#/domain/entities/terminal-grid'

// Turns a captured terminal grid into chat messages. cmux has no conversation
// API, so roles are inferred from the agent TUI: markers are tuned for Claude
// Code (the common case) and degrade gracefully to one agent bubble otherwise.
// Pure and framework-free so it is unit-tested with synthetic grids.

// Reconstruct a line's plain text, filling column gaps with spaces (as the
// terminal renderer does) so indentation and alignment survive.
export function lineText(line: TerminalLine): string {
  let out = ''
  let cursor = 0
  for (const span of [...line].sort((a, b) => a.col - b.col)) {
    if (span.col > cursor) out += ' '.repeat(span.col - cursor)
    out += span.text
    cursor = span.col + (span.width || span.text.length)
  }
  return out.replace(/\s+$/, '')
}

const RULE = /^[\s─━═╌╍┄┅┈┉│┃▁▔]+$/
const PROMPT_EMPTY = /^\s*[>❯]\s*$/
const INPUT_CARET = /^\s*❯/
const USER = /^\s*>\s+(\S.*)$/
// A bullet starts a new assistant block; it is a tool only when the bullet is
// followed by Name(...) (e.g. Bash(...), Read(...)). Plain bullet text is prose.
const BULLET = /^\s*[●⏺◉]\s+/
const TOOL_CALL = /^\s*[●⏺◉]\s+([A-Za-z][\w.-]*)\(/
const STATUS = /^\s*[✻✶✳✷✵✽∗*·]\s+(.+)$/
const STATUS_MARK = /^\s*[✻✶✳✷✵✽∗*·]\s+/

// Bottom-of-screen chrome: the input box and the status footer cmux/agents draw
// below the transcript. Trimmed from the tail so it never leaks into a message.
function isTrailingChrome(text: string): boolean {
  if (text.trim() === '') return true
  if (RULE.test(text) && text.trim().length >= 8) return true
  if (PROMPT_EMPTY.test(text)) return true
  if (INPUT_CARET.test(text)) return true
  if (/⏵⏵|⧉|⎇/.test(text)) return true
  if (
    /bypass permissions|accept edits|plan mode on|\? for shortcuts/i.test(text)
  )
    return true
  if (/·\s*ctx\s/i.test(text)) return true
  // Right-aligned footer hint gutter (e.g. "/clear to save 258.8k tokens").
  if (/\b\d[\d.]*k tokens?\b|\/(clear|compact) to save/i.test(text)) return true
  return false
}

function isStatus(text: string): boolean {
  if (/esc to interrupt/i.test(text)) return true
  return (
    STATUS.test(text) &&
    /\b(for|thinking|crunch|ponder|working|simmer|brew|cook|mull|ruminat|churn|tokens)\b/i.test(
      text,
    )
  )
}

function toolLabel(text: string): string {
  return text.match(TOOL_CALL)?.[1] ?? 'Tool'
}

export function toChat(grid: TerminalGrid | undefined): Chat {
  if (!grid || grid.lines.length === 0) return { messages: [] }

  const items = grid.lines.map((line) => ({ line, text: lineText(line) }))

  // Drop the trailing input box + footer, then any leading blank run.
  let end = items.length
  while (end > 0 && isTrailingChrome(items[end - 1].text)) end--
  let start = 0
  while (start < end && items[start].text.trim() === '') start++

  const messages: ChatMessage[] = []
  // Holder object so the helpers below mutate one place without tripping
  // control-flow narrowing on a captured let.
  const s: { current: ChatMessage | null; pendingBlank: boolean } = {
    current: null,
    pendingBlank: false,
  }

  const flush = () => {
    const cur = s.current
    if (cur?.lines.length) {
      const strip = cur.role === 'user' ? /^\s*>\s?/ : /^$/
      cur.text = cur.lines
        .map((l) => lineText(l).replace(strip, ''))
        .join('\n')
        .replace(/\n+$/, '')
      messages.push(cur)
    }
    s.current = null
    s.pendingBlank = false
  }

  const open = (
    i: number,
    role: ChatRole,
    line: TerminalLine,
    label?: string,
  ) => {
    flush()
    s.current = { id: `m${i}`, role, label, lines: [line], text: '' }
  }
  const append = (line: TerminalLine) => {
    if (!s.current) return
    if (s.pendingBlank) s.current.lines.push([])
    s.pendingBlank = false
    s.current.lines.push(line)
  }

  for (let i = start; i < end; i++) {
    const { line, text } = items[i]
    if (INPUT_CARET.test(text)) continue
    if (text.trim() === '') {
      if (s.current) s.pendingBlank = true
      continue
    }
    if (isStatus(text)) {
      flush()
      const clean = text.replace(STATUS_MARK, '')
      messages.push({ id: `m${i}`, role: 'status', lines: [line], text: clean })
      continue
    }
    if (USER.test(text)) {
      if (s.current?.role === 'user') append(line)
      else open(i, 'user', line)
      continue
    }
    if (BULLET.test(text)) {
      // Every bullet is a fresh assistant turn; a Name(...) bullet is a tool.
      if (TOOL_CALL.test(text)) open(i, 'tool', line, toolLabel(text))
      else open(i, 'agent', line)
      continue
    }
    // Unmarked or tool-result (⎿) line: continues the current agent/tool block;
    // after a user turn (or at the start) it opens a fresh agent block.
    const role = s.current?.role
    if (role === 'agent' || role === 'tool') append(line)
    else open(i, 'agent', line)
  }
  flush()

  // Drop any bubble that is visually empty (whitespace, NBSP, braille blanks).
  return {
    messages: messages.filter((m) => m.text.replace(/[\s⠀]/g, '') !== ''),
  }
}
