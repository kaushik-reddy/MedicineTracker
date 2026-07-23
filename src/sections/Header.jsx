import { useState, useRef, useEffect, useLayoutEffect } from 'react'
import { Logo, Bell, Clock, CheckCircle } from '../icons.jsx'
import { MedGlyph, UserAvatar, userTone } from '../ui.jsx'
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
  const { schedule, notice, session, logout, authEnabled, usersById } = useApp()
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
          <div className="hidden text-[10px] font-medium text-ink-400 sm:block">Track today. Heal tomorrow.</div>
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
                <span className="max-w-[42vw] truncate text-[12px] font-semibold text-ink-700 sm:max-w-none">{msg}</span>
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
              <div className="absolute right-0 z-50 mt-2 w-80 max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-2xl border border-line bg-white shadow-2xl ring-1 ring-black/5">
                <div className="flex items-center justify-between gap-2 bg-gradient-to-br from-brand-50 via-white to-white px-4 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-black/5">
                      <Bell className="h-4.5 w-4.5" />
                    </span>
                    <div className="leading-tight">
                      <div className="text-[14px] font-extrabold text-ink-900">Notifications</div>
                      <div className="text-[11px] font-semibold text-ink-400">
                        {upcoming.length} upcoming {upcoming.length === 1 ? 'dose' : 'doses'} today
                      </div>
                    </div>
                  </div>
                  {upcoming.length > 0 && (
                    <span className="rounded-full bg-coral-500 px-2 py-0.5 text-[11px] font-bold text-white">{upcoming.length}</span>
                  )}
                </div>
                {upcoming.length === 0 ? (
                  <div className="px-4 py-8 text-center text-[12px] text-ink-400">
                    <CheckCircle className="mx-auto mb-1.5 h-7 w-7 text-brand-400" />
                    All caught up!
                    <div className="mt-0.5 text-[11px] text-ink-400">No pending doses right now.</div>
                  </div>
                ) : (
                  <div className="max-h-80 space-y-1.5 overflow-y-auto scroll-thin p-2">
                    {upcoming.map((m) => {
                      const owner = usersById[m.user]
                      const uTone = (userTone[owner?.tone] || userTone.brand).text
                      return (
                        <div
                          key={m.id}
                          className="flex items-center gap-2.5 rounded-xl border border-line/70 bg-white px-2.5 py-2.5"
                        >
                          <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-lg border border-line bg-white">
                            <MedGlyph med={m} className="h-6 w-6" />
                          </span>
                          <div className="min-w-0 flex-1 leading-tight">
                            <div className="truncate text-[12px] font-bold text-ink-900">{m.name}</div>
                            <div className="truncate text-[10px] text-ink-400">
                              {m.dosage} • {m.unit}
                            </div>
                            <div className="mt-0.5 flex items-center gap-2">
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-ink-500">
                                <Clock className="h-3 w-3" /> {m.time}
                              </span>
                              {owner && (
                                <span className={'inline-flex items-center gap-1 text-[10px] font-bold ' + uTone}>
                                  <UserAvatar user={owner} className="h-3.5 w-3.5 text-[7px]" />
                                  {owner.name}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <button className="flex items-center gap-2 rounded-full border border-line bg-white py-1 pl-1 pr-1 hover:bg-page transition-colors sm:pr-3">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-500 text-[12px] font-bold text-white">
            {accountInitials}
          </span>
          <span className="hidden max-w-[120px] truncate text-[12px] font-semibold text-ink-700 sm:block">{accountName}</span>
        </button>

        {authEnabled && session && (
          <button
            onClick={logout}
            title="Sign out"
            className="shrink-0 rounded-full border border-line bg-white px-2.5 py-1.5 text-[12px] font-bold text-ink-500 hover:bg-page transition-colors sm:px-3"
          >
            Sign out
          </button>
        )}
      </div>
    </header>
  )
}
