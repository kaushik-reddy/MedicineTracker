import { useState } from 'react'
import { CheckCircle, Bell, TrendingUp, SkipForward, RefreshCw } from '../icons.jsx'
import { Card, Illustration, UserChip } from '../ui.jsx'
import { useApp } from '../store.jsx'
import { useNow, formatCountdown, isOverdue, istTimeLabel, addMinutesToTime } from '../time.js'

export function HeroCard({ className = '' }) {
  return (
    <Card className={'relative flex overflow-hidden ' + className}>
      <div className="flex flex-1 items-center gap-2 py-3 pl-5 pr-3">
        <div className="flex-1">
          <h1 className="text-2xl font-extrabold leading-tight text-ink-900">
            Good morning,
            <br />
            Kaushik! <span>👋</span>
          </h1>
          <p className="mt-1.5 text-[13px] text-ink-500">Stay consistent, stay healthy.</p>

          <div className="mt-4 inline-flex items-center gap-2.5 rounded-2xl bg-brand-50/80 px-3 py-2">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-white text-base">🌱</span>
            <div className="leading-tight">
              <div className="text-[11px] font-medium text-ink-500">You're doing great!</div>
              <div className="text-[12px] font-bold text-brand-600">87% adherence this week</div>
            </div>
            <TrendingUp className="ml-1 h-4 w-4 text-brand-400" />
          </div>
        </div>

        <Illustration
          src="/assets/hero.png"
          label="3D Pill"
          className="max-h-full max-w-[240px] shrink-0 self-center object-contain"
        />
      </div>
      <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-brand-100/50 blur-2xl" />
    </Card>
  )
}

export function NextDoseCard({ className = '' }) {
  const { nextDose, requestConfirm, usersById } = useApp()
  const now = useNow(1000)
  const [menu, setMenu] = useState(null) // 'snooze' | 'reschedule'
  const [reTime, setReTime] = useState('')

  if (!nextDose) {
    return (
      <Card className={'flex flex-col items-center justify-center p-4 text-center ' + className}>
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-600">
          <CheckCircle className="h-7 w-7" />
        </span>
        <div className="mt-3 text-[15px] font-extrabold text-ink-900">All doses done!</div>
        <div className="mt-1 text-[12px] text-ink-500">You're all caught up for today. 🎉</div>
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
        <div className="text-[14px] font-bold text-ink-900">{nextDose.name}</div>
        <UserChip user={usersById[nextDose.user]} />
      </div>
      <div className="text-[12px] text-ink-500">{nextDose.detail}</div>

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
