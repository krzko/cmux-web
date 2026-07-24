import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { AlertTriangle, ArrowLeft } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { AppBar } from '#/components/AppBar'
import { ChatView } from '#/components/ChatView'
import { HideContentToggle } from '#/components/HideContentToggle'
import { InputBar } from '#/components/InputBar'
import { PendingPanel } from '#/components/PendingPanel'
import { StatusIndicator } from '#/components/StatusIndicator'
import { SurfaceTabs } from '#/components/SurfaceTabs'
import { TerminalView } from '#/components/TerminalView'
import { ThemeToggle } from '#/components/ThemeToggle'
import { type ViewMode, ViewToggle } from '#/components/ViewToggle'
import type { Chat, ChatMessage } from '#/domain/entities/chat'
import type { TerminalKey } from '#/domain/entities/interaction'
import { isAgentBound, resolveAgent } from '#/domain/services/agent-registry'
import { defaultSurface, groupSurfacesByPane } from '#/domain/services/layout'
import { toChat } from '#/domain/services/transcript'
import { mergeTranscript } from '#/domain/services/transcript-merge'
import { useEventStream } from '#/hooks/use-event-stream'
import { cleanTitle } from '#/lib/format'
import { queryKeys } from '#/lib/query-keys'
import { fetchPending } from '#/server/functions/feed.functions'
import {
  postAnswer,
  postKey,
  postPermission,
  postPlan,
  postText,
} from '#/server/functions/interact.functions'
import { getSession } from '#/server/functions/session.functions'
import {
  fetchSurfaces,
  fetchTerminalGrid,
} from '#/server/functions/terminal.functions'
import { fetchTriage } from '#/server/functions/triage.functions'

export const Route = createFileRoute('/w/$ref')({
  beforeLoad: async () => {
    const session = await getSession()
    if (session.required && !session.authed) throw redirect({ to: '/login' })
  },
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData({
      queryKey: [...queryKeys.terminal(params.ref), 'ws'],
      queryFn: () => fetchTerminalGrid({ data: { workspaceRef: params.ref } }),
    }),
  component: DetailPage,
})

const VIEW_KEY = 'cmux:view-mode'

