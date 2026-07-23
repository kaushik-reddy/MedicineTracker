import { useState, useRef, useLayoutEffect } from 'react'
import { ChevronRight, Clock, CheckCircle, TrendingUp, Check, Close } from '../icons.jsx'
import { Card, SectionTitle, Dropdown, toneSoft, MedGlyph, userTone, UserAvatar } from '../ui.jsx'
import { useApp } from '../store.jsx'
import { medActiveOn, istCalendarDate, addDays } from '../time.js'

const glanceIcon = { clock: Clock, check: CheckCircle, trend: TrendingUp }

const CARD = 150
const GAP = 16

// Full date like "23 Jul 2026" for the timeline day markers.
const fmtDate = (d) => d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

function buildSlots(schedule, scheduleTomorrow) {
  const slots = []
  schedule.forEach((m) => slots.push({ key: 't0-' + m.id, type: 'dose', med: m, day: 'Today' }))
  slots.push({ key: 'done-0', type: 'done', day: 'Today' })
  scheduleTomorrow.forEach((m) =>
    slots.push({ key: 't1-' + m.id, type: 'dose', med: { ...m, taken: false, skipped: false }, day: 'Tomorrow' }),
  )
  slots.push({ key: 'done-1', type: 'done', day: 'Tomorrow' })
  return slots
}

function Node({ state }) {
  if (state === 'done')
    return (
      <span className="grid h-5 w-5 place-items-center rounded-full bg-brand-500 text-white ring-4 ring-white">
        <Check className="h-3 w-3" />
      </span>
    )
  if (state === 'skipped')
    return (
      <span className="grid h-5 w-5 place-items-center rounded-full bg-amber-400 text-white ring-4 ring-white">
        <Close className="h-3 w-3" />
      </span>
    )
  if (state === 'active')
    return <span className="h-3.5 w-3.5 rounded-full bg-brand-500 ring-4 ring-brand-100" />
  return <span className="h-3.5 w-3.5 rounded-full border-2 border-line bg-white ring-4 ring-white" />
}

