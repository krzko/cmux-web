import {
  type PermissionDecision,
  type PlanDecision,
  permissionModeFor,
  planModeFor,
} from '#/domain/entities/interaction'
import type { FeedResponder } from '#/domain/ports/cmux-gateway'

// Answer a pending question with one or more selections.
export async function answerQuestion(
  responder: FeedResponder,
  requestId: string,
  selections: string[],
): Promise<void> {
  await responder.answerQuestion(requestId, selections)
}

// Approve/deny a permission prompt. UI decision maps to a concrete mode.
export async function replyPermission(
  responder: FeedResponder,
  requestId: string,
  decision: PermissionDecision,
): Promise<void> {
  await responder.replyPermission(requestId, permissionModeFor(decision))
}

// Accept/reject a proposed plan.
export async function replyPlan(
  responder: FeedResponder,
  requestId: string,
  decision: PlanDecision,
): Promise<void> {
  await responder.replyPlan(requestId, planModeFor(decision))
}
