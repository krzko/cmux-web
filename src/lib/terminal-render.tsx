import type { CSSProperties, ReactNode } from 'react'
import type {
  TerminalLine,
  TerminalStyle,
} from '#/domain/entities/terminal-grid'

// Shared span rendering for the terminal and chat views: both draw cmux's render
// grid, so colour resolution lives here once.

// Resolve a span's style into CSS, honouring inverse/bold/faint/italic/decoration.
export function spanStyle(
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

// Rebuild a line from its spans, filling column gaps (blank cells cmux omits)
// with spaces so alignment matches the terminal.
export function renderLine(
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
