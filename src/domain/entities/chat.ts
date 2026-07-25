// A chat message derived from the terminal transcript. cmux exposes no
// structured conversation, so roles are inferred from the rendered grid (see
// services/transcript). Each message carries its own resolved styling so colours
// survive history accumulation across snapshots (style tables are per-snapshot).
export type ChatRole = 'user' | 'agent' | 'tool' | 'status'

// Resolved span style. Semantics, not paint: the view maps these to the current
// theme. `color` is set only for a genuine terminal colour (default-foreground
// and plain-white text inherit the app's readable text colour instead). `code`
// marks a span the terminal shaded as inline code, so it renders as a chip.
// `background` carries a real colour fill (e.g. diff highlighting) only.
export interface ChatStyle {
  color?: string
  background?: string
  code?: boolean
  bold?: boolean
  faint?: boolean
  italic?: boolean
  underline?: boolean
  strike?: boolean
}

// A styled run of text; column gaps are baked in as unstyled space runs.
export interface ChatRun {
  text: string
  style?: ChatStyle
}

export type ChatLine = ChatRun[]

export interface ChatMessage {
  id: string
  role: ChatRole
  // Tool label (e.g. "Bash", "Read") shown as the card header, when known.
  label?: string
  // Styled lines for agent/tool; blank inner lines are kept as spacing.
  lines: ChatLine[]
  // Plain text join, used for the user bubble, status, and merge alignment.
  text: string
}

export interface Chat {
  messages: ChatMessage[]
}
