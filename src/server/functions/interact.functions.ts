import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { sendKey, sendText, submitPrompt } from '#/application/use-cases/nudge'
import {
  answerQuestion,
  replyPermission,
  replyPlan,
} from '#/application/use-cases/respond'
import { TERMINAL_KEYS } from '#/domain/entities/interaction'
import { requireAuth } from '../auth'
import { getGateway } from '../container'

const target = z.object({
  surfaceRef: z.string().optional(),
  workspaceRef: z.string().optional(),
})

// Send text to a target surface/workspace.
export const postText = createServerFn({ method: 'POST' })
  .validator(z.object({ target, text: z.string() }))
  .handler(async ({ data }) => {
    requireAuth()
    await sendText(getGateway(), data.target, data.text)
    return { ok: true }
  })

// Send a named key.
export const postKey = createServerFn({ method: 'POST' })
  .validator(z.object({ target, key: z.enum(TERMINAL_KEYS) }))
  .handler(async ({ data }) => {
    requireAuth()
    await sendKey(getGateway(), data.target, data.key)
    return { ok: true }
  })

// Submit an agent prompt.
export const postPrompt = createServerFn({ method: 'POST' })
  .validator(z.object({ workspaceRef: z.string(), text: z.string().min(1) }))
  .handler(async ({ data }) => {
    requireAuth()
    await submitPrompt(getGateway(), data.workspaceRef, data.text)
    return { ok: true }
  })

// Answer a pending question.
export const postAnswer = createServerFn({ method: 'POST' })
  .validator(
    z.object({ requestId: z.string(), selections: z.array(z.string()).min(1) }),
  )
  .handler(async ({ data }) => {
    requireAuth()
    await answerQuestion(getGateway(), data.requestId, data.selections)
    return { ok: true }
  })

// Approve/deny a permission prompt.
export const postPermission = createServerFn({ method: 'POST' })
  .validator(
    z.object({ requestId: z.string(), decision: z.enum(['approve', 'deny']) }),
  )
  .handler(async ({ data }) => {
    requireAuth()
    await replyPermission(getGateway(), data.requestId, data.decision)
    return { ok: true }
  })

// Accept/reject a plan.
export const postPlan = createServerFn({ method: 'POST' })
  .validator(
    z.object({ requestId: z.string(), decision: z.enum(['accept', 'reject']) }),
  )
  .handler(async ({ data }) => {
    requireAuth()
    await replyPlan(getGateway(), data.requestId, data.decision)
    return { ok: true }
  })
