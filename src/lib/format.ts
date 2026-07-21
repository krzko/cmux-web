// Strip the leading activity glyph cmux embeds in a title for clean display.
// Status derivation still uses the raw title, so only the view is cleaned.
export function cleanTitle(title: string): string {
  return title.replace(/^[␀-⣿✳✹✽✶·\s]+/, '').trim() || title
}

// Compact relative time, e.g. "3m", "2h", "4d". Empty for missing input.
export function relativeTime(iso?: string, now = Date.now()): string {
  if (!iso) return ''
  const then = Date.parse(iso)
  if (Number.isNaN(then)) return ''
  const secs = Math.max(0, Math.round((now - then) / 1000))
  if (secs < 60) return `${secs}s`
  const mins = Math.round(secs / 60)
  if (mins < 60) return `${mins}m`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours}h`
  return `${Math.round(hours / 24)}d`
}

// Last path segment of a cwd, for a compact location chip.
export function shortCwd(cwd?: string): string {
  if (!cwd) return ''
  const parts = cwd.replace(/\/+$/, '').split('/')
  return parts[parts.length - 1] || cwd
}
