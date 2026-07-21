import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { listPending } from '#/application/use-cases/pending'
import type { FeedItem } from '#/domain/entities/feed'
import { requireAuth } from '../auth'
import { getGateway } from '../container'

// Interactive prompts awaiting a reply for a workspace.
export const fetchPending = createServerFn()
  .validator(z.object({ workspaceRef: z.string(), cwd: z.string().optional() }))
  .handler(async ({ data }): Promise<FeedItem[]> => {
    requireAuth()
    return listPending(getGateway(), data)
  })