function DetailPage() {
  const { ref } = Route.useParams()
  const queryClient = useQueryClient()
  // Keeps the SSE connection warm (status/pending update live); terminal text
  // is polled below because output changes do not reliably emit a ref-tagged event.
  useEventStream()
  const [busy, setBusy] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedSurfaceId, setSelectedSurfaceId] = useState<string>()
  // Chat vs terminal rendering of the same transcript; the choice is remembered.
  const [viewMode, setViewMode] = useState<ViewMode>('terminal')
  useEffect(() => {
    const stored = localStorage.getItem(VIEW_KEY)
    if (stored === 'chat' || stored === 'terminal') setViewMode(stored)
  }, [])
  const changeView = (mode: ViewMode) => {
    setViewMode(mode)
    localStorage.setItem(VIEW_KEY, mode)
  }

  const triage = useQuery({
    queryKey: queryKeys.triage,
    queryFn: () => fetchTriage(),
  })
  const workspace = triage.data
    ? [
        ...triage.data.sections.flatMap((s) => s.workspaces),
        ...triage.data.ungrouped,
      ].find((w) => w.ref === ref)
    : undefined

  // Panes (splits) + surfaces (tabs) for this workspace.
  const surfacesQuery = useQuery({
    queryKey: queryKeys.surfaces(ref),
    queryFn: () => fetchSurfaces({ data: { workspaceRef: ref } }),
    refetchInterval: 8000,
  })
  const surfaces = surfacesQuery.data ?? []
  const panes = useMemo(() => groupSurfacesByPane(surfaces), [surfaces])
  // An explicit tab pick targets that surface; the default reads the workspace's
  // focused surface (keeps the SSR cache) while still highlighting its tab.
  const selected = surfaces.find((s) => s.id === selectedSurfaceId)
  const activeSurface = selected ?? defaultSurface(surfaces)
  const activeId = activeSurface?.id
  // Input goes to the shown tab (ref-safe via CLI wrapper), else the workspace.
  const ioTarget = selected
    ? { surfaceRef: selected.ref, workspaceRef: ref }
    : { workspaceRef: ref }

  // Recognise the agent for the placeholder + slash commands. Any bound agent
  // gets the "message X" placeholder; recognised ones also get slash commands.
  const agentProfile = resolveAgent(activeSurface?.agentKind)
  const agentBound = isAgentBound(activeSurface?.agentKind)
  const agentLabel =
    activeSurface?.agentName ?? agentProfile?.name ?? 'the agent'
  // Placeholder is sentence case; the textarea keeps autoCapitalize off so typed
  // input is never auto-capitalised.
  const placeholder = agentBound ? `Message ${agentLabel}…` : 'Run a command…'
  const slashCommands = agentProfile?.slashCommands ?? []

  const terminal = useQuery({
    queryKey: [...queryKeys.terminal(ref), selected?.id ?? 'ws'],
    queryFn: () =>
      fetchTerminalGrid({
        data: selected ? { surfaceId: selected.id } : { workspaceRef: ref },
      }),
    // Poll the shown terminal; pauses automatically when the tab is hidden.
    refetchInterval: 2500,
    refetchIntervalInBackground: false,
  })

  // Chat history accumulates across polls: cmux returns only the current screen
  // (no terminal scrollback for alternate-screen agents), so each snapshot is
  // stitched into a growing transcript. Reset when the shown surface changes.
  const chat = useMemo(() => toChat(terminal.data), [terminal.data])
  const surfaceKey = `${ref}:${selected?.id ?? 'ws'}`
  const historyRef = useRef<{ key: string; msgs: ChatMessage[] }>({
    key: '',
    msgs: [],
  })
  const [chatHistory, setChatHistory] = useState<Chat>({ messages: [] })
  useEffect(() => {
    const snapshot = chat.messages
    const status = snapshot.filter((m) => m.role === 'status').slice(-1)
    if (historyRef.current.key !== surfaceKey) {
      historyRef.current = {
        key: surfaceKey,
        msgs: snapshot.filter((m) => m.role !== 'status'),
      }
    } else {
      historyRef.current.msgs = mergeTranscript(
        historyRef.current.msgs,
        snapshot,
      )
    }
    setChatHistory({ messages: [...historyRef.current.msgs, ...status] })
  }, [chat, surfaceKey])

  async function refreshTerminal() {
    setRefreshing(true)
    try {
      await terminal.refetch()
    } finally {
      setRefreshing(false)
    }
  }

  const pending = useQuery({
    queryKey: [...queryKeys.pending(ref), workspace?.cwd ?? ''],
    queryFn: () =>
      fetchPending({ data: { workspaceRef: ref, cwd: workspace?.cwd } }),
    enabled: Boolean(workspace),
  })

  // A write may change status, terminal, and pending state; refresh all three.
  async function run(action: () => Promise<unknown>) {
    setBusy(true)
    setError(null)
    try {
      await action()
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.terminal(ref) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.pending(ref) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.triage }),
      ])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed')
    } finally {
      setBusy(false)
    }
  }

  // Universal send: type into the surface, then Enter. Works for agent prompts
  // (including slash commands) and shells alike; prompt_submit has no CLI wrapper
  // or verified field, so it is not used.
  function send(text: string) {
    run(async () => {
      await postText({ data: { target: ioTarget, text } })
      await postKey({ data: { target: ioTarget, key: 'enter' } })
    })
  }

  const title = workspace ? cleanTitle(workspace.title) : ref

  return (
    // Fixed viewport height so the terminal is its own bounded scroll region
    // (page-level scroll would open at the top and never follow the tail).
    <div className="flex h-dvh flex-col overflow-hidden">
      <AppBar
        title={
          <span className="flex items-center gap-2">
            {workspace && <StatusIndicator status={workspace.status} />}
            <span className="truncate">{title}</span>
          </span>
        }
        subtitle={workspace?.cwd}
        leading={
          <Link
            to="/"
            className="btn btn-ghost"
            aria-label="Back"
            style={{ minHeight: 40, padding: '0 0.5rem' }}
          >
            <ArrowLeft size={18} />
          </Link>
        }
        actions={
          <>
            <HideContentToggle />
            <ThemeToggle />
          </>
        }
      />

      <main className="mx-auto flex w-full min-h-0 max-w-3xl flex-1 flex-col gap-3 px-3 py-3">
        {surfaces.length > 1 && (
          <SurfaceTabs
            panes={panes}
            activeId={activeId}
            onSelect={(surface) => setSelectedSurfaceId(surface.id)}
          />
        )}

        {error && (
          <div
            className="card flex items-center gap-2 p-3"
            style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}
          >
            <AlertTriangle size={16} /> <span className="text-sm">{error}</span>
          </div>
        )}

        <PendingPanel
          items={pending.data ?? []}
          busy={busy}
          onAnswer={(id, sel) =>
            run(() =>
              postAnswer({ data: { requestId: id, selections: [sel] } }),
            )
          }
          onPermission={(id, decision) =>
            run(() => postPermission({ data: { requestId: id, decision } }))
          }
          onPlan={(id, decision) =>
            run(() => postPlan({ data: { requestId: id, decision } }))
          }
        />

        {viewMode === 'chat' ? (
          <ChatView
            chat={chatHistory}
            grid={terminal.data}
            loading={refreshing || terminal.isLoading}
            onRefresh={refreshTerminal}
            toggle={<ViewToggle mode={viewMode} onChange={changeView} />}
          />
        ) : (
          <TerminalView
            grid={terminal.data}
            loading={refreshing || terminal.isLoading}
            onRefresh={refreshTerminal}
            toggle={<ViewToggle mode={viewMode} onChange={changeView} />}
          />
        )}
      </main>

      <InputBar
        busy={busy}
        placeholder={placeholder}
        slashCommands={slashCommands}
        onSend={send}
        onKey={(key: TerminalKey) =>
          run(() => postKey({ data: { target: ioTarget, key } }))
        }
      />
    </div>
  )
}
