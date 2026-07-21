import { describe, expect, it } from 'vitest'
import { cleanTitle, relativeTime, shortCwd } from './format'

describe('cleanTitle', () => {
  it('strips a leading activity glyph', () => {
    expect(cleanTitle('✳ skylark-marketing-site')).toBe(
      'skylark-marketing-site',
    )
    expect(cleanTitle('⠐ Run code for testing')).toBe('Run code for testing')
  })

  it('leaves a plain title untouched', () => {
    expect(cleanTitle('Group 5')).toBe('Group 5')
  })

  it('never returns empty for a glyph-only title', () => {
    expect(cleanTitle('✳')).toBe('✳')
  })
})

describe('relativeTime', () => {
  const now = Date.parse('2026-07-21T12:00:00Z')
  it('formats seconds, minutes, hours and days', () => {
    expect(relativeTime('2026-07-21T11:59:30Z', now)).toBe('30s')
    expect(relativeTime('2026-07-21T11:57:00Z', now)).toBe('3m')
    expect(relativeTime('2026-07-21T09:00:00Z', now)).toBe('3h')
    expect(relativeTime('2026-07-18T12:00:00Z', now)).toBe('3d')
  })

  it('returns empty for missing or invalid input', () => {
    expect(relativeTime(undefined, now)).toBe('')
    expect(relativeTime('not-a-date', now)).toBe('')
  })
})

describe('shortCwd', () => {
  it('returns the last path segment', () => {
    expect(shortCwd('/Users/x/Code/repo')).toBe('repo')
    expect(shortCwd('/Users/x/Code/repo/')).toBe('repo')
    expect(shortCwd(undefined)).toBe('')
  })
})
