import { useQuery } from '@tanstack/react-query'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { Inbox, RotateCw, ServerCrash } from 'lucide-react'
import { useMemo, useState } from 'react'
import { AppBar } from '#/components/AppBar'
import { ConnectionBadge } from '#/components/ConnectionBadge'
import { GroupSection } from '#/components/GroupSection'
import { HideContentToggle } from '#/components/HideContentToggle'
import { SearchBar } from '#/components/SearchBar'
import { ThemeToggle } from '#/components/ThemeToggle'
import { WorkspaceList } from '#/components/WorkspaceList'
import type { TriagedWorkspace } from '#/domain/entities/workspace'
import type { GroupSection as GroupSectionModel } from '#/domain/services/triage'
import { matchesQuery } from '#/domain/services/triage'
import { useEventStream } from '#/hooks/use-event-stream'
import { queryKeys } from '#/lib/query-keys'
import { getSession } from '#/server/functions/session.functions'
import { fetchTriage } from '#/server/functions/triage.functions'

export const Route = createFileRoute('/')({
  beforeLoad: async () => {
    const session = await getSession()
    if (session.required && !session.authed) throw redirect({ to: '/login' })
  },
  loader: ({ context }) =>
    context.queryClient.ensureQueryData({
      queryKey: queryKeys.triage,
      queryFn: () => fetchTriage(),
    }),
  component: ListPage,
})

function ListPage() {
  const stream = useEventStream()
  const [query, setQuery] = useState('')
  const {
    data: view,
    isError,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: queryKeys.triage,
    queryFn: () => fetchTriage(),
    // Stream drives updates; poll only as a fallback when it is down.
    refetchInterval: stream === 'open' ? false : 8000,
  })

  const filteredNeeds = useMemo(
    () => (view ? view.needsInput.filter((w) => matchesQuery(w, query)) : []),
    [view, query],
  )
  const counts = view?.counts

  return (
    <div className="flex min-h-dvh flex-col">
      <AppBar
        title="cmux"
        subtitle={
          counts
            ? `${counts.needsInput} need input · ${counts.running} running · ${counts.total} total`
            : 'Loading…'
        }
        actions={
          <>
            <ConnectionBadge status={stream} />
            <HideContentToggle />
            <ThemeToggle />
          </>
        }
      />

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-3 py-3">
        <SearchBar value={query} onChange={setQuery} />

        {isError && !view && <DisconnectedState onRetry={() => refetch()} />}

        {view && (
          <>
            {filteredNeeds.length > 0 && (
              <section className="flex flex-col gap-2">
                <h2
                  className="px-1 text-sm font-bold uppercase"
                  style={{
                    color: 'var(--status-needs)',
                    letterSpacing: '0.05em',
                  }}
                >
                  Needs you
                </h2>
                <WorkspaceList workspaces={filteredNeeds} />
              </section>
            )}

            {view.sections.map((section) => (
              <FilteredGroup
                key={section.group.ref}
                section={section}
                query={query}
              />
            ))}

            <UngroupedSection
              workspaces={view.ungrouped.filter((w) => matchesQuery(w, query))}
            />

            {counts?.total === 0 && <EmptyState />}
          </>
        )}
      </main>

      {isFetching && view && (
        <div
          className="fixed left-1/2 top-1 -translate-x-1/2 text-xs"
          style={{ color: 'var(--faint)' }}
        >
          syncing…
        </div>
      )}
    </div>
  )
}

function FilteredGroup({
  section,
  query,
}: {
  section: GroupSectionModel
  query: string
}) {
  const workspaces = section.workspaces.filter((w) => matchesQuery(w, query))
  if (workspaces.length === 0) return null
  return <GroupSection section={{ ...section, workspaces }} />
}

function UngroupedSection({ workspaces }: { workspaces: TriagedWorkspace[] }) {
  if (workspaces.length === 0) return null
  return (
    <section className="flex flex-col gap-2">
      <h2
        className="px-1 text-sm font-bold uppercase"
        style={{ color: 'var(--muted)', letterSpacing: '0.05em' }}
      >
        Ungrouped
      </h2>
      <WorkspaceList workspaces={workspaces} />
    </section>
  )
}

function EmptyState() {
  return (
    <div className="card flex flex-col items-center gap-2 p-8 text-center">
      <Inbox size={28} style={{ color: 'var(--faint)' }} />
      <p className="font-semibold">No workspaces</p>
      <p className="text-sm" style={{ color: 'var(--muted)' }}>
        cmux has no workspaces open, or none match your search.
      </p>
    </div>
  )
}

function DisconnectedState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="card flex flex-col items-center gap-3 p-8 text-center">
      <ServerCrash size={28} style={{ color: 'var(--danger)' }} />
      <p className="font-semibold">Can't reach cmux</p>
      <p className="text-sm" style={{ color: 'var(--muted)' }}>
        The server could not talk to the cmux socket. Check that cmux is running
        with full socket access.
      </p>
      <button type="button" className="btn" onClick={onRetry}>
        <RotateCw size={16} /> Retry
      </button>
    </div>
  )
}
