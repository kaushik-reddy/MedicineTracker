import { useState } from 'react'
import { CheckCircle, Bell, TrendingUp, SkipForward, RefreshCw } from '../icons.jsx'
import { Card, Illustration, UserChip } from '../ui.jsx'
import { useApp } from '../store.jsx'
import { user } from '../data.js'
import { useNow, formatCountdown, isOverdue, istTimeLabel, addMinutesToTime } from '../time.js'

export function HeroCard({ className = '' }) {
  const { glance, latestSymptom } = useApp()
  const firstName = (user.name || '').trim().split(' ')[0] || 'there'
  const hasData = glance.total > 0
  return (
    <Card className={'relative flex overflow-hidden ' + className}>
      <div className="flex flex-1 items-center gap-2 py-3 pl-5 pr-3">
        <div className="flex-1">
          <h1 className="text-xl font-extrabold leading-tight text-ink-900 sm:text-2xl">
            Good morning,
            <br />
            {firstName}! <span>👋</span>
          </h1>
          <p className="mt-1.5 text-[13px] text-ink-500">Stay consistent, stay healthy.</p>

          <div className="mt-4 inline-flex items-center gap-2.5 rounded-2xl bg-brand-50/80 px-3 py-2">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-white text-base">🌱</span>
            <div className="leading-tight">
              <div className="text-[11px] font-medium text-ink-500">{hasData ? "You're doing great!" : 'Welcome to MediTrack'}</div>
              <div className="text-[12px] font-bold text-brand-600">
                {hasData ? `${glance.adherence}% adherence today` : 'Add a member to get started'}
              </div>
            </div>
            <TrendingUp className="ml-1 h-4 w-4 text-brand-400" />
          </div>

          {latestSymptom && (
            <div className="mt-2 flex items-center gap-1.5 text-[11px]">
              <span className="text-[14px] leading-none">{latestSymptom.mood || '📝'}</span>
              <span className="font-semibold text-ink-500">Recent:</span>
              <span className="max-w-[150px] truncate font-bold text-accent-600">{latestSymptom.name}</span>
              {latestSymptom.severity && <span className="text-ink-400">· {latestSymptom.severity}</span>}
            </div>
          )}
        </div>

        <Illustration
          src="/assets/hero.png"
          label="3D Pill"
          className="max-h-full w-[110px] shrink-0 self-center object-contain sm:w-auto sm:max-w-[240px]"
        />
      </div>
      <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-brand-100/50 blur-2xl" />
    </Card>
  )
}

