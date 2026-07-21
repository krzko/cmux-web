import { Eye, EyeOff } from 'lucide-react'
import { useHideContent } from '#/hooks/use-hide-content'

// Toggles redaction of terminal text and previews.
export function HideContentToggle() {
  const { hidden, toggle } = useHideContent()
  const label = hidden ? 'Show sensitive content' : 'Hide sensitive content'
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      aria-pressed={hidden}
      title={label}
      className="btn btn-ghost"
      style={{ minHeight: 40, padding: '0 0.6rem' }}
    >
      {hidden ? <EyeOff size={18} /> : <Eye size={18} />}
    </button>
  )
}
