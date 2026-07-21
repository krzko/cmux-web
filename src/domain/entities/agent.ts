// A recognized coding agent and its terminal slash commands. A surface is
// matched to a profile by its resume_binding.kind. Adding support for a new
// agent means adding a profile (open for extension, closed for modification).
export interface AgentProfile {
  id: string
  name: string
  // resume_binding.kind values that identify this agent (including aliases).
  kinds: string[]
  slashCommands: string[]
}
