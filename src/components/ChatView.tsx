import { Clock, Loader2, RefreshCw, SquareTerminal } from 'lucide-react'
import type { CSSProperties, ReactNode } from 'react'
import type {
  Chat,
  ChatLine,
  ChatMessage,
  ChatStyle,
} from '#/domain/entities/chat'
import type { TerminalGrid } from '#/domain/entities/terminal-grid'
import { useFollowTail } from '#/hooks/use-follow-tail'
import { useHideContent } from '#/hooks/use-hide-content'
import { relativeTime } from '#/lib/format'
import { JumpToBottom } from './JumpToBottom'

// Chat rendering of the captured transcript. Assistant turns flow as prose,
// commands and their output sit in code cards, and the user's own messages are
// accent bubbles, so it reads like a chat rather than a terminal. The terminal's
// colours and bold are kept per span; roles are inferred (no conversation API).
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
          className={`flex h-full flex-col gap-4 overflow-auto overscroll-contain px-4 py-4 ${hidden ? 'redacted' : ''}`}
          style={{ background: 'var(--surface)' }}
        >
          {empty ? (
            <span style={{ color: 'var(--muted)' }}>
              {loading ? 'Loading…' : 'No messages yet.'}
            </span>
          ) : (
            chat.messages.map((m, i) => (
              // Index key: accumulated history is append-mostly and messages can
              // repeat ids across polled snapshots.
              <Bubble key={i} message={m} />
            ))
          )}
        </div>

        {showJump && <JumpToBottom onClick={jumpToBottom} />}
      </div>
    </div>
  )
}

function runCss(style?: ChatStyle): CSSProperties {
  if (!style) return {}
  const css: CSSProperties = {}
  if (style.color) css.color = style.color
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

function Runs({ line }: { line: ChatLine }) {
  return (
    <>
      {line.map((run, i) => (
        <span key={i} style={runCss(run.style)}>
          {run.text}
        </span>
      ))}
    </>
  )
}

// Assistant prose: reflowed paragraphs that flow and wrap to the screen width.
function Prose({ paragraphs }: { paragraphs: ChatLine[] }) {
  return (
    <div
      className="flex flex-col gap-2.5"
      style={{ color: 'var(--text)', fontSize: '1rem', lineHeight: 1.6 }}
    >
      {paragraphs.map((p, i) => (
        <p key={i} className="chat-flow" style={{ margin: 0 }}>
          <Runs line={p} />
        </p>
      ))}
    </div>
  )
}

function Bubble({ message }: { message: ChatMessage }) {
  if (message.role === 'status') {
    return (
      <div
        className="flex items-center gap-1.5 text-xs"
        style={{ color: 'var(--muted)' }}
      >
        <Clock size={12} style={{ flex: '0 0 auto' }} />
        <span className="truncate">{message.text}</span>
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
            padding: '0.55rem 0.85rem',
            borderRadius: 18,
            borderTopRightRadius: 5,
            background: 'var(--accent)',
            color: 'var(--accent-ink)',
            fontSize: '1rem',
            lineHeight: 1.5,
          }}
        >
          {message.text}
        </div>
      </div>
    )
  }

  if (message.role === 'tool') {
    return (
      <div
        className="w-full overflow-hidden"
        style={{
          border: '1px solid var(--border)',
          borderRadius: 12,
          background: 'var(--surface-2)',
        }}
      >
        <div
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold"
          style={{
            color: 'var(--accent)',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <SquareTerminal size={13} style={{ flex: '0 0 auto' }} />
          <span className="truncate">{message.label ?? 'Tool'}</span>
        </div>
        <div
          className="px-3 py-2"
          style={{
            fontFamily: 'var(--mono)',
            fontSize: '12px',
            lineHeight: 1.5,
            color: 'var(--text)',
            maxHeight: 260,
            overflowY: 'auto',
          }}
        >
          {message.lines.map((line, row) => (
            <div key={row} className="chat-pre">
              {line.length === 0 ? ' ' : <Runs line={line} />}
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Assistant prose: flowing paragraphs, no bubble chrome.
  return <Prose paragraphs={message.lines} />
}
