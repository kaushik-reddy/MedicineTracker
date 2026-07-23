import { useState, useRef, useEffect, useLayoutEffect } from 'react'
import { Logo, Bell, Clock, CheckCircle } from '../icons.jsx'
import { user } from '../data.js'
import { useApp } from '../store.jsx'

const toneDot = {
  brand: 'bg-brand-500',
  accent: 'bg-accent-500',
  warn: 'bg-warn-500',
  sky: 'bg-sky-500',
  coral: 'bg-coral-500',
}

// Slim brand/identity header — no tab navigation (single-page app).
export default function Header() {
  const { schedule, markTaken, notice, session, logout, authEnabled } = useApp()
  const upcoming = schedule.filter((m) => !m.taken && !m.skipped)

  const email = session?.user?.email || ''
  const accountName = email ? email.split('@')[0] : user.name
  const accountInitials = (email ? email[0] : user.initials[0] || 'U').toUpperCase()

  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  // ---- Bell expand/collapse notice animation ----
  const [msg, setMsg] = useState('')
  const [tone, setTone] = useState('brand')
  const [expanded, setExpanded] = useState(false)
  const [mw, setMw] = useState(0)
  const msgRef = useRef(null)

  useEffect(() => {
    if (!notice) return
    setMsg(notice.message)
    setTone(notice.tone || 'brand')
    setExpanded(true)
    const t = setTimeout(() => setExpanded(false), 2600)
    return () => clearTimeout(t)
  }, [notice])

  useLayoutEffect(() => {
    if (msgRef.current) setMw(msgRef.current.scrollWidth)
  }, [msg])

  useEffect(() => {
    const onDoc = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false)
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  return (
    <header className="flex shrink-0 items-center justify-between">
      <div className="flex items-center gap-2.5">
        <Logo className="h-8 w-8" />
        <div className="leading-tight">
          <div className="text-[15px] font-extrabold text-ink-900">MediTrack</div>
          <div className="text-[10px] font-medium text-ink-400">Track today. Heal tomorrow.</div>
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        <div ref={ref} className="relative">
          {/* Notification pill: collapses to a round bell, expands left on new events */}
          <button
            onClick={() => setOpen((o) => !o)}
            className="flex h-9 items-center overflow-hidden rounded-full border border-line bg-white text-ink-500 shadow-sm transition-colors hover:bg-page"
          >
            <span
              className="flex items-center overflow-hidden"
              style={{
                maxWidth: expanded ? mw : 0,
                opacity: expanded ? 1 : 0,
                transition:
                  'max-width 0.7s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.5s ease-in-out',
              }}
            >
              <span ref={msgRef} className="flex items-center gap-1.5 whitespace-nowrap pl-3 pr-1.5">
                <span className={'h-1.5 w-1.5 shrink-0 rounded-full ' + (toneDot[tone] || toneDot.brand)} />
                <span className="text-[12px] font-semibold text-ink-700">{msg}</span>
              </span>
            </span>

            <span className="relative grid h-9 w-9 shrink-0 place-items-center">
              <Bell className="h-4.5 w-4.5" />
              {upcoming.length > 0 && (
                <span className="absolute right-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-coral-500 px-1 text-[9px] font-bold text-white ring-2 ring-white">
                  {upcoming.length}
                </span>
              )}
            </span>
          </button>

          {open && (
            <>
              {/* Blurred backdrop */}
              <div className="fixed inset-0 z-40 bg-ink-900/25 backdrop-blur-sm" onClick={() => setOpen(false)} />
              <div className="absolute right-0 z-50 mt-2 w-72 overflow-hidden rounded-2xl border border-line bg-white shadow-2xl ring-1 ring-black/5">
                <div className="flex items-center justify-between gap-2 bg-gradient-to-br from-brand-50 via-white to-white px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="grid h-8 w-8 place-items-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-black/5">
                      <Bell className="h-4 w-4" />
                    </span>
                    <div className="leading-tight">
                      <div className="text-[13px] font-extrabold text-ink-900">Notifications</div>
                      <div className="text-[10px] font-semibold text-ink-400">
                        {upcoming.length} upcoming {upcoming.length === 1 ? 'dose' : 'doses'}
                      </div>
                    </div>
                  </div>
                  {upcoming.length > 0 && (
                    <span className="rounded-full bg-coral-500 px-2 py-0.5 text-[10px] font-bold text-white">{upcoming.length}</span>
                  )}
                </div>
                {upcoming.length === 0 ? (
                  <div className="px-4 py-6 text-center text-[12px] text-ink-400">
                    <CheckCircle className="mx-auto mb-1 h-6 w-6 text-brand-400" />
                    All caught up!
                  </div>
                ) : (
                  <div className="max-h-64 overflow-y-auto scroll-thin p-1.5">
                    {upcoming.map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center justify-between gap-2 rounded-xl px-2.5 py-2 transition-colors hover:bg-page"
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-amber-50 text-warn-500">
                            <Clock className="h-4 w-4" />
                          </span>
                          <div className="min-w-0 leading-tight">
                            <div className="truncate text-[12px] font-bold text-ink-900">{m.name}</div>
                            <div className="text-[10px] text-ink-400">{m.time}</div>
                          </div>
                        </div>
                        <button
                          onClick={() => markTaken(m.id)}
                          className="shrink-0 rounded-full bg-brand-500 px-2.5 py-1 text-[10px] font-bold text-white hover:bg-brand-600 transition-colors"
                        >
                          Take
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <button className="flex items-center gap-2 rounded-full border border-line bg-white py-1 pl-1 pr-3 hover:bg-page transition-colors">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-brand-500 text-[12px] font-bold text-white">
            {accountInitials}
          </span>
          <span className="max-w-[120px] truncate text-[12px] font-semibold text-ink-700">{accountName}</span>
        </button>

        {authEnabled && session && (
          <button
            onClick={logout}
            title="Sign out"
            className="rounded-full border border-line bg-white px-3 py-1.5 text-[12px] font-bold text-ink-500 hover:bg-page transition-colors"
          >
            Sign out
          </button>
        )}
      </div>
    </header>
  )
}
