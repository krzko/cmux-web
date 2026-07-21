import { type ChildProcessWithoutNullStreams, spawn } from 'node:child_process'
import type {
  CmuxEvent,
  EventListener,
  EventsSource,
} from '#/domain/ports/events-source'
import type { CmuxConfig } from './config'

type Raw = Record<string, unknown>

function str(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined
}

// Normalise a raw NDJSON frame. Refs may live at the top level or nested under
// data/payload depending on the event, so we probe both.
function toEvent(frame: Raw): CmuxEvent {
  const data = ((frame.data ?? frame.payload) as Raw | undefined) ?? {}
  return {
    seq: typeof frame.seq === 'number' ? frame.seq : undefined,
    id: str(frame.id),
    name: str(frame.name ?? frame.event),
    category: str(frame.category),
    workspaceRef: str(frame.workspace_ref ?? data.workspace_ref),
    surfaceRef: str(frame.surface_ref ?? data.surface_ref),
  }
}

// Single long-lived subscription to `cmux events`, fanned out to browser
// clients. cmux --reconnect resumes by seq; we also relaunch if the child dies.
export class CmuxEventsSource implements EventsSource {
  private child?: ChildProcessWithoutNullStreams
  private readonly listeners = new Set<EventListener>()
  private buffer = ''
  private closed = false

  constructor(
    private readonly config: CmuxConfig,
    private readonly cursorFile?: string,
  ) {}

  subscribe(listener: EventListener): () => void {
    this.listeners.add(listener)
    this.ensureStarted()
    return () => this.listeners.delete(listener)
  }

  close(): void {
    this.closed = true
    this.child?.kill()
    this.child = undefined
    this.listeners.clear()
  }

  private ensureStarted(): void {
    if (this.child || this.closed) return

    const env = { ...process.env }
    if (this.config.socketPath) env.CMUX_SOCKET_PATH = this.config.socketPath
    if (this.config.password) env.CMUX_SOCKET_PASSWORD = this.config.password

    const args = ['events', '--reconnect', '--no-heartbeat']
    if (this.cursorFile) args.push('--cursor-file', this.cursorFile)

    const child = spawn(this.config.bin, args, { env })
    this.child = child

    child.stdout.setEncoding('utf8')
    child.stdout.on('data', (chunk: string) => this.onData(chunk))
    child.on('exit', () => {
      this.child = undefined
      // Relaunch on unexpected exit while clients remain.
      if (!this.closed && this.listeners.size > 0) {
        setTimeout(() => this.ensureStarted(), 1000)
      }
    })
  }

  private onData(chunk: string): void {
    this.buffer += chunk
    const lines = this.buffer.split('\n')
    this.buffer = lines.pop() ?? ''
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue
      try {
        const event = toEvent(JSON.parse(trimmed) as Raw)
        for (const listener of this.listeners) listener(event)
      } catch {
        // Ignore malformed frames rather than tearing down the stream.
      }
    }
  }
}
