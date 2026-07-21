import { describe, expect, it } from 'vitest'
import { AGENT_PROFILES, isAgentBound, resolveAgent } from './agent-registry'

describe('agent-registry', () => {
  it('resolves recognised agents by resume_binding kind', () => {
    expect(resolveAgent('claude')?.name).toBe('Claude Code')
    expect(resolveAgent('codex')?.id).toBe('codex')
    expect(resolveAgent('opencode')?.id).toBe('opencode')
    expect(resolveAgent('gemini')?.id).toBe('gemini')
    expect(resolveAgent('grok')?.id).toBe('grok')
    expect(resolveAgent('kiro')?.id).toBe('kiro')
    expect(resolveAgent('pi')?.id).toBe('pi')
  })

  it('returns undefined for unknown or missing kinds', () => {
    expect(resolveAgent('not-an-agent')).toBeUndefined()
    expect(resolveAgent(undefined)).toBeUndefined()
  })

  it('isAgentBound reflects presence of a kind', () => {
    expect(isAgentBound('claude')).toBe(true)
    expect(isAgentBound(undefined)).toBe(false)
  })

  it('every profile has a kind and slash commands look like commands', () => {
    for (const profile of AGENT_PROFILES) {
      expect(profile.kinds.length).toBeGreaterThan(0)
      expect(profile.slashCommands.every((c) => c.startsWith('/'))).toBe(true)
    }
  })
})
