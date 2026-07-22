import { useState } from 'react'
import { useApp } from '../store.jsx'
import { Logo } from '../icons.jsx'

const field =
  'w-full rounded-xl border border-line bg-white px-3 py-2.5 text-[13px] font-medium text-ink-900 outline-none focus:border-brand-400 transition-colors'
const label = 'text-[12px] font-semibold text-ink-500'

function Login() {
  const { login, register } = useApp()
  const [mode, setMode] = useState('signin') // 'signin' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const isSignup = mode === 'signup'
  const valid = /\S+@\S+\.\S+/.test(email) && password.length >= 6

  const submit = async (e) => {
    e.preventDefault()
    if (!valid || busy) return
    setBusy(true)
    const ok = isSignup ? await register(email.trim(), password) : await login(email.trim(), password)
    setBusy(false)
    if (!ok) return
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-page p-4">
      <div className="w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex flex-col items-center gap-2 px-8 pt-8 text-center">
          <Logo className="h-11 w-11" />
          <h1 className="text-[20px] font-extrabold text-ink-900">MediTrack</h1>
          <p className="text-[12px] text-ink-500">
            {isSignup ? 'Create an account to sync your data across devices.' : 'Sign in to access your medications anywhere.'}
          </p>
        </div>

        <form onSubmit={submit} className="space-y-3 px-8 pb-4 pt-6">
          <div>
            <div className={label}>Email</div>
            <input
              type="email"
              autoComplete="email"
              className={field + ' mt-1'}
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <div className={label}>Password</div>
            <input
              type="password"
              autoComplete={isSignup ? 'new-password' : 'current-password'}
              className={field + ' mt-1'}
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={!valid || busy}
            className={
              'w-full rounded-xl bg-brand-500 py-2.5 text-[13px] font-bold text-white transition-colors ' +
              (valid && !busy ? 'hover:bg-brand-600' : 'cursor-not-allowed opacity-50')
            }
          >
            {busy ? 'Please wait…' : isSignup ? 'Create account' : 'Sign in'}
          </button>
        </form>

        <div className="border-t border-line px-8 py-4 text-center text-[12px] text-ink-500">
          {isSignup ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            type="button"
            onClick={() => setMode(isSignup ? 'signin' : 'signup')}
            className="font-bold text-brand-600 hover:underline"
          >
            {isSignup ? 'Sign in' : 'Sign up'}
          </button>
        </div>
      </div>
    </div>
  )
}

// Gates the app behind authentication. When persistence is not configured the app
// runs in local (no-login) mode so development without Supabase still works.
export default function AuthGate({ children }) {
  const { authEnabled, authLoading, session } = useApp()
  if (!authEnabled) return children
  if (authLoading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-page">
        <div className="flex flex-col items-center gap-3">
          <Logo className="h-10 w-10 animate-pulse" />
          <span className="text-[12px] font-semibold text-ink-400">Loading…</span>
        </div>
      </div>
    )
  }
  if (!session) return <Login />
  return children
}
