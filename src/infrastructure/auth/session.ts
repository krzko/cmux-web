import { createHmac, timingSafeEqual } from 'node:crypto'

// App auth gate. A shared secret unlocks a short signed cookie. When
// APP_PASSWORD is unset the gate is disabled for local dev; the operator MUST
// set it before exposing the app on the tailnet.
export interface AuthConfig {
  password?: string
  secret: string
  ttlMs: number
  cookieName: string
  secure: boolean
}

const DAY_MS = 24 * 60 * 60 * 1000

export function loadAuthConfig(
  env: NodeJS.ProcessEnv = process.env,
): AuthConfig {
  const password = env.APP_PASSWORD || undefined
  return {
    password,
    secret: env.APP_SESSION_SECRET || password || 'cmux-web-dev-secret',
    ttlMs: Number(env.APP_SESSION_TTL_DAYS ?? 30) * DAY_MS,
    cookieName: 'cmux_session',
    secure: env.NODE_ENV === 'production',
  }
}

export function isAuthRequired(config: AuthConfig): boolean {
  return Boolean(config.password)
}

function b64url(input: string): string {
  return Buffer.from(input).toString('base64url')
}

function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url')
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a)
  const bb = Buffer.from(b)
  return ba.length === bb.length && timingSafeEqual(ba, bb)
}

// Constant-time password check.
export function checkPassword(input: string, config: AuthConfig): boolean {
  return Boolean(config.password) && safeEqual(input, config.password!)
}

// Mint a signed token: base64url(payload).signature, payload = { exp }.
export function createToken(config: AuthConfig): string {
  const payload = b64url(JSON.stringify({ exp: Date.now() + config.ttlMs }))
  return `${payload}.${sign(payload, config.secret)}`
}

export function verifyToken(token: string, config: AuthConfig): boolean {
  const dot = token.lastIndexOf('.')
  if (dot <= 0) return false
  const payload = token.slice(0, dot)
  const signature = token.slice(dot + 1)
  if (!safeEqual(signature, sign(payload, config.secret))) return false
  try {
    const { exp } = JSON.parse(Buffer.from(payload, 'base64url').toString())
    return typeof exp === 'number' && exp > Date.now()
  } catch {
    return false
  }
}
