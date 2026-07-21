import { getCookie } from '@tanstack/react-start/server'
import { isAuthRequired, verifyToken } from '#/infrastructure/auth/session'
import { getAuthConfig } from './container'

export interface SessionState {
  authed: boolean
  required: boolean
}

// Reads and verifies the session cookie in the current request context.
export function sessionState(): SessionState {
  const config = getAuthConfig()
  if (!isAuthRequired(config)) return { authed: true, required: false }
  const token = getCookie(config.cookieName)
  return { authed: token ? verifyToken(token, config) : false, required: true }
}

function parseCookie(header: string, name: string): string | undefined {
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=')
    if (key === name) return decodeURIComponent(rest.join('='))
  }
  return undefined
}

// Auth check straight from a Request, for streaming routes where the ambient
// request context is less reliable.
export function isAuthedFromRequest(request: Request): boolean {
  const config = getAuthConfig()
  if (!isAuthRequired(config)) return true
  const token = parseCookie(
    request.headers.get('cookie') ?? '',
    config.cookieName,
  )
  return token ? verifyToken(token, config) : false
}

export class UnauthorizedError extends Error {
  constructor() {
    super('Unauthorized')
    this.name = 'UnauthorizedError'
  }
}

// Guard for protected server functions. No route serves data unauthenticated.
export function requireAuth(): void {
  if (!sessionState().authed) throw new UnauthorizedError()
}
