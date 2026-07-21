import { execFile } from 'node:child_process'
import type { CmuxConfig } from './config'

// Transport port: the one seam between our code and cmux. Swapping the CLI for
// a direct Unix-socket client later means implementing this interface only
// (OCP/DIP), with no change above the gateway.
export interface CmuxTransport {
  rpc<T = unknown>(method: string, params?: Record<string, unknown>): Promise<T>
  // Run a cmux wrapper subcommand (read-screen/send/send-key). Wrappers resolve
  // refs safely, unlike raw rpc which falls back to the focused surface.
  exec(args: string[]): Promise<string>
  ping(): Promise<boolean>
}

export class CmuxError extends Error {
  constructor(
    message: string,
    readonly method: string,
  ) {
    super(message)
    this.name = 'CmuxError'
  }
}

// Shells out to `cmux rpc`. The cmux binary owns socket framing + password auth,
// so we forward only the socket env. Never logs params or output (may contain
// secrets).
export class CmuxCliTransport implements CmuxTransport {
  constructor(private readonly config: CmuxConfig) {}

  private childEnv(): NodeJS.ProcessEnv {
    const env = { ...process.env }
    if (this.config.socketPath) env.CMUX_SOCKET_PATH = this.config.socketPath
    if (this.config.password) env.CMUX_SOCKET_PASSWORD = this.config.password
    return env
  }

  exec(args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      execFile(
        this.config.bin,
        args,
        {
          env: this.childEnv(),
          timeout: this.config.timeoutMs,
          maxBuffer: 8 * 1024 * 1024,
        },
        (error, stdout, stderr) => {
          if (error) {
            const detail = (stderr || stdout || error.message).toString().trim()
            reject(new CmuxError(detail, args[1] ?? args[0]))
            return
          }
          resolve(stdout.toString())
        },
      )
    })
  }

  async rpc<T = unknown>(
    method: string,
    params: Record<string, unknown> = {},
  ): Promise<T> {
    const out = await this.exec(['rpc', method, JSON.stringify(params)])
    const trimmed = out.trim()
    if (!trimmed) return undefined as T
    try {
      return JSON.parse(trimmed) as T
    } catch {
      throw new CmuxError('Non-JSON response from cmux', method)
    }
  }

  async ping(): Promise<boolean> {
    try {
      const out = await this.exec(['ping'])
      return out.trim().toUpperCase().includes('PONG')
    } catch {
      return false
    }
  }
}
