// A point-in-time terminal snapshot pulled via surface.read_text.
// Bulk text is always pulled, never streamed, per the events frame cap.
export interface TerminalSnapshot {
  surfaceRef: string
  workspaceRef?: string
  text: string
  fetchedAt: string
}
