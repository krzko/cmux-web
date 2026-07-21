import { ChevronDown, Loader2, RefreshCw } from 'lucide-react'
import {
  type CSSProperties,
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import type {
  TerminalGrid,
  TerminalLine,
  TerminalStyle,
} from '#/domain/entities/terminal-grid'
import { useHideContent } from '#/hooks/use-hide-content'
import { relativeTime } from '#/lib/format'

const FONT_KEY = 'cmux:terminal-font'
const FONT_DEFAULT = 13
const FONT_MIN = 9
const FONT_MAX = 22

// Terminal viewer. Renders cmux's render grid (terminal.replay) so colours
// match the native app exactly. The grid keeps its real column width; wide
// output scrolls horizontally. Font size is fixed and readable by default, with
// a manual A-/A+ control (persisted); we never auto-resize (that both loops and
// makes text unreadable). Opens pinned to the tail and auto-follows while at the
// bottom; scrolling up reveals a jump-to-bottom button. Redacted under hide mode.
export function TerminalView({
  grid,
  loading,
  onRefresh,
}: {
  grid?: TerminalGrid
  loading: boolean
  onRefresh: () => void
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const followRef = useRef(true)
  const [showJump, setShowJump] = useState(false)
  const [fontSize, setFontSize] = useState(FONT_DEFAULT)
  const { hidden } = useHideContent()

  useEffect(() => {
    const stored = Number(localStorage.getItem(FONT_KEY))
    if (stored >= FONT_MIN && stored <= FONT_MAX) setFontSize(stored)
  }, [])

  const changeFont = useCallback((delta: number) => {
    setFontSize((prev) => {
      const next = Math.max(FONT_MIN, Math.min(FONT_MAX, prev + delta))
      localStorage.setItem(FONT_KEY, String(next))
      return next
    })
  }, [])

  const onScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight
    const atBottom = distance < 40
    followRef.current = atBottom
    setShowJump(!atBottom)
  }, [])

  // biome-ignore lint/correctness/useExhaustiveDependencies: re-run on each new grid to follow the tail
  useLayoutEffect(() => {
    const el = scrollRef.current
    if (el && followRef.current) el.scrollTop = el.scrollHeight
  }, [grid])

  const jumpToBottom = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
    followRef.current = true
    setShowJump(false)
  }, [])

  const bg = grid?.background ?? 'var(--surface-2)'
  const fg = grid?.foreground ?? 'var(--text)'
  const empty = !grid || grid.lines.length === 0

  return (
    <div className="card flex min-h-0 flex-1 flex-col overflow-hidden">
      <div
        className="flex items-center justify-between gap-2 px-3 py-2"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <span
          className="min-w-0 truncate text-xs font-semibold"
          style={{ color: 'var(--muted)' }}
        >
          Terminal
          {grid ? ` · updated ${relativeTime(grid.fetchedAt)} ago` : ''}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => changeFont(-1)}
            className="btn btn-ghost"
            style={{ minHeight: 32, padding: '0 0.5rem', fontSize: 12 }}
            aria-label="Decrease font size"
            disabled={fontSize <= FONT_MIN}
          >
            A−
          </button>
          <button
            type="button"
            onClick={() => changeFont(1)}
            className="btn btn-ghost"
            style={{ minHeight: 32, padding: '0 0.5rem', fontSize: 15 }}
            aria-label="Increase font size"
            disabled={fontSize >= FONT_MAX}
          >
            A+
          </button>
          <button
            type="button"
            onClick={onRefresh}
            className="btn btn-ghost"
            style={{ minHeight: 32, padding: '0 0.5rem' }}
            aria-label="Refresh terminal"
          >
            {loading ? (
              <Loader2 size={16} className="spin" />
            ) : (
              <RefreshCw size={16} />
            )}
          </button>
        </div>
      </div>

      <div className="relative min-h-0 flex-1">
        <div
          ref={scrollRef}
          onScroll={onScroll}
          className={`terminal-surface h-full p-3 ${hidden ? 'redacted' : ''}`}
          style={{
            border: 0,
            borderRadius: 0,
            background: bg,
            color: fg,
            fontSize: `${fontSize}px`,
          }}
        >
          {empty ? (
            <span style={{ color: 'var(--muted)' }}>
              {loading ? 'Loading…' : 'No output.'}
            </span>
          ) : (
            <div style={{ width: 'max-content', minWidth: '100%' }}>
              {grid.lines.map((line, row) => (
                <div key={row} style={{ whiteSpace: 'pre' }}>
                  {renderLine(line, grid.styles, fg, bg)}
                </div>
              ))}
            </div>
          )}
        </div>

        {showJump && (
          <button
            type="button"
            onClick={jumpToBottom}
            aria-label="Scroll to latest"
            style={{
              position: 'absolute',
              right: 12,
              bottom: 12,
              width: 40,
              height: 40,
              borderRadius: 999,
              border: '1px solid var(--accent)',
              background: 'var(--accent)',
              color: 'var(--accent-ink)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--shadow)',
              cursor: 'pointer',
            }}
          >
            <ChevronDown size={20} />
          </button>
        )}
      </div>
    </div>
  )
}

// Rebuild a line from its spans, filling the column gaps (blank cells cmux omits)
// with spaces so alignment matches the terminal.
function renderLine(
  line: TerminalLine,
  styles: TerminalStyle[],
  fg: string,
  bg: string,
): ReactNode {
  if (line.length === 0) return ' '
  const nodes: ReactNode[] = []
  let cursor = 0
  line.forEach((span, index) => {
    if (span.col > cursor) nodes.push(' '.repeat(span.col - cursor))
    nodes.push(
      <span key={index} style={spanStyle(styles[span.style], fg, bg)}>
        {span.text}
      </span>,
    )
    cursor = span.col + (span.width || span.text.length)
  })
  return nodes
}

// Resolve a span's style into CSS, honouring inverse/bold/faint/italic/decoration.
function spanStyle(
  style: TerminalStyle | undefined,
  gridFg: string,
  gridBg: string,
): CSSProperties {
  if (!style) return { color: gridFg }
  let fg = style.fg || gridFg
  let bg = style.bg || gridBg
  if (style.inverse) {
    const swap = fg
    fg = bg
    bg = swap
  }
  const css: CSSProperties = { color: fg }
  if (bg && bg.toLowerCase() !== gridBg.toLowerCase()) css.background = bg
  if (style.bold) css.fontWeight = 700
  if (style.faint) css.opacity = 0.6
  if (style.italic) css.fontStyle = 'italic'
  const decoration = [
    style.underline ? 'underline' : '',
    style.strike ? 'line-through' : '',
  ]
    .filter(Boolean)
    .join(' ')
  if (decoration) css.textDecoration = decoration
  return css
}
