import { describe, expect, it } from 'vitest'
import type {
  TerminalGrid,
  TerminalLine,
} from '#/domain/entities/terminal-grid'
import { lineText, toChat } from './transcript'

// One unstyled span per line at column 0; enough to exercise role inference.
function line(text: string): TerminalLine {
  return text === '' ? [] : [{ col: 0, width: text.length, text, style: 0 }]
}
function grid(lines: string[]): TerminalGrid {
  return {
    surfaceRef: 's',
    columns: 80,
    background: '#000',
    foreground: '#fff',
    styles: [],
    lines: lines.map(line),
    fetchedAt: '2026-07-24T00:00:00.000Z',
  }
}

describe('lineText', () => {
  it('fills column gaps with spaces and trims the tail', () => {
    const l: TerminalLine = [
      { col: 2, width: 2, text: 'hi', style: 0 },
      { col: 6, width: 5, text: 'there', style: 0 },
    ]
    expect(lineText(l)).toBe('  hi  there')
  })
})

describe('toChat', () => {
  it('returns no messages for an empty grid', () => {
    expect(toChat(undefined).messages).toEqual([])
    expect(toChat(grid([])).messages).toEqual([])
  })

  it('classifies user, agent, and tool blocks', () => {
    const chat = toChat(
      grid([
        '> fix the build',
        '',
        '  I will run the tests now.',
        '',
        '● Bash(pnpm test)',
        '  ⎿ 41 passed',
      ]),
    )
    const roles = chat.messages.map((m) => m.role)
    expect(roles).toEqual(['user', 'agent', 'tool'])
    expect(chat.messages[0].text).toBe('fix the build')
    expect(chat.messages[1].text).toContain('I will run the tests now.')
    expect(chat.messages[2].label).toBe('Bash')
    expect(chat.messages[2].text).toContain('41 passed')
  })

  it('strips the trailing input box and status footer', () => {
    const chat = toChat(
      grid([
        '  Done, pushed to main.',
        '',
        '────────────────────────────',
        '❯ ',
        '────────────────────────────',
        '  github.com/acme/app · ⎇ main · Opus 4.8 (1M context) · xhigh · ctx 48%',
        '  ⏵⏵ bypass permissions on (shift+tab to cycle)',
      ]),
    )
    expect(chat.messages).toHaveLength(1)
    expect(chat.messages[0].role).toBe('agent')
    expect(chat.messages[0].text).toContain('Done, pushed to main.')
    const joined = chat.messages.map((m) => m.text).join('\n')
    expect(joined).not.toContain('bypass permissions')
    expect(joined).not.toContain('ctx 48%')
  })

  it('treats a plain bullet as agent prose but Name(...) as a tool', () => {
    const chat = toChat(
      grid([
        '⏺ Pushed to origin/main, tracking set.',
        '  Now verifying the deploy.',
        '⏺ Bash(git status)',
        '  ⎿ clean',
      ]),
    )
    expect(chat.messages.map((m) => m.role)).toEqual(['agent', 'tool'])
    expect(chat.messages[0].text).toContain('Pushed to origin/main')
    expect(chat.messages[0].text).toContain('Now verifying the deploy.')
    expect(chat.messages[1].label).toBe('Bash')
    expect(chat.messages[1].text).toContain('clean')
  })

  it('splits consecutive bullets into separate agent bubbles', () => {
    const chat = toChat(grid(['⏺ First point.', '⏺ Second point.']))
    expect(chat.messages).toHaveLength(2)
    expect(chat.messages.every((m) => m.role === 'agent')).toBe(true)
  })

  it('captures a status line as its own message', () => {
    const chat = toChat(grid(['✻ Crunched for 5m 11s', '  All set.']))
    expect(chat.messages[0].role).toBe('status')
    expect(chat.messages[0].text).toBe('Crunched for 5m 11s')
    expect(chat.messages[1].role).toBe('agent')
  })

  it('keeps a single inner blank line as spacing within a message', () => {
    const chat = toChat(grid(['  para one', '', '  para two']))
    expect(chat.messages).toHaveLength(1)
    expect(chat.messages[0].lines).toHaveLength(3)
    expect(chat.messages[0].text).toBe('  para one\n\n  para two')
  })

  it('falls back to one agent bubble when no markers are present', () => {
    const chat = toChat(grid(['just some', 'plain shell', 'output here']))
    expect(chat.messages).toHaveLength(1)
    expect(chat.messages[0].role).toBe('agent')
    expect(chat.messages[0].lines).toHaveLength(3)
  })
})
