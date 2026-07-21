import type { TerminalKey } from '#/domain/entities/interaction'
import type { CmuxTarget, InteractionWriter } from '#/domain/ports/cmux-gateway'

// Send raw text to a target (no implicit Enter).
export async function sendText(
  writer: InteractionWriter,
  target: CmuxTarget,
  text: string,
): Promise<void> {
  await writer.sendText(target, text)
}

// Send a named key to a target.
export async function sendKey(
  writer: InteractionWriter,
  target: CmuxTarget,
  key: TerminalKey,
): Promise<void> {
  await writer.sendKey(target, key)
}

// Submit a prompt to the agent (types + submits, higher-level than send).
export async function submitPrompt(
  writer: InteractionWriter,
  workspaceRef: string,
  text: string,
): Promise<void> {
  await writer.submitPrompt(workspaceRef, text)
}
