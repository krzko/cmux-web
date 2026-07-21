import { describe, expect, it } from 'vitest'
import {
  PERMISSION_MODES,
  PLAN_MODES,
  permissionModeFor,
  planModeFor,
} from './interaction'

describe('interaction decisions map to cmux modes', () => {
  it('permission approve/deny', () => {
    expect(permissionModeFor('approve')).toBe('once')
    expect(permissionModeFor('deny')).toBe('deny')
    expect(PERMISSION_MODES).toContain(permissionModeFor('approve'))
  })

  it('plan accept/reject', () => {
    expect(planModeFor('accept')).toBe('autoAccept')
    expect(planModeFor('reject')).toBe('deny')
    expect(PLAN_MODES).toContain(planModeFor('accept'))
  })
})
