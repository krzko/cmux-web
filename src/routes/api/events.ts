import { createFileRoute } from '@tanstack/react-router'
import { isAuthedFromRequest } from '#/server/auth'
import { getEventsSource } from '#/server/container'

// Server-sent events. A single `cmux events` subprocess (in the container)
// fans out to every connected browser; each frame is a change signal the client
// turns into a targeted query invalidation. Bulk terminal text is pulled, never
// streamed. Never streams to an unauthenticated client.
export const Route = createFileRoute('/api/events')({
  server: {
    handlers: {
      GET: ({ request }) => {
        if (!isAuthedFromRequest(request)) {
          return new Response('Unauthorized', { status: 401 })
        }

        const source = getEventsSource()
        const encoder = new TextEncoder()
        let unsubscribe: (() => void) | undefined
        let heartbeat: ReturnType<typeof setInterval> | undefined

        const stream = new ReadableStream<Uint8Array>({
          start(controller) {
            const send = (payload: unknown) => {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(payload)}\n\n`),
              )
            }
            send({ type: 'ready' })
            unsubscribe = source.subscribe((event) => {
              try {
                send({ type: 'event', ...event })
              } catch {
                // Client went away mid-write; cancel() will clean up.
              }
            })
            // Keep intermediaries from closing an idle connection.
            heartbeat = setInterval(() => {
              try {
                controller.enqueue(encoder.encode(': ping\n\n'))
              } catch {
                // Ignore; cancel() handles teardown.
              }
            }, 25000)
          },
          cancel() {
            unsubscribe?.()
            if (heartbeat) clearInterval(heartbeat)
          },
        })

        return new Response(stream, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            Connection: 'keep-alive',
          },
        })
      },
    },
  },
})
