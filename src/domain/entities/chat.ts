import type { TerminalLine } from './terminal-grid'

// A chat message derived from the terminal transcript. cmux exposes no
// structured conversation, so roles are inferred from the rendered grid (see
// services/transcript). Styled spans are kept so the chat view shows the same
// true colours as the terminal.
export type ChatRole = 'user' | 'agent' | 'tool' | 'status'

export interface ChatMessage {
  id: string
  role: ChatRole
  // Tool label (e.g. "Bash", "Read") shown as the card header, when known.
  label?: string
  // Styled lines for agent/tool/status; blank inner lines are kept as spacing.
  lines: TerminalLine[]
  // Plain text join, used to render the user bubble and for redaction.
  text: string
}

export interface Chat {
  messages: ChatMessage[]
}
