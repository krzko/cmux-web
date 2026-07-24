import { Clock, Loader2, RefreshCw, SquareTerminal } from 'lucide-react'
import type { ReactNode } from 'react'
import type { Chat, ChatMessage } from '#/domain/entities/chat'
import type { TerminalGrid } from '#/domain/entities/terminal-grid'
import { useFollowTail } from '#/hooks/use-follow-tail'
import { useHideContent } from '#/hooks/use-hide-content'
import { relativeTime } from '#/lib/format'
import { JumpToBottom } from './JumpToBottom'

// Chat rendering of the captured transcript. Assistant turns flow as prose,
// commands and their output sit in code cards, and the user's own messages are
// accent bubbles, so it reads like a chat rather than a terminal. Roles are
// inferred (no conversation API) and degrade to plain agent prose.
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
          className={`flex h-full flex-col gap-3 overflow-auto px-3 py-4 ${hidden ? 'redacted' : ''}`}
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

const stripBullet = (t: string) => t.replace(/^\s*[●⏺◉]\s+/, '')
const cleanTool = (t: string) =>
  t
    .split('\n')
    .map((l) => l.replace(/^\s*[●⏺◉]\s+/, '').replace(/^\s*⎿\s?/, ''))
    .join('\n')

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
            padding: '0.55rem 0.8rem',
            borderRadius: 16,
            borderTopRightRadius: 5,
            background: 'var(--accent)',
            color: 'var(--accent-ink)',
            fontSize: '0.95rem',
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
          className="chat-pre px-3 py-2"
          style={{
            fontFamily: 'var(--mono)',
            fontSize: '12px',
            lineHeight: 1.5,
            color: 'var(--text)',
            maxHeight: 260,
            overflowY: 'auto',
          }}
        >
          {cleanTool(message.text)}
        </div>
      </div>
    )
  }

  // Assistant prose: flows on the page like a chat message, no bubble chrome.
  return (
    <div
      className="chat-prose"
      style={{
        color: 'var(--text)',
        fontSize: '0.95rem',
        lineHeight: 1.6,
      }}
    >
      {stripBullet(message.text)}
    </div>
  )
}
