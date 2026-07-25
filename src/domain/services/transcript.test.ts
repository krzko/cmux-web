import { describe, expect, it } from 'vitest'
import type {
  TerminalGrid,
  TerminalLine,
  TerminalStyle,
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

  it('splits prose into separate messages on a blank line', () => {
    const chat = toChat(grid(['  para one', '', '  para two']))
    expect(chat.messages).toHaveLength(2)
    expect(chat.messages.map((m) => m.text)).toEqual(['para one', 'para two'])
  })

  it('keeps blank lines inside a code card instead of splitting it', () => {
    const chat = toChat(grid(['● Bash(git log)', '  ⎿ first', '', '  second']))
    expect(chat.messages).toHaveLength(1)
    expect(chat.messages[0].role).toBe('tool')
    expect(chat.messages[0].text).toContain('first')
    expect(chat.messages[0].text).toContain('second')
  })

  it('reflows wrapped rows into one paragraph but keeps short lines apart', () => {
    // Width 80: a row reaching the right edge continues; short rows do not.
    const wrapped = `${'wrapped prose that reaches the far right edge of the terminal here x'.padEnd(76, 'x')}`
    const chat = toChat(
      grid([
        wrapped,
        'and the tail.',
        '',
        'a short line',
        'another short line',
      ]),
    )
    expect(chat.messages).toHaveLength(2)
    // First message: wrapped row + its continuation joined into one paragraph.
    expect(chat.messages[0].lines).toHaveLength(1)
    expect(chat.messages[0].text).toContain('and the tail.')
    // Second message: short, non-filling rows stay separate lines.
    expect(chat.messages[1].lines).toHaveLength(2)
    expect(chat.messages[1].text).toBe('a short line\nanother short line')
  })

  it('dedents tool output so code cards start at column zero', () => {
    const chat = toChat(grid(['● Bash(ls)', '      alpha', '        beta']))
    expect(chat.messages[0].role).toBe('tool')
    expect(chat.messages[0].text).toBe('Bash(ls)\nalpha\n  beta')
  })

  it('does not join distinct shell output lines (fallback)', () => {
    const chat = toChat(grid(['just some', 'plain shell', 'output here']))
    expect(chat.messages).toHaveLength(1)
    expect(chat.messages[0].role).toBe('agent')
    expect(chat.messages[0].lines).toHaveLength(3)
  })
})

// A grid whose single line carries one span using style id 1.
function styledGrid(style: Partial<TerminalStyle>): TerminalGrid {
  const base: TerminalStyle = {
    fg: '#FFFFFF',
    bg: '#1E1E1E',
    bold: false,
    faint: false,
    italic: false,
    underline: false,
    strike: false,
    inverse: false,
  }
  return {
    surfaceRef: 's',
    columns: 80,
    background: '#1E1E1E',
    foreground: '#FFFFFF',
    styles: [base, { ...base, ...style }],
    lines: [[{ col: 0, width: 5, text: 'hello', style: 1 }]],
    fetchedAt: '2026-07-24T00:00:00.000Z',
  }
}
const firstStyle = (g: TerminalGrid) => toChat(g).messages[0].lines[0][0].style

describe('toChat styling', () => {
  it('inherits the app colour for default foreground', () => {
    expect(firstStyle(styledGrid({ fgDefault: true }))?.color).toBeUndefined()
  })

  it('inherits the app colour for explicitly white text', () => {
    // Plain white reads as default text on a terminal, so it must not be
    // painted white onto a light surface.
    const style = firstStyle(styledGrid({ fg: '#FFFFFF', fgDefault: false }))
    expect(style?.color).toBeUndefined()
  })

  it('keeps a genuine terminal colour', () => {
    expect(
      firstStyle(styledGrid({ fg: '#B1B9F9', fgDefault: false }))?.color,
    ).toBe('#B1B9F9')
  })

  it('marks a shaded background as inline code, not a colour fill', () => {
    const style = firstStyle(styledGrid({ bg: '#373737', bgDefault: false }))
    expect(style?.code).toBe(true)
    expect(style?.background).toBeUndefined()
  })

  it('keeps a coloured background as a fill (diff highlighting)', () => {
    const style = firstStyle(styledGrid({ bg: '#2E5D33', bgDefault: false }))
    expect(style?.background).toBe('#2E5D33')
    expect(style?.code).toBeUndefined()
  })

  it('carries bold, italic, underline, strike, and faint', () => {
    const style = firstStyle(
      styledGrid({
        bold: true,
        italic: true,
        underline: true,
        strike: true,
        faint: true,
      }),
    )
    expect(style).toMatchObject({
      bold: true,
      italic: true,
      underline: true,
      strike: true,
      faint: true,
    })
  })

  it('swaps foreground and background on inverse', () => {
    const style = firstStyle(
      styledGrid({ inverse: true, fgDefault: true, bgDefault: true }),
    )
    // Default bg becomes the text colour; the default fg becomes a shaded chip.
    expect(style?.code).toBe(true)
  })

  it('falls back to hex comparison when cmux sends no source flags', () => {
    expect(firstStyle(styledGrid({ fg: '#FFFFFF' }))?.color).toBeUndefined()
    expect(firstStyle(styledGrid({ fg: '#26A439' }))?.color).toBe('#26A439')
  })
})
