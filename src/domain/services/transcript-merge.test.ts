import { describe, expect, it } from 'vitest'
import type { ChatMessage, ChatRole } from '#/domain/entities/chat'
import { mergeTranscript } from './transcript-merge'

// Minimal message; only role/text matter to the merge.
function m(role: ChatRole, text: string): ChatMessage {
  return { id: text, role, lines: [], text }
}
const texts = (list: ChatMessage[]) => list.map((x) => x.text)

describe('mergeTranscript', () => {
  it('seeds history from the first snapshot (dropping status)', () => {
    const out = mergeTranscript(
      [],
      [m('agent', 'hello'), m('status', 'Working for 3s')],
    )
    expect(texts(out)).toEqual(['hello'])
  })

  it('is idempotent for an unchanged snapshot', () => {
    const snap = [m('agent', 'a'), m('tool', 'b'), m('agent', 'c')]
    const once = mergeTranscript([], snap)
    expect(texts(mergeTranscript(once, snap))).toEqual(['a', 'b', 'c'])
  })

  it('appends new tail when the screen scrolls by one', () => {
    const prev = [m('agent', 'A'), m('agent', 'B'), m('agent', 'C')]
    const next = [m('agent', 'B'), m('agent', 'C'), m('agent', 'D')]
    expect(texts(mergeTranscript(prev, next))).toEqual(['A', 'B', 'C', 'D'])
  })

  it('keeps the fuller text when the last message is still streaming', () => {
    const prev = [m('agent', 'intro line'), m('agent', 'hello wor')]
    const next = [m('agent', 'intro line'), m('agent', 'hello world extended')]
    // The last message grew in place; its fuller text replaces the partial.
    expect(texts(mergeTranscript(prev, next))).toEqual([
      'intro line',
      'hello world extended',
    ])
  })

  it('preserves the full top when a message is scrolled to a suffix', () => {
    const prev = [m('agent', 'a long paragraph of text'), m('agent', 'next')]
    const next = [
      m('agent', 'paragraph of text'),
      m('agent', 'next'),
      m('agent', 'more'),
    ]
    expect(texts(mergeTranscript(prev, next))).toEqual([
      'a long paragraph of text',
      'next',
      'more',
    ])
  })

  it('appends everything when frames do not overlap', () => {
    const prev = [m('agent', 'old one'), m('agent', 'old two')]
    const next = [m('agent', 'new one'), m('agent', 'new two')]
    expect(texts(mergeTranscript(prev, next))).toEqual([
      'old one',
      'old two',
      'new one',
      'new two',
    ])
  })

  it('does not align on short coincidental fragments', () => {
    const prev = [m('agent', 'x.'), m('agent', 'y.')]
    const next = [m('agent', 'z.'), m('agent', 'w.')]
    expect(texts(mergeTranscript(prev, next))).toEqual(['x.', 'y.', 'z.', 'w.'])
  })
})
