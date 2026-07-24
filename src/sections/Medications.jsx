import { useState, useMemo } from 'react'
import { Plus, CheckCircle, Clock, Sun, Moon, Flame, Close, Pill } from '../icons.jsx'
import { Card, SectionTitle, Dropdown, toneBar, MedGlyph, UserAvatar, userTone, EmptyState, LoadingState } from '../ui.jsx'
import { useApp } from '../store.jsx'
import { medActiveOn, istCalendarDate, sameDay, addDays, collapseDoseHistory } from '../time.js'

const periodMeta = {
  am: { Icon: Sun, color: 'text-amber-500' },
  day: { Icon: Sun, color: 'text-amber-500' },
  pm: { Icon: Moon, color: 'text-indigo-500' },
}

function StatusBadge({ med }) {
  if (!med.scheduledToday)
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-page px-2 py-0.5 text-[11px] font-bold text-ink-400">
        Off schedule
      </span>
    )
  const s = med.taken ? 'taken' : med.skipped ? 'skipped' : 'upcoming'
  const cls = {
    taken: 'bg-brand-50 text-brand-600',
    skipped: 'bg-amber-50 text-warn-500',
    upcoming: 'bg-violet-50 text-accent-600',
  }[s]
  const Icon = s === 'taken' ? CheckCircle : s === 'skipped' ? Close : Clock
  const text = s === 'taken' ? 'Taken' : s === 'skipped' ? 'Skipped' : 'Upcoming'
  return (
    <span className={'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ' + cls}>
      <Icon className="h-3 w-3" />
      {text}
    </span>
  )
}

function AdherenceRing({ value }) {
  const r = 54
  const c = 2 * Math.PI * r
  const dash = (value / 100) * c
  return (
    <div className="relative mx-auto h-24 w-24">
      <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90">
        <circle cx="64" cy="64" r={r} fill="none" stroke="#f1eefb" strokeWidth="12" />
        <circle
          cx="64"
          cy="64"
          r={r}
          fill="none"
          stroke="#8b5cf6"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-extrabold text-ink-900">{value}%</span>
        <span className="text-[10px] font-semibold text-accent-500">Great Job!</span>
      </div>
    </div>
  )
}

