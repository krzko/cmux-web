// cmux connection config, read once from the server environment. The cmux CLI
// itself reads CMUX_SOCKET_PATH / CMUX_SOCKET_PASSWORD, so we only forward them
// and locate the binary (PATH is often bare when launched from a plist).
export interface CmuxConfig {
  bin: string
  socketPath?: string
  password?: string
  timeoutMs: number
}

const HOMEBREW_FALLBACK = '/opt/homebrew/bin/cmux'

export function loadCmuxConfig(
  env: NodeJS.ProcessEnv = process.env,
): CmuxConfig {
  return {
    bin: env.CMUX_BIN ?? HOMEBREW_FALLBACK,
    socketPath: env.CMUX_SOCKET_PATH,
    password: env.CMUX_SOCKET_PASSWORD,
    timeoutMs: Number(env.CMUX_RPC_TIMEOUT_MS ?? 8000),
  }
}
