import { Loader2, RefreshCw } from 'lucide-react'
import type { ReactNode } from 'react'
import type { Chat, ChatMessage } from '#/domain/entities/chat'
import type { TerminalGrid } from '#/domain/entities/terminal-grid'
import { useFollowTail } from '#/hooks/use-follow-tail'
import { useHideContent } from '#/hooks/use-hide-content'
import { relativeTime } from '#/lib/format'
import { renderLine } from '#/lib/terminal-render'
import { JumpToBottom } from './JumpToBottom'

// Chat rendering of the captured transcript: the same content as the terminal,
// grouped into role bubbles with cmux's true colours. Roles are inferred (no
// conversation API), so it degrades to a single agent bubble for unknown agents.
export function ChatView({
  chat,
  grid,
  loading,
  onRefresh,
  toggle,
}: {
  chat: Chat
  grid?: TerminalGrid
  loading: boolean
  onRefresh: () => void
  toggle: ReactNode
}) {
  const { hidden } = useHideContent()
  const { scrollRef, showJump, onScroll, jumpToBottom } = useFollowTail(chat)
  const empty = chat.messages.length === 0

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
        <button
          type="button"
          onClick={onRefresh}
          className="btn btn-ghost"
          style={{ minHeight: 32, padding: '0 0.5rem' }}
          aria-label="Refresh chat"
        >
          {loading ? (
            <Loader2 size={16} className="spin" />
          ) : (
            <RefreshCw size={16} />
          )}
        </button>
      </div>

      <div className="relative min-h-0 flex-1">
        <div
          ref={scrollRef}
          onScroll={onScroll}
          className={`flex h-full flex-col gap-2.5 overflow-auto p-3 ${hidden ? 'redacted' : ''}`}
          style={{ background: 'var(--surface)' }}
        >
          {empty ? (
            <span style={{ color: 'var(--muted)' }}>
              {loading ? 'Loading…' : 'No messages yet.'}
            </span>
          ) : (
            chat.messages.map((m) => (
              <Bubble key={m.id} message={m} grid={grid} />
            ))
          )}
        </div>

        {showJump && <JumpToBottom onClick={jumpToBottom} />}
      </div>
    </div>
  )
}

function Bubble({
  message,
  grid,
}: {
  message: ChatMessage
  grid?: TerminalGrid
}) {
  if (message.role === 'status') {
    return (
      <div className="flex justify-center">
        <span className="chip" style={{ maxWidth: '100%' }}>
          <span className="truncate">{message.text}</span>
        </span>
      </div>
    )
  }

  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div
          className="chat-prose"
          style={{
            maxWidth: '85%',
            padding: '0.5rem 0.75rem',
            borderRadius: 14,
            borderTopRightRadius: 4,
            background: 'var(--accent)',
            color: 'var(--accent-ink)',
            fontSize: '0.9rem',
            lineHeight: 1.45,
          }}
        >
          {message.text}
        </div>
      </div>
    )
  }

  // Agent/tool bubbles carry the grid's own palette so span colours stay
  // faithful and readable regardless of the app theme (terminal text is often
  // near-white and would vanish on a light surface).
  const isTool = message.role === 'tool'
  const bg = grid?.background ?? '#1e1e1e'
  const fg = grid?.foreground ?? '#ffffff'
  return (
    <div className="flex justify-start">
      <div
        style={{
          maxWidth: '95%',
          minWidth: 0,
          borderRadius: 14,
          borderTopLeftRadius: 4,
          border: '1px solid var(--border)',
          background: bg,
          color: fg,
          overflow: 'hidden',
        }}
      >
        {isTool && message.label && (
          <div
            className="px-2.5 py-1 text-xs font-semibold"
            style={{
              opacity: 0.7,
              borderBottom: '1px solid rgba(127,127,127,0.25)',
              fontFamily: 'var(--mono)',
            }}
          >
            {message.label}
          </div>
        )}
        <div
          className={isTool ? 'chat-pre' : 'chat-prose'}
          style={{
            padding: '0.5rem 0.7rem',
            fontFamily: 'var(--mono)',
            fontSize: '12.5px',
            lineHeight: 1.5,
          }}
        >
          {message.lines.map((line, row) => (
            <div key={row}>{renderLine(line, grid?.styles ?? [], fg, bg)}</div>
          ))}
        </div>
      </div>
    </div>
  )
}