export function MedsCard({ className = '' }) {
  const { medications, openModal, openMedDetails, usersById, dataLoading } = useApp()

  return (
    <Card className={'flex flex-col p-4 ' + className}>
      <div className="flex items-center justify-between">
        <SectionTitle className="!text-[15px]">Your Medications</SectionTitle>
        <button
          onClick={() => openModal('add-medication')}
          className="inline-flex items-center gap-1 rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1.5 text-[11px] font-bold text-brand-600 hover:bg-brand-100 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" /> Add Medication
        </button>
      </div>

      <div className="mt-3 flex flex-1 flex-col overflow-y-auto no-scrollbar">
        {dataLoading && medications.length === 0 ? (
          <LoadingState label="Loading medications…" />
        ) : medications.length === 0 ? (
          <EmptyState icon={Pill} title="No medications yet" hint="Tap “Add Medication” to add your first one." />
        ) : (
          <div className="space-y-2">
            {medications.map((m) => {
              const { Icon: PIcon, color } = periodMeta[m.period] || periodMeta.am
              const u = usersById[m.user]
              const uTone = (userTone[u?.tone] || userTone.brand).text
              return (
                <button
                  key={m.id}
                  onClick={() => openMedDetails(m.id)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-line/70 bg-white p-2.5 text-left transition-colors hover:border-brand-200 hover:bg-page/40"
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl border border-line bg-white">
                    <MedGlyph med={m} className="h-7 w-7" />
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-bold text-ink-900">{m.name}</div>
                    <div className="truncate text-[10px] text-ink-400">
                      {u && <span className={'font-bold ' + uTone}>{u.name}</span>} · {m.sub} · {m.dosage} • {m.unit}
                    </div>
                  </div>

                  {u && <UserAvatar user={u} className="h-6 w-6 text-[10px]" />}

                  <span className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-line px-2 py-1 text-[11px] font-semibold text-ink-700">
                    <PIcon className={'h-3.5 w-3.5 ' + color} />
                    {m.time}
                  </span>

                  <div className="shrink-0">
                    <StatusBadge med={m} />
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </Card>
  )
}

export function AdherenceCard({ className = '' }) {
  const [range, setRange] = useState('This Week')
  const { users, medications, history, dataLoading } = useApp()

  // Adherence over the selected range, derived from the dose-log history.
  // Collapse repeated snooze/reschedule rows so each dose counts once, and a dose
  // that was delayed but eventually taken still counts as fully adhered.
  const rangeDays = range === 'This Year' ? 365 : range === 'This Month' ? 30 : 7
  const rangeLabel = range === 'This Year' ? 'this year' : range === 'This Month' ? 'this month' : 'this week'
  const doses = useMemo(() => collapseDoseHistory(history), [history])
  // Today's doses that are still due (added/scheduled but not yet taken or skipped).
  // History only has logged doses, so these must be added to the denominator or a
  // pending dose (e.g. a medicine you just added) wouldn't count — showing 6/6 when
  // it should be 6/7.
  const pendingToday = useMemo(() => {
    const today = istCalendarDate()
    return medications.filter((m) => m.scheduledToday && medActiveOn(m, today) && !m.taken && !m.skipped).length
  }, [medications])
  const rangeStats = useMemo(() => {
    const cutoff = Date.now() - rangeDays * 86400000
    const entries = doses.filter((e) => e.ts >= cutoff)
    const taken = entries.filter((e) => e.status === 'Taken').length
    const total = entries.length + pendingToday
    return { total, taken, pct: total ? Math.round((taken / total) * 100) : 0 }
  }, [doses, rangeDays, pendingToday])

  const perUser = users
    .map((u) => {
      const today = istCalendarDate()
      const mine = medications.filter((m) => m.scheduledToday && medActiveOn(m, today) && m.user === u.id)
      const pct = mine.length ? Math.round((mine.filter((m) => m.taken).length / mine.length) * 100) : 0
      return { user: u, pct, total: mine.length }
    })
    .filter((x) => x.total > 0)

  // Last 7 IST days adherence, from collapsed doses. A day is 100% when every dose
  // that day was eventually taken (delays via snooze/reschedule don't break it).
  const streak = useMemo(() => {
    const letters = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
    const today = istCalendarDate()
    const out = []
    for (let i = 6; i >= 0; i--) {
      const d = addDays(today, -i)
      const entries = doses.filter((e) => e.ts && sameDay(istCalendarDate(e.ts), d))
      const total = entries.length
      const taken = entries.filter((e) => e.status === 'Taken').length
      const value = total ? Math.round((taken / total) * 100) : 0
      out.push({ day: letters[d.getDay()], value, total, tone: 'brand' })
    }
    return out
  }, [doses])

  // Consecutive fully-adherent days ending today.
  const streakDays = useMemo(() => {
    let n = 0
    for (let i = streak.length - 1; i >= 0; i--) {
      if (streak[i].total > 0 && streak[i].value === 100) n++
      else break
    }
    return n
  }, [streak])

  return (
    <Card className={'flex flex-col p-4 ' + className}>
      <div className="flex items-center justify-between">
        <SectionTitle className="!text-[15px]">Adherence</SectionTitle>
        <Dropdown options={['This Week', 'This Month', 'This Year']} value={range} onChange={setRange} />
      </div>

      {dataLoading && medications.length === 0 && history.length === 0 ? (
        <LoadingState label="Loading adherence…" className="mt-1" />
      ) : (
      <>
      <div className="mt-1 flex items-center gap-3">
        <div className="flex flex-col items-center">
          <AdherenceRing value={rangeStats.pct} />
          <p className="mt-1 text-center text-[10px] font-medium text-ink-500">
            {rangeStats.total ? `${rangeStats.taken} of ${rangeStats.total} ${rangeLabel}` : `No doses ${rangeLabel}`}
          </p>
        </div>

        <div className="flex-1 border-l border-line pl-3">
          <div className="text-[11px] font-semibold text-ink-400">Streak</div>
          <div className="mt-0.5 flex items-center gap-1.5">
            <Flame className="h-4 w-4" />
            <span className="text-[15px] font-extrabold text-ink-900">{streakDays} {streakDays === 1 ? 'Day' : 'Days'}</span>
          </div>
          <div className="text-[10px] font-medium text-ink-400">{streakDays ? 'Keep it going!' : 'Log doses to build a streak'}</div>

          <div className="mt-2 flex items-end gap-1">
            {streak.map((s, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                <div className="flex h-9 items-end">
                  <div className={'w-2 rounded-full ' + toneBar[s.tone]} style={{ height: `${Math.max(s.value, 4)}%` }} />
                </div>
                <span className="text-[9px] font-semibold text-ink-400">{s.day}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* By member (horizontal scroll for many members) */}
      <div className="mt-2 border-t border-line pt-2">
        <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-ink-400">By member (today)</div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {perUser.map(({ user, pct }) => (
            <div key={user.id} className="flex shrink-0 items-center gap-1.5 rounded-xl border border-line px-2 py-1.5">
              <UserAvatar user={user} className="h-6 w-6 text-[10px]" />
              <div className="leading-tight">
                <div className="text-[10px] font-bold text-ink-900">{user.name}</div>
                <div className={'text-[11px] font-extrabold ' + (userTone[user.tone] || userTone.brand).text}>{pct}%</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      </>
      )}
    </Card>
  )
}
