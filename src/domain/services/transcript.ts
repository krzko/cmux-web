import type {
  Chat,
  ChatLine,
  ChatMessage,
  ChatRole,
  ChatStyle,
} from '#/domain/entities/chat'
import type {
  TerminalGrid,
  TerminalLine,
  TerminalStyle,
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

// Resolve a terminal style into a self-contained chat style. Default-foreground
// text carries no colour so it inherits the app's readable text colour; only
// real ANSI colours and text weight/decoration are kept (bg/inverse dropped so
// prose stays clean). Returns undefined when nothing notable is set.
function toChatStyle(
  st: TerminalStyle | undefined,
  defaultFg: string,
): ChatStyle | undefined {
  if (!st) return undefined
  const style: ChatStyle = {}
  if (st.fg && st.fg.toLowerCase() !== defaultFg.toLowerCase())
    style.color = st.fg
  if (st.bold) style.bold = true
  if (st.faint) style.faint = true
  if (st.italic) style.italic = true
  if (st.underline) style.underline = true
  if (st.strike) style.strike = true
  return Object.keys(style).length ? style : undefined
}

// Styled runs for a line, with column gaps baked in as unstyled space runs.
function toRuns(
  line: TerminalLine,
  styles: TerminalStyle[],
  defaultFg: string,
): ChatLine {
  const runs: ChatLine = []
  let cursor = 0
  for (const span of [...line].sort((a, b) => a.col - b.col)) {
    if (span.col > cursor) runs.push({ text: ' '.repeat(span.col - cursor) })
    runs.push({
      text: span.text,
      style: toChatStyle(styles[span.style], defaultFg),
    })
    cursor = span.col + (span.width || span.text.length)
  }
  return runs
}

function runsText(line: ChatLine): string {
  return line
    .map((r) => r.text)
    .join('')
    .replace(/\s+$/, '')
}

// Remove leading whitespace-only runs and trim the first content run's indent.
function stripRunsStart(line: ChatLine): ChatLine {
  const out = [...line]
  while (out.length && out[0].text.trim() === '') out.shift()
  if (out.length) out[0] = { ...out[0], text: out[0].text.replace(/^\s+/, '') }
  return out
}

function trimRunsEnd(line: ChatLine): ChatLine {
  const out = [...line]
  while (out.length && out[out.length - 1].text.trim() === '') out.pop()
  const last = out.length - 1
  if (last >= 0)
    out[last] = { ...out[last], text: out[last].text.replace(/\s+$/, '') }
  return out
}

// Reflow terminal-wrapped rows into paragraphs. Agents wrap prose near the full
// width, so a row that reaches within a margin of the right edge continues on the
// next row; a shorter row is a real line break. Shell output (far shorter than
// the width) is never joined. Styling is preserved across the join.
export function reflowProse(lines: ChatLine[], columns: number): ChatLine[] {
  const threshold = columns - Math.max(8, Math.round(columns * 0.08))
  const paras: ChatLine[] = []
  let cur: ChatLine = []
  let prevFilled = false
  const flush = () => {
    const t = trimRunsEnd(cur)
    if (t.length) paras.push(t)
    cur = []
  }
  for (const line of lines) {
    const width = runsText(line).length
    const stripped = stripRunsStart(line)
    if (!stripped.length) {
      flush()
      prevFilled = false
      continue
    }
    if (cur.length && prevFilled) cur.push({ text: ' ' }, ...stripped)
    else {
      flush()
      cur = [...stripped]
    }
    prevFilled = width >= threshold
  }
  flush()
  return paras
}

// Drop leading characters matching `re` from a styled line, crossing runs.
function stripLead(line: ChatLine, re: RegExp): ChatLine {
  const match = line
    .map((r) => r.text)
    .join('')
    .match(re)
  if (!match?.[0]) return line
  let n = match[0].length
  const out: ChatLine = []
  for (const run of line) {
    if (n <= 0) {
      out.push(run)
    } else if (run.text.length <= n) {
      n -= run.text.length
    } else {
      out.push({ text: run.text.slice(n), style: run.style })
      n = 0
    }
  }
  return out
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
// Box banners (e.g. the agent welcome frame): a corner/junction edge, or a line
// fully bracketed by verticals. Dropped so they do not read as a message.
const FRAME_EDGE = /^\s*[╭╮╰╯├┤┬┴┼┌┐└┘╔╗╚╝╠╣╦╩╬]/
const FRAME_SIDE = /^\s*[│┃╎╏┆┇].*[│┃╎╏┆┇]\s*$/
function isFrame(text: string): boolean {
  return FRAME_EDGE.test(text) || FRAME_SIDE.test(text)
}

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

  const fg = grid.foreground
  const items = grid.lines.map((line) => ({
    line: toRuns(line, grid.styles, fg),
    text: lineText(line),
  }))

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
      // Strip the role marker from the styled lines so it never renders, then
      // reflow assistant prose into paragraphs (tools keep their raw lines).
      if (cur.role === 'user') {
        cur.lines[0] = stripLead(cur.lines[0], /^\s*>\s?/)
      } else if (cur.role === 'agent') {
        cur.lines[0] = stripLead(cur.lines[0], /^\s*[●⏺◉]\s+/)
        cur.lines = reflowProse(cur.lines, grid.columns)
      } else if (cur.role === 'tool') {
        cur.lines[0] = stripLead(cur.lines[0], /^\s*[●⏺◉]\s+/)
        cur.lines = cur.lines.map((l) => stripLead(l, /^\s*⎿\s?/))
      }
      cur.text = cur.lines.map(runsText).join('\n').replace(/\n+$/, '')
      messages.push(cur)
    }
    s.current = null
    s.pendingBlank = false
  }

  const open = (i: number, role: ChatRole, line: ChatLine, label?: string) => {
    flush()
    s.current = { id: `m${i}`, role, label, lines: [line], text: '' }
  }
  const append = (line: ChatLine) => {
    if (!s.current) return
    if (s.pendingBlank) s.current.lines.push([])
    s.pendingBlank = false
    s.current.lines.push(line)
  }

  for (let i = start; i < end; i++) {
    const { line, text } = items[i]
    if (INPUT_CARET.test(text)) continue
    if (isFrame(text)) continue
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
