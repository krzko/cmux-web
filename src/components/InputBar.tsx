import { Loader2, Send } from 'lucide-react'
import { useState } from 'react'
import type { TerminalKey } from '#/domain/entities/interaction'
import { KeyToolbar } from './KeyToolbar'

// Bottom input bar. One action: Send. What Send does (submit to the agent vs type
// into a shell) is decided by the caller from the surface's agent, so there is no
// confusing mode toggle. For agent surfaces, typing "/" suggests slash commands.
export function InputBar({
  onSend,
  onKey,
  busy,
  placeholder,
  slashCommands,
}: {
  onSend: (text: string) => void
  onKey: (key: TerminalKey) => void
  busy: boolean
  placeholder: string
  slashCommands: string[]
}) {
  const [text, setText] = useState('')

  const firstWord = text.split(/\s/)[0]
  const suggestions =
    slashCommands.length > 0 && text.startsWith('/')
      ? slashCommands
          .filter((c) => c.startsWith(firstWord) && c !== text)
          .slice(0, 12)
      : []

  function submit(value = text) {
    const trimmed = value.trim()
    if (!trimmed) return
    onSend(value)
    setText('')
  }

  return (
    <div
      className="pad-bottom-safe sticky bottom-0 z-20"
      style={{
        background: 'color-mix(in oklab, var(--bg) 88%, transparent)',
        backdropFilter: 'blur(10px)',
        borderTop: '1px solid var(--border)',
      }}
    >
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-2 px-3 pt-2">
        <KeyToolbar onKey={onKey} disabled={busy} />

        {suggestions.length > 0 && (
          <div
            className="flex gap-1.5 overflow-x-auto pb-1"
            style={{ scrollbarWidth: 'none' }}
          >
            {suggestions.map((command) => (
              <button
                key={command}
                type="button"
                className="btn btn-key"
                style={{ flex: '0 0 auto' }}
                disabled={busy}
                onClick={() => submit(command)}
              >
                {command}
              </button>
            ))}
          </div>
        )}

        <div
          className="flex items-end gap-2 pl-3 pr-1.5 py-1.5"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border-strong)',
            borderRadius: 22,
          }}
        >
          <textarea
            rows={1}
            placeholder={placeholder}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                submit()
              }
            }}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="flex-1"
            style={{
              resize: 'none',
              maxHeight: 120,
              minHeight: 28,
              padding: '0.35rem 0',
              border: 0,
              outline: 'none',
              background: 'transparent',
              color: 'var(--text)',
              fontSize: '0.95rem',
              lineHeight: 1.4,
            }}
          />
          <button
            type="button"
            onClick={() => submit()}
            disabled={busy || !text.trim()}
            aria-label="Send"
            style={{
              flex: '0 0 auto',
              width: 36,
              height: 36,
              borderRadius: 999,
              border: 0,
              background: text.trim() ? 'var(--accent)' : 'var(--surface-2)',
              color: text.trim() ? 'var(--accent-ink)' : 'var(--muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: text.trim() ? 'pointer' : 'not-allowed',
              transition: 'background-color 120ms ease',
            }}
          >
            {busy ? <Loader2 size={18} className="spin" /> : <Send size={18} />}
          </button>
        </div>
      </div>
    </div>
  )
}
