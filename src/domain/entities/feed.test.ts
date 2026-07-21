import { describe, expect, it } from 'vitest'
import { type FeedItem, isInteractive } from './feed'

function feed(over: Partial<FeedItem>): FeedItem {
  return {
    id: 'f',
    kind: 'question',
    rawKind: 'question',
    source: 'claude',
    status: 'pending',
    resolved: false,
    createdAt: '',
    updatedAt: '',
    options: [],
    multiSelect: false,
    requestId: 'req-1',
    ...over,
  }
}

describe('isInteractive', () => {
  it('is true for an unresolved interactive item with a request id', () => {
    expect(isInteractive(feed({}))).toBe(true)
  })

  it('is false for activity, resolved, or request-less items', () => {
    expect(isInteractive(feed({ kind: 'activity' }))).toBe(false)
    expect(isInteractive(feed({ resolved: true }))).toBe(false)
    expect(isInteractive(feed({ requestId: undefined }))).toBe(false)
  })
})
