import type { ChatMessage } from '#/domain/entities/chat'

// cmux exposes only the current screen for alternate-screen agents (no terminal
// scrollback), so the chat view accumulates history across polls. Each snapshot
// is a contiguous window of the true transcript, so successive frames overlap;
// this merges a fresh snapshot into the accumulated history by aligning that
// overlap. Pure and framework-free so it is unit-tested.

const MAX_HISTORY = 3000

const norm = (t: string) => t.trim().replace(/\s+/g, ' ')

// Two messages are the same transcript entry if their text is equal, one is a
// growing prefix of the other (streaming), or one is a scrolled suffix of the
// other (its top scrolled off). Short texts must match exactly to avoid aligning
// on coincidental fragments.
function compat(a: ChatMessage, b: ChatMessage): boolean {
  if (a.role !== b.role) return false
  const x = norm(a.text)
  const y = norm(b.text)
  if (x === y) return true
  if (Math.min(x.length, y.length) < 6) return false
  return x.startsWith(y) || y.startsWith(x) || x.endsWith(y) || y.endsWith(x)
}

function fuller(a: ChatMessage, b: ChatMessage): ChatMessage {
  return norm(b.text).length >= norm(a.text).length ? b : a
}

// Merge a fresh snapshot into accumulated (status-free) history. Volatile status
// lines are dropped here; the caller appends the latest one for display.
export function mergeTranscript(
  prev: ChatMessage[],
  snapshot: ChatMessage[],
): ChatMessage[] {
  const next = snapshot.filter((m) => m.role !== 'status')
  if (prev.length === 0) return next.slice(-MAX_HISTORY)
  if (next.length === 0) return prev

  // Largest L where prev's tail aligns with next's head is the shared window.
  const maxL = Math.min(prev.length, next.length)
  let overlap = 0
  for (let l = maxL; l >= 1; l--) {
    let ok = true
    for (let i = 0; i < l; i++) {
      if (!compat(prev[prev.length - l + i], next[i])) {
        ok = false
        break
      }
    }
    if (ok) {
      overlap = l
      break
    }
  }

  // No shared entry: the screen jumped past what we hold; append it all.
  if (overlap === 0) return [...prev, ...next].slice(-MAX_HISTORY)

  const head = prev.slice(0, prev.length - overlap)
  // Keep the fuller text at the seam (full top vs scrolled suffix, or streaming).
  const reconciled = next
    .slice(0, overlap)
    .map((m, i) => fuller(prev[prev.length - overlap + i], m))
  const tail = next.slice(overlap)
  return [...head, ...reconciled, ...tail].slice(-MAX_HISTORY)
}
