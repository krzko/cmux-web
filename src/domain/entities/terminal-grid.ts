// A styled terminal snapshot from terminal.replay (cmux.render-grid.v1). Unlike
// read_text this preserves true colours, so the web view matches the native
// cmux terminal. Colours are already resolved to hex by cmux.
export interface TerminalStyle {
  fg: string
  bg: string
  bold: boolean
  faint: boolean
  italic: boolean
  underline: boolean
  strike: boolean
  inverse: boolean
}

export interface TerminalSpan {
  col: number // start column; gaps between spans are blank cells (spaces)
  width: number // columns this span occupies (cell_width)
  text: string
  style: number // index into TerminalGrid.styles
}

export type TerminalLine = TerminalSpan[]

export interface TerminalGrid {
  surfaceRef: string
  columns: number
  background: string
  foreground: string
  styles: TerminalStyle[]
  // Scrollback rows first, then the visible viewport; each row sorted by column.
  lines: TerminalLine[]
  fetchedAt: string
}
