// Workspace group (sidebar folder). Maps from workspace.group.list.
// Membership is authoritative here via ordered memberRefs.
export interface Group {
  id: string
  ref: string
  name: string
  color?: string
  icon?: string
  collapsed: boolean
  pinned: boolean
  memberRefs: string[]
  anchorRef?: string
}
