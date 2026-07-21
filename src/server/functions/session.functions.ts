import { createServerFn } from '@tanstack/react-start'
import { deleteCookie, setCookie } from '@tanstack/react-start/server'
import { z } from 'zod'
import { checkPassword, createToken } from '#/infrastructure/auth/session'
import { type SessionState, sessionState } from '../auth'
import { getAuthConfig } from '../container'

// Current auth state, used by route guards and the login screen.
export const getSession = createServerFn().handler((): SessionState => {
  return sessionState()
})

// Login gate. Sets an httpOnly signed cookie on success.
export const login = createServerFn({ method: 'POST' })
  .validator(z.object({ password: z.string().min(1) }))
  .handler(({ data }): { ok: boolean } => {
    const config = getAuthConfig()
    if (!checkPassword(data.password, config)) return { ok: false }
    setCookie(config.cookieName, createToken(config), {
      httpOnly: true,
      sameSite: 'lax',
      secure: config.secure,
      path: '/',
      maxAge: Math.floor(config.ttlMs / 1000),
    })
    return { ok: true }
  })

export const logout = createServerFn({ method: 'POST' }).handler(
  (): { ok: boolean } => {
    deleteCookie(getAuthConfig().cookieName, { path: '/' })
    return { ok: true }
  },
)
