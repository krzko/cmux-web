// A normalised cmux event. The stream signals that something changed; bulk
// data is pulled afterwards. category/name drive invalidation.
export interface CmuxEvent {
  seq?: number
  id?: string
  name?: string
  category?: string
  workspaceRef?: string
  surfaceRef?: string
}

export type EventListener = (event: CmuxEvent) => void

// Long-lived source over `cmux events`. Auto-reconnects and resumes by seq.
export interface EventsSource {
  subscribe(listener: EventListener): () => void
  close(): void
}