export function NextDoseCard({ className = '' }) {
  const { nextDose, schedule, dataLoading, requestConfirm, usersById } = useApp()
  const now = useNow(1000)
  const [menu, setMenu] = useState(null) // 'snooze' | 'reschedule'
  const [reTime, setReTime] = useState('')

  if (!nextDose) {
    const loading = dataLoading && schedule.length === 0
    const allDone = schedule.length > 0
    return (
      <Card className={'flex flex-col items-center justify-center p-4 text-center ' + className}>
        {loading ? (
          <>
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-brand-500" />
            <div className="mt-3 text-[13px] font-semibold text-ink-400">Loading your next dose…</div>
          </>
        ) : (
          <>
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-600">
              <CheckCircle className="h-7 w-7" />
            </span>
            <div className="mt-3 text-[15px] font-extrabold text-ink-900">
              {allDone ? 'All doses done!' : 'No doses scheduled'}
            </div>
            <div className="mt-1 text-[12px] text-ink-500">
              {allDone ? "You're all caught up for today. 🎉" : 'Add a medication to see your next dose here.'}
            </div>
          </>
        )}
      </Card>
    )
  }

  const overdue = isOverdue(nextDose.time, now)
  const snoozeOpts = [
    { label: '15 min', mins: 15 },
    { label: '30 min', mins: 30 },
    { label: '1 hour', mins: 60 },
    { label: '2 hours', mins: 120 },
  ]

  const openReschedule = () => {
    setReTime(nextDose.time)
    setMenu(menu === 'reschedule' ? null : 'reschedule')
  }

  return (
    <Card className={'relative flex flex-col p-4 ' + className}>
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-semibold text-ink-500">Your Next Dose</span>
        <span
          className={
            'rounded-full px-2 py-0.5 text-[10px] font-bold ' +
            (overdue ? 'bg-rose-50 text-coral-500' : 'bg-brand-50 text-brand-600')
          }
        >
          {overdue ? 'Overdue' : 'On time'}
        </span>
      </div>

      <div className="mt-2 text-[26px] font-extrabold leading-none tracking-tight text-ink-900">{nextDose.time}</div>
      <div className={'mt-1 text-[12px] font-semibold tabular-nums ' + (overdue ? 'text-coral-500' : 'text-ink-400')}>
        {formatCountdown(nextDose.time, now)}
      </div>

      <div className="my-2 h-px bg-line" />

      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1 truncate text-[14px] font-bold text-ink-900">{nextDose.name}</div>
        <UserChip user={usersById[nextDose.user]} />
      </div>
      <div className="truncate text-[12px] text-ink-500">{nextDose.detail}</div>

      <div className="mt-auto pt-3">
        <button
          onClick={() => requestConfirm({ kind: 'taken', medId: nextDose.id, fromTime: nextDose.time })}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 py-2.5 text-[13px] font-bold text-white hover:bg-brand-600 transition-colors"
        >
          <CheckCircle className="h-4 w-4" />
          Mark as Taken
        </button>

        <div className="mt-2 grid grid-cols-3 gap-2">
          <div className="relative">
            <button
              onClick={() => setMenu(menu === 'snooze' ? null : 'snooze')}
              className="flex w-full items-center justify-center gap-1 rounded-xl border border-line py-2 text-[11px] font-bold text-ink-600 hover:bg-page transition-colors"
            >
              <Bell className="h-3.5 w-3.5" /> Snooze
            </button>
            {menu === 'snooze' && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenu(null)} />
                <div className="absolute bottom-full left-0 z-20 mb-1.5 w-28 overflow-hidden rounded-xl border border-line bg-white p-1 shadow-lg">
                  {snoozeOpts.map((o) => (
                    <button
                      key={o.mins}
                      onClick={() => {
                        setMenu(null)
                        requestConfirm({
                          kind: 'snooze',
                          medId: nextDose.id,
                          fromTime: nextDose.time,
                          toTime: addMinutesToTime(nextDose.time, o.mins),
                          mins: o.mins,
                        })
                      }}
                      className="block w-full rounded-lg px-2.5 py-1.5 text-left text-[12px] font-semibold text-ink-700 hover:bg-page"
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <button
            onClick={() => requestConfirm({ kind: 'skip', medId: nextDose.id, fromTime: nextDose.time })}
            className="flex w-full items-center justify-center gap-1 rounded-xl border border-line py-2 text-[11px] font-bold text-ink-600 hover:bg-page transition-colors"
          >
            <SkipForward className="h-3.5 w-3.5" /> Skip
          </button>

          <div className="relative">
            <button
              onClick={openReschedule}
              className="flex w-full items-center justify-center gap-1 rounded-xl border border-line py-2 text-[11px] font-bold text-ink-600 hover:bg-page transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Move
            </button>
            {menu === 'reschedule' && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenu(null)} />
                <div className="absolute bottom-full right-0 z-20 mb-1.5 w-40 rounded-xl border border-line bg-white p-2 shadow-lg">
                  <div className="text-[10px] font-semibold text-ink-500">New time (IST)</div>
                  <input
                    value={reTime}
                    onChange={(e) => setReTime(e.target.value)}
                    placeholder={istTimeLabel(now)}
                    className="mt-1 w-full rounded-lg border border-line px-2 py-1.5 text-[12px] font-medium text-ink-900 outline-none focus:border-brand-400"
                  />
                  <button
                    onClick={() => {
                      const t = reTime.trim()
                      setMenu(null)
                      if (t) requestConfirm({ kind: 'move', medId: nextDose.id, fromTime: nextDose.time, toTime: t })
                    }}
                    className="mt-1.5 w-full rounded-lg bg-brand-500 py-1.5 text-[11px] font-bold text-white hover:bg-brand-600 transition-colors"
                  >
                    Reschedule
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}
