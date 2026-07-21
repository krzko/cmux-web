import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { queryKeys } from '#/lib/query-keys'

export type StreamStatus = 'connecting' | 'open' | 'closed'

interface StreamFrame {
  type: 'ready' | 'event'
  name?: string
  category?: string
  workspaceRef?: string
  surfaceRef?: string
}

// Subscribe to the server SSE stream and turn each change signal into a
// targeted query invalidation. Bulk terminal text is refetched, never streamed.
// EventSource reconnects on its own; we only reflect the connection state.
export function useEventStream(): StreamStatus {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<StreamStatus>('connecting')

  useEffect(() => {
    const source = new EventSource('/api/events')

    source.onopen = () => setStatus('open')
    source.onerror = () => setStatus('connecting')
    source.onmessage = (message) => {
      let frame: StreamFrame
      try {
        frame = JSON.parse(message.data)
      } catch {
        return
      }
      if (frame.type === 'ready') {
        setStatus('open')
        return
      }
      // Any change can shift triage status; always refresh the list.
      queryClient.invalidateQueries({ queryKey: queryKeys.triage })
      // New/resolved prompts arrive via the feed; refresh open pending panels.
      queryClient.invalidateQueries({ queryKey: ['pending'] })
      // A surface change also invalidates that terminal's cached text.
      if (frame.surfaceRef) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.terminal(frame.surfaceRef),
        })
      }
      if (frame.workspaceRef) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.terminal(frame.workspaceRef),
        })
      }
    }

    return () => {
      source.close()
      setStatus('closed')
    }
  }, [queryClient])

  return status
}
