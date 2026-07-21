import type { AgentProfile } from '../entities/agent'

// Recognized agents and a curated subset of their native slash commands, sourced
// from each agent's official docs/repo (2026-07). cmux cannot enumerate commands,
// so this is a focused set for remote triage; any command can still be typed.
// Ids/kinds follow cmux's hook source names (see `cmux hooks`). Add an agent by
// appending a profile here only (open for extension, closed for modification).
export const AGENT_PROFILES: AgentProfile[] = [
  {
    id: 'claude',
    name: 'Claude Code',
    kinds: ['claude'],
    slashCommands: [
      '/clear',
      '/compact',
      '/context',
      '/cost',
      '/model',
      '/resume',
      '/review',
      '/status',
      '/todos',
      '/agents',
      '/config',
      '/help',
    ],
  },
  {
    id: 'codex',
    name: 'Codex',
    kinds: ['codex'],
    slashCommands: [
      '/clear',
      '/new',
      '/compact',
      '/diff',
      '/model',
      '/permissions',
      '/status',
      '/usage',
      '/review',
      '/init',
      '/resume',
      '/plan',
      '/mcp',
      '/help',
    ],
  },
  {
    id: 'opencode',
    name: 'OpenCode',
    kinds: ['opencode'],
    slashCommands: [
      '/new',
      '/compact',
      '/share',
      '/unshare',
      '/export',
      '/models',
      '/themes',
      '/init',
      '/undo',
      '/redo',
      '/sessions',
      '/details',
      '/help',
    ],
  },
  {
    id: 'gemini',
    name: 'Gemini CLI',
    kinds: ['gemini'],
    slashCommands: [
      '/clear',
      '/compress',
      '/chat',
      '/memory',
      '/tools',
      '/mcp',
      '/stats',
      '/settings',
      '/init',
      '/copy',
      '/restore',
      '/help',
    ],
  },
  {
    id: 'grok',
    name: 'Grok',
    kinds: ['grok'],
    slashCommands: [
      '/new',
      '/compact',
      '/model',
      '/context',
      '/rewind',
      '/resume',
      '/sessions',
      '/fork',
      '/share',
      '/plan',
      '/usage',
      '/agents',
      '/settings',
      '/help',
    ],
  },
  {
    id: 'amp',
    name: 'Amp',
    kinds: ['amp'],
    slashCommands: [
      '/agent',
      '/compact',
      '/editor',
      '/permissions',
      '/help',
      '/quit',
    ],
  },
  {
    id: 'cursor',
    name: 'Cursor',
    kinds: ['cursor'],
    slashCommands: [
      '/model',
      '/plan',
      '/ask',
      '/clear',
      '/resume',
      '/fork',
      '/summarize',
      '/rewind',
      '/max-mode',
      '/mcp',
      '/config',
      '/help',
    ],
  },
  {
    id: 'copilot',
    name: 'Copilot CLI',
    kinds: ['copilot'],
    slashCommands: [
      '/clear',
      '/session',
      '/usage',
      '/model',
      '/add-dir',
      '/agent',
      '/delegate',
      '/share',
      '/mcp',
      '/user',
      '/help',
    ],
  },
  {
    id: 'pi',
    name: 'Pi',
    kinds: ['pi'],
    slashCommands: [
      '/new',
      '/model',
      '/resume',
      '/session',
      '/compact',
      '/copy',
      '/export',
      '/share',
      '/fork',
      '/settings',
      '/tree',
      '/quit',
    ],
  },
  {
    id: 'kiro',
    name: 'Kiro',
    kinds: ['kiro'],
    slashCommands: [
      '/clear',
      '/context',
      '/model',
      '/agent',
      '/plan',
      '/compact',
      '/save',
      '/load',
      '/tools',
      '/usage',
      '/mcp',
      '/todos',
      '/rewind',
      '/help',
    ],
  },
]

// Kind -> profile index, built once. Aliases collapse to the same profile.
const BY_KIND = new Map<string, AgentProfile>()
for (const profile of AGENT_PROFILES) {
  for (const kind of profile.kinds) BY_KIND.set(kind, profile)
}

// The recognized agent for a surface's resume_binding.kind, if any.
export function resolveAgent(kind?: string): AgentProfile | undefined {
  return kind ? BY_KIND.get(kind) : undefined
}

// True when any agent is bound to the surface, recognized or not (a plain shell
// has no resume_binding.kind).
export function isAgentBound(kind?: string): boolean {
  return Boolean(kind)
}
