// A surface: a tab within a pane (terminal, browser, file preview). Maps from
// surface.list. Surfaces belong to panes, not directly to workspaces.
export interface Surface {
  ref: string
  id: string
  paneRef?: string
  kind: string // raw cmux type: terminal | browser | filepreview | ...
  title?: string
  focused: boolean
  selectedInPane: boolean
  index: number
  indexInPane: number
  // Agent bound to the surface (from resume_binding): kind e.g. "claude",
  // name e.g. "Claude Code". Absent for plain shells / non-agent surfaces.
  agentKind?: string
  agentName?: string
}

// A pane (split) and its ordered surfaces (tabs).
export interface PaneGroup {
  paneRef: string
  surfaces: Surface[]
}