export function ScheduleCard({ className = '' }) {
  const { schedule, scheduleTomorrow, nextDose, openModal, usersById } = useApp()
  const slots = buildSlots(schedule, scheduleTomorrow)
  const today = istCalendarDate()
  const dateForDay = (day) => (day === 'Tomorrow' ? addDays(today, 1) : today)

  let activeIndex = schedule.findIndex((m) => !m.taken && !m.skipped)
  if (activeIndex === -1) activeIndex = schedule.length // "all done today" card

  const viewportRef = useRef(null)
  const [vw, setVw] = useState(0)
  const [ready, setReady] = useState(false)

  useLayoutEffect(() => {
    const measure = () => viewportRef.current && setVw(viewportRef.current.clientWidth)
    measure()
    setReady(true)
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  const step = CARD + GAP
  const offset = vw / 2 - (activeIndex * step + CARD / 2)

  const stateOf = (slot, i) => {
    if (slot.type === 'done') return i === activeIndex ? 'active' : 'upcoming'
    const m = slot.med
    return m.taken ? 'done' : m.skipped ? 'skipped' : i === activeIndex ? 'active' : 'upcoming'
  }

  return (
    <Card className={'flex flex-col p-4 ' + className}>
      <div className="flex items-baseline justify-between gap-2">
        <SectionTitle className="!text-[15px]">Today's Schedule</SectionTitle>
        <span className="shrink-0 text-[10px] font-bold text-ink-400">{fmtDate(today)}</span>
      </div>

      <div ref={viewportRef} className="relative mt-3 flex-1 overflow-hidden">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-20 w-8 bg-gradient-to-r from-white to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-20 w-8 bg-gradient-to-l from-white to-transparent" />

        <div
          className="relative flex h-full"
          style={{
            gap: GAP,
            transform: `translateX(${offset}px)`,
            transition: ready ? 'transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)' : 'none',
            willChange: 'transform',
          }}
        >
          {/* Timeline rail behind the nodes (green up to the active node) */}
          <div
            className="absolute z-0 h-[3px] -translate-y-1/2 rounded-full bg-line"
            style={{ top: 30, left: CARD / 2, width: (slots.length - 1) * step }}
          />
          <div
            className="absolute z-0 h-[3px] -translate-y-1/2 rounded-full bg-brand-500 transition-[width] duration-500"
            style={{ top: 30, left: CARD / 2, width: activeIndex * step }}
          />

          {slots.map((slot, i) => {
            const state = stateOf(slot, i)
            const active = i === activeIndex
            const dim = active ? '' : 'opacity-60'
            return (
              <div key={slot.key} style={{ width: CARD }} className="relative z-10 flex shrink-0 flex-col items-center">
                <div className="flex h-4 items-end text-[10px] font-semibold text-ink-400">
                  {slot.type === 'dose' ? (
                    slot.med.label
                  ) : (
                    <span className="text-[9px] font-bold text-brand-600">{fmtDate(dateForDay(slot.day))}</span>
                  )}
                </div>
                <div className="flex h-6 items-center justify-center">
                  <Node state={state} />
                </div>

                {slot.type === 'dose' ? (
                  <div
                    className={
                      'mt-2 flex h-[118px] w-full flex-col rounded-2xl border p-2.5 transition-all duration-500 ' +
                      (active ? 'border-brand-400 bg-brand-50/40 shadow-sm' : 'border-line bg-white ' + dim)
                    }
                  >
                    <div className="flex items-start justify-between">
                      <span className="grid h-8 w-8 place-items-center overflow-hidden rounded-lg border border-line bg-white">
                        <MedGlyph med={slot.med} className="h-5 w-5" />
                      </span>
                      {slot.day === 'Tomorrow' && !slot.med.taken && (
                        <span className="rounded-full bg-page px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-ink-400">
                          Tmrw
                        </span>
                      )}
                    </div>
                    <div className="mt-1.5 truncate text-[12px] font-bold leading-tight text-ink-900">
                      {slot.med.name}
                    </div>
                    <div className="truncate text-[9px] text-ink-500">
                      {`${slot.med.dosage} • ${slot.med.unit}`}
                    </div>
                    <div className="mt-auto flex items-center justify-between gap-1 pt-1">
                      <span
                        className={
                          'text-[10px] font-bold ' +
                          (slot.med.taken
                            ? 'text-brand-600'
                            : slot.med.skipped
                              ? 'text-warn-500'
                              : active
                                ? 'text-brand-600'
                                : 'text-ink-400')
                        }
                      >
                        {slot.med.taken
                          ? 'Taken'
                          : slot.med.skipped
                            ? 'Skipped'
                            : active
                              ? 'Next up'
                              : slot.med.time}
                      </span>
                      {usersById[slot.med.user] && (
                        <span className={'shrink-0 text-[9px] font-extrabold ' + (userTone[usersById[slot.med.user].tone] || userTone.brand).text}>
                          {usersById[slot.med.user].name}
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div
                    className={
                      'mt-2 flex h-[118px] w-full flex-col items-center justify-center rounded-2xl border p-3 text-center transition-all duration-500 ' +
                      (active
                        ? 'border-brand-400 bg-gradient-to-br from-brand-50 to-emerald-50/60 shadow-sm'
                        : 'border-line bg-white ' + dim)
                    }
                  >
                    <span className="text-2xl">🎉</span>
                    <div className="mt-1 text-[12px] font-extrabold leading-tight text-ink-900">All doses done</div>
                    <div className="text-[10px] font-semibold text-brand-600">for {slot.day}</div>
                    <div className="mt-0.5 text-[9px] font-bold text-ink-400">{fmtDate(dateForDay(slot.day))}</div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="mt-2 flex justify-end">
        <button
          onClick={() => openModal('full-schedule')}
          className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-600 hover:text-brand-700 transition-colors"
        >
          View full schedule <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </Card>
  )
}

export function GlanceCard({ className = '' }) {
  const [range, setRange] = useState('Today')
  const { glance, medications, users } = useApp()
  const donePct = glance.total ? Math.round((glance.takenCount / glance.total) * 100) : 0

  const perUser = users
    .map((u) => {
      const today = istCalendarDate()
      const mine = medications.filter((m) => m.scheduledToday && medActiveOn(m, today) && m.user === u.id)
      return { user: u, total: mine.length, taken: mine.filter((m) => m.taken).length }
    })
    .filter((x) => x.total > 0)

  return (
    <Card className={'flex flex-col p-4 ' + className}>
      <div className="flex items-center justify-between">
        <SectionTitle className="!text-[15px]">Today at a glance</SectionTitle>
        <Dropdown options={['Today', 'Yesterday', 'This Week']} value={range} onChange={setRange} />
      </div>

      <div className="mt-2 flex flex-1 flex-col justify-center gap-3">
        {/* Dose progress hero */}
        <div className="rounded-2xl bg-gradient-to-br from-brand-50 to-emerald-50/50 p-4">
          <div className="flex items-end justify-between">
            <div className="leading-none">
              <span className="text-[30px] font-extrabold text-ink-900">{glance.takenCount}</span>
              <span className="text-[16px] font-bold text-ink-400"> / {glance.total}</span>
              <div className="mt-1 text-[11px] font-semibold text-ink-500">doses taken today</div>
            </div>
            <div className="text-right leading-none">
              <div className="text-[22px] font-extrabold text-brand-600">{glance.adherence}%</div>
              <div className="mt-1 text-[10px] font-semibold text-ink-400">adherence</div>
            </div>
          </div>
          <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-white/80">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600 transition-all duration-500"
              style={{ width: `${donePct}%` }}
            />
          </div>
        </div>

        {/* By member */}
        <div>
          <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-ink-400">By member</div>
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {perUser.map(({ user, total, taken }) => (
              <div key={user.id} className="flex shrink-0 items-center gap-2 rounded-xl border border-line p-2">
                <UserAvatar user={user} className="h-7 w-7 text-[11px]" />
                <div className="leading-tight">
                  <div className="text-[11px] font-bold text-ink-900">{user.name}</div>
                  <div className="text-[10px] font-semibold text-ink-400">
                    {taken}/{total} taken
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  )
}
