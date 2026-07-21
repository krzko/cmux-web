import { MonitorSmartphone, Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'

type ThemeMode = 'light' | 'dark' | 'auto'

function apply(mode: ThemeMode) {
  const prefersDark = matchMedia('(prefers-color-scheme: dark)').matches
  const resolved = mode === 'auto' ? (prefersDark ? 'dark' : 'light') : mode
  const root = document.documentElement
  root.classList.remove('light', 'dark')
  root.classList.add(resolved)
  if (mode === 'auto') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', mode)
  root.style.colorScheme = resolved
}

// Cycles light -> dark -> auto. Persisted; the no-flash gate in the root reads
// the same key on load.
export function ThemeToggle() {
  const [mode, setMode] = useState<ThemeMode>('auto')

  useEffect(() => {
    const stored = localStorage.getItem('theme')
    if (stored === 'light' || stored === 'dark' || stored === 'auto') {
      setMode(stored)
    }
  }, [])

  useEffect(() => {
    if (mode !== 'auto') return
    const media = matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => apply('auto')
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [mode])

  function cycle() {
    const next: ThemeMode =
      mode === 'light' ? 'dark' : mode === 'dark' ? 'auto' : 'light'
    setMode(next)
    apply(next)
    localStorage.setItem('theme', next)
  }

  const label = `Theme: ${mode}. Tap to change.`
  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={label}
      title={label}
      className="btn btn-ghost"
      style={{ minHeight: 40, padding: '0 0.6rem' }}
    >
      {mode === 'light' ? (
        <Sun size={18} />
      ) : mode === 'dark' ? (
        <Moon size={18} />
      ) : (
        <MonitorSmartphone size={18} />
      )}
    </button>
  )
}
