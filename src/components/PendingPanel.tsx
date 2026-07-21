import { Bell, Check, ShieldCheck, X } from 'lucide-react'
import { useState } from 'react'
import type { FeedItem } from '#/domain/entities/feed'
import { Redactable } from './Redactable'

// Interactive prompts for the workspace. Approving a permission
// takes two taps (no accidental destructive approvals).
export function PendingPanel({
  items,
  busy,
  onAnswer,
  onPermission,
  onPlan,
}: {
  items: FeedItem[]
  busy: boolean
  onAnswer: (requestId: string, selection: string) => void
  onPermission: (requestId: string, decision: 'approve' | 'deny') => void
  onPlan: (requestId: string, decision: 'accept' | 'reject') => void
}) {
  if (items.length === 0) return null
  return (
    <div
      className="flex shrink-0 flex-col gap-2 overflow-y-auto"
      style={{ maxHeight: '45vh' }}
    >
      {items.map((item) => (
        <div
          key={item.id}
          className="card flex flex-col gap-3 p-3"
          style={{ borderColor: 'var(--status-needs)' }}
        >
          <div
            className="flex items-center gap-2 text-sm font-semibold"
            style={{ color: 'var(--status-needs)' }}
          >
            <Bell size={15} />
            {labelFor(item)}
          </div>
          {item.prompt && (
            <Redactable>
              <p className="text-sm" style={{ color: 'var(--text)' }}>
                {item.prompt}
              </p>
            </Redactable>
          )}
          <Actions
            item={item}
            busy={busy}
            onAnswer={onAnswer}
            onPermission={onPermission}
            onPlan={onPlan}
          />
        </div>
      ))}
    </div>
  )
}

function labelFor(item: FeedItem): string {
  if (item.kind === 'question') return 'Question'
  if (item.kind === 'permission') return 'Permission request'
  if (item.kind === 'exit_plan') return 'Plan review'
  return 'Needs input'
}

function Actions({
  item,
  busy,
  onAnswer,
  onPermission,
  onPlan,
}: {
  item: FeedItem
  busy: boolean
  onAnswer: (requestId: string, selection: string) => void
  onPermission: (requestId: string, decision: 'approve' | 'deny') => void
  onPlan: (requestId: string, decision: 'accept' | 'reject') => void
}) {
  const [confirming, setConfirming] = useState(false)
  const id = item.requestId!

  if (item.kind === 'question') {
    if (item.options.length === 0) {
      return (
        <p className="text-xs" style={{ color: 'var(--muted)' }}>
          Reply inline below (type an answer and send).
        </p>
      )
    }
    return (
      <div className="flex flex-col gap-2">
        {item.options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className="btn flex-col items-start"
            style={{
              height: 'auto',
              padding: '0.6rem 0.85rem',
              alignItems: 'flex-start',
            }}
            disabled={busy}
            onClick={() => onAnswer(id, opt.value)}
          >
            <span className="font-semibold">{opt.label}</span>
            {opt.description && (
              <span
                className="text-xs font-normal"
                style={{ color: 'var(--muted)' }}
              >
                {opt.description}
              </span>
            )}
          </button>
        ))}
      </div>
    )
  }

  if (item.kind === 'permission') {
    return (
      <div className="flex flex-wrap gap-2">
        {confirming ? (
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy}
            onClick={() => onPermission(id, 'approve')}
          >
            <ShieldCheck size={16} /> Confirm approve
          </button>
        ) : (
          <button
            type="button"
            className="btn"
            disabled={busy}
            onClick={() => setConfirming(true)}
          >
            <Check size={16} /> Approve
          </button>
        )}
        <button
          type="button"
          className="btn btn-danger"
          disabled={busy}
          onClick={() => onPermission(id, 'deny')}
        >
          <X size={16} /> Deny
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        className="btn btn-primary"
        disabled={busy}
        onClick={() => onPlan(id, 'accept')}
      >
        <Check size={16} /> Accept plan
      </button>
      <button
        type="button"
        className="btn btn-danger"
        disabled={busy}
        onClick={() => onPlan(id, 'reject')}
      >
        <X size={16} /> Reject
      </button>
    </div>
  )
}
