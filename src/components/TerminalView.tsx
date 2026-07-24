import { Loader2, RefreshCw } from 'lucide-react'
import { type ReactNode, useCallback, useEffect, useState } from 'react'
import type { TerminalGrid } from '#/domain/entities/terminal-grid'
import { useFollowTail } from '#/hooks/use-follow-tail'
import { useHideContent } from '#/hooks/use-hide-content'
import { relativeTime } from '#/lib/format'
import { renderLine } from '#/lib/terminal-render'
import { JumpToBottom } from './JumpToBottom'

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
  toggle,
}: {
  grid?: TerminalGrid
  loading: boolean
  onRefresh: () => void
  toggle: ReactNode
}) {
  const [fontSize, setFontSize] = useState(FONT_DEFAULT)
  const { hidden } = useHideContent()
  const { scrollRef, showJump, onScroll, jumpToBottom } = useFollowTail(grid)

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

  const bg = grid?.background ?? 'var(--surface-2)'
  const fg = grid?.foreground ?? 'var(--text)'
  const empty = !grid || grid.lines.length === 0

  return (
    <div className="card flex min-h-0 flex-1 flex-col overflow-hidden">
      <div
        className="flex items-center justify-between gap-2 px-3 py-2"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div className="flex min-w-0 items-center gap-2">
          {toggle}
          {grid && (
            <span
              className="truncate text-xs"
              style={{ color: 'var(--muted)' }}
            >
              updated {relativeTime(grid.fetchedAt)} ago
            </span>
          )}
        </div>
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

        {showJump && <JumpToBottom onClick={jumpToBottom} />}
      </div>
    </div>
  )
}
