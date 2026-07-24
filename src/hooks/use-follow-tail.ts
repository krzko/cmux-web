import { useCallback, useLayoutEffect, useRef, useState } from 'react'

// Keeps a scroll region pinned to the tail: opens at the bottom, auto-follows
// new content while the user is at the bottom, and exposes a jump-to-bottom flag
// once they scroll up. `dep` re-runs the follow on each new snapshot.
export function useFollowTail(dep: unknown) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const followRef = useRef(true)
  const [showJump, setShowJump] = useState(false)

  const onScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight
    const atBottom = distance < 40
    followRef.current = atBottom
    setShowJump(!atBottom)
  }, [])

  // biome-ignore lint/correctness/useExhaustiveDependencies: follow the tail on each new snapshot
  useLayoutEffect(() => {
    const el = scrollRef.current
    if (el && followRef.current) el.scrollTop = el.scrollHeight
  }, [dep])

  const jumpToBottom = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
    followRef.current = true
    setShowJump(false)
  }, [])

  return { scrollRef, showJump, onScroll, jumpToBottom }
}
