import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import {
  listWorkspaceSurfaces,
  readTerminal,
  readTerminalGrid,
} from '#/application/use-cases/terminal'
import type { Surface } from '#/domain/entities/surface'
import type { TerminalSnapshot } from '#/domain/entities/terminal'
import type { TerminalGrid } from '#/domain/entities/terminal-grid'
import { requireAuth } from '../auth'
import { getGateway } from '../container'

const targetSchema = z.object({
  surfaceRef: z.string().optional(),
  workspaceRef: z.string().optional(),
  lines: z.number().int().positive().max(2000).optional(),
})

// Styled terminal grid (true colours) for the terminal view.
export const fetchTerminalGrid = createServerFn()
  .validator(
    z.object({
      surfaceRef: z.string().optional(),
      surfaceId: z.string().optional(),
      workspaceRef: z.string().optional(),
    }),
  )
  .handler(async ({ data }): Promise<TerminalGrid> => {
    requireAuth()
    return readTerminalGrid(getGateway(), data)
  })

// Fallback: plain terminal text with scrollback.
export const fetchTerminal = createServerFn()
  .validator(targetSchema)
  .handler(async ({ data }): Promise<TerminalSnapshot> => {
    requireAuth()
    return readTerminal(getGateway(), data)
  })

// Surfaces in a workspace, for pane/surface switching.
export const fetchSurfaces = createServerFn()
  .validator(z.object({ workspaceRef: z.string() }))
  .handler(async ({ data }): Promise<Surface[]> => {
    requireAuth()
    return listWorkspaceSurfaces(getGateway(), data.workspaceRef)
  })
