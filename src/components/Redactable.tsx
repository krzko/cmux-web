import { useHideContent } from '#/hooks/use-hide-content'

// Blurs its children when hide-content mode is on; reveals on tap/focus.
export function Redactable({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  const { hidden } = useHideContent()
  if (!hidden) return <span className={className}>{children}</span>
  return (
    // biome-ignore lint/a11y/useSemanticElements: focus/tap reveal affordance, not a semantic button; the global toggle is the primary control
    <span className={`redacted ${className}`} tabIndex={0} role="button">
      {children}
    </span>
  )
}
