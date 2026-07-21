import { createServerFn } from '@tanstack/react-start'
import { getTriageView } from '#/application/use-cases/triage'
import type { TriageView } from '#/domain/services/triage'
import { requireAuth } from '../auth'
import { getGateway } from '../container'

// The list-view snapshot. Auth-guarded; never served unauthenticated.
export const fetchTriage = createServerFn().handler(
  async (): Promise<TriageView> => {
    requireAuth()
    return getTriageView(getGateway())
  },
)

// Connectivity check for the disconnected-state UI.
export const fetchHealth = createServerFn().handler(
  async (): Promise<{ ok: boolean }> => {
    requireAuth()
    return { ok: await getGateway().ping() }
  },
)
