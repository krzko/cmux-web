import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { Loader2, Lock } from 'lucide-react'
import { useState } from 'react'
import { ThemeToggle } from '#/components/ThemeToggle'
import { getSession, login } from '#/server/functions/session.functions'

export const Route = createFileRoute('/login')({
  beforeLoad: async () => {
    const session = await getSession()
    // Already in, or auth disabled: nothing to do here.
    if (!session.required || session.authed) throw redirect({ to: '/' })
  },
  component: LoginPage,
})

function LoginPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    setFailed(false)
    try {
      const result = await login({ data: { password } })
      if (result.ok) {
        await router.invalidate()
        await router.navigate({ to: '/' })
      } else {
        setFailed(true)
      }
    } catch {
      setFailed(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <div className="pad-top-safe flex justify-end px-3">
        <ThemeToggle />
      </div>
      <main className="flex flex-1 items-center justify-center px-4">
        <form
          onSubmit={submit}
          className="card flex w-full max-w-sm flex-col gap-4 p-6"
        >
          <div className="flex flex-col items-center gap-2 text-center">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-full"
              style={{
                background: 'var(--accent-weak)',
                color: 'var(--accent)',
              }}
            >
              <Lock size={22} />
            </div>
            <h1 className="text-lg font-bold">cmux-web</h1>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              Enter the access password to continue.
            </p>
          </div>

          <input
            className="input"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            autoFocus
            aria-label="Access password"
          />

          {failed && (
            <p className="text-sm" style={{ color: 'var(--danger)' }}>
              Incorrect password.
            </p>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={busy || !password}
          >
            {busy ? <Loader2 size={18} className="spin" /> : 'Unlock'}
          </button>
        </form>
      </main>
    </div>
  )
}
