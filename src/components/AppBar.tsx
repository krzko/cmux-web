// Sticky, safe-area-aware top bar. Slots keep it reusable across list + detail.
export function AppBar({
  title,
  subtitle,
  leading,
  actions,
}: {
  title: React.ReactNode
  subtitle?: React.ReactNode
  leading?: React.ReactNode
  actions?: React.ReactNode
}) {
  return (
    <header
      className="pad-top-safe sticky top-0 z-20"
      style={{
        background: 'color-mix(in oklab, var(--bg) 82%, transparent)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <div className="mx-auto flex w-full max-w-3xl items-center gap-2 px-3 pb-2">
        {leading}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="truncate text-base font-bold leading-tight">
            {title}
          </div>
          {subtitle && (
            <div className="truncate text-xs" style={{ color: 'var(--muted)' }}>
              {subtitle}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">{actions}</div>
      </div>
    </header>
  )
}
