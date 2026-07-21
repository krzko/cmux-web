import type { Surface } from '#/domain/entities/surface'
import type { TerminalSnapshot } from '#/domain/entities/terminal'
import type { TerminalGrid } from '#/domain/entities/terminal-grid'
import type {
  CmuxTarget,
  TerminalReader,
  WorkspaceReader,
} from '#/domain/ports/cmux-gateway'

export interface ReadTerminalInput {
  surfaceRef?: string
  workspaceRef?: string
  lines?: number
}

// Read live terminal text with scrollback. Defaults to a generous window.
export async function readTerminal(
  reader: TerminalReader,
  input: ReadTerminalInput,
): Promise<TerminalSnapshot> {
  return reader.readText({
    surfaceRef: input.surfaceRef,
    workspaceRef: input.workspaceRef,
    lines: input.lines ?? 400,
    scrollback: true,
  })
}

// Styled terminal grid (true colours) for the terminal view.
export async function readTerminalGrid(
  reader: TerminalReader,
  target: CmuxTarget,
): Promise<TerminalGrid> {
  return reader.readGrid(target)
}

// Surfaces available in a workspace, for pane/surface switching.
export async function listWorkspaceSurfaces(
  reader: WorkspaceReader,
  workspaceRef: string,
): Promise<Surface[]> {
  return reader.listSurfaces(workspaceRef)
}
