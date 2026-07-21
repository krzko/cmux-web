// Central query-key registry so components and the event stream invalidate the
// same cache slices (SRP: one source of truth for keys).
export const queryKeys = {
  triage: ['triage'] as const,
  health: ['health'] as const,
  terminal: (ref: string) => ['terminal', ref] as const,
  surfaces: (ref: string) => ['surfaces', ref] as const,
  pending: (ref: string) => ['pending', ref] as const,
}
