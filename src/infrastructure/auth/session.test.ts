import { describe, expect, it } from 'vitest'
import {
  type AuthConfig,
  checkPassword,
  createToken,
  isAuthRequired,
  loadAuthConfig,
  verifyToken,
} from './session'

function config(over: Partial<AuthConfig> = {}): AuthConfig {
  return {
    password: 'secret',
    secret: 'sign-key',
    ttlMs: 60_000,
    cookieName: 'cmux_session',
    secure: false,
    ...over,
  }
}

describe('loadAuthConfig / isAuthRequired', () => {
  it('requires auth only when APP_PASSWORD is set', () => {
    expect(isAuthRequired(loadAuthConfig({ APP_PASSWORD: 'p' }))).toBe(true)
    expect(isAuthRequired(loadAuthConfig({}))).toBe(false)
  })

  it('defaults the signing secret to the password', () => {
    expect(loadAuthConfig({ APP_PASSWORD: 'p' }).secret).toBe('p')
  })
})

describe('checkPassword', () => {
  it('accepts the exact password and rejects others', () => {
    expect(checkPassword('secret', config())).toBe(true)
    expect(checkPassword('nope', config())).toBe(false)
    expect(checkPassword('anything', config({ password: undefined }))).toBe(
      false,
    )
  })
})

describe('token sign / verify', () => {
  it('verifies a freshly minted token', () => {
    const token = createToken(config())
    expect(verifyToken(token, config())).toBe(true)
  })

  it('rejects a tampered token, wrong secret, garbage, and expiry', () => {
    const token = createToken(config())
    expect(verifyToken(`${token}x`, config())).toBe(false)
    expect(verifyToken(token, config({ secret: 'other' }))).toBe(false)
    expect(verifyToken('garbage', config())).toBe(false)
    expect(verifyToken(createToken(config({ ttlMs: -1000 })), config())).toBe(
      false,
    )
  })
})
