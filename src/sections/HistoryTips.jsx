import { useState, useMemo } from 'react'
import { ChevronRight, Droplet, Footprints, Moon, Clock, MoodFace, moodKey, MOOD_COLOR } from '../icons.jsx'
import { Card, SectionTitle, Illustration, userTone, EmptyState, LoadingState, PillGlyph } from '../ui.jsx'
import { tips } from '../data.js'
import { useApp } from '../store.jsx'
import { collapseDoseHistory } from '../time.js'

export function HistoryCard({ className = '' }) {
  const { history, symptoms, trackerEvents, openModal, usersById, dataLoading } = useApp()

  // Merge dose logs, symptom logs and tracker events into one time-sorted feed.
  // Dose rows are collapsed so a dose that was snoozed/rescheduled before being
  // taken shows once.
  const feed = useMemo(() => {
    const doses = collapseDoseHistory(history).map((h) => ({ ...h, kind: 'dose' }))
    const syms = symptoms.map((s) => ({
      kind: 'symptom',
      id: 'sym-' + s.id,
      ts: s.ts,
      name: s.name,
      mood: s.mood,
      severity: s.severity,
      user: s.user,
      date: s.ts
        ? new Date(s.ts).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
        : 'Today',
    }))
    const trk = (trackerEvents || []).map((e) => ({
      kind: 'tracker',
      id: 'trk-' + e.id,
      ts: e.ts,
      tkind: e.kind,
      amount: e.amount,
      total: e.total,
      date: e.ts
        ? new Date(e.ts).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
        : 'Today',
    }))
    return [...doses, ...syms, ...trk].sort((a, b) => (b.ts || 0) - (a.ts || 0))
  }, [history, symptoms, trackerEvents])

  const statusTone = {
    Taken: 'text-brand-600',
    Skipped: 'text-warn-500',
    Missed: 'text-coral-500',
    Snoozed: 'text-warn-500',
    Rescheduled: 'text-accent-600',
  }

  const sevTone = {
    Mild: 'text-brand-600',
    Moderate: 'text-warn-500',
    Severe: 'text-coral-500',
  }

  // Per-tracker presentation for the feed rows.
  const TRK = {
    water: { icon: Droplet, label: 'Water', chip: 'bg-sky-50 text-sky-600', tone: 'text-sky-600' },
    steps: { icon: Footprints, label: 'Steps', chip: 'bg-brand-50 text-brand-600', tone: 'text-brand-600' },
    sleep: { icon: Moon, label: 'Sleep', chip: 'bg-violet-50 text-accent-600', tone: 'text-accent-600' },
  }
  const trkAmount = (kind, n) => {
    const a = Math.abs(n)
    if (kind === 'water') return `${a} ml`
    if (kind === 'steps') return a.toLocaleString()
    return `${a} min`
  }
  const trkTotal = (kind, t) => {
    if (kind === 'water') return `${t} ml today`
    if (kind === 'steps') return `${t.toLocaleString()} steps today`
    return `${Math.floor(t / 60)}h ${t % 60}m today`
  }

  // Short chat-style timestamp, e.g. "1:20pm".
  const shortTime = (ts) =>
    ts
      ? new Date(ts)
          .toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
          .toLowerCase()
          .replace(/\s/g, '')
      : ''

  return (
    <Card className={'flex flex-col p-4 ' + className}>
      <div className="flex items-center justify-between">
        <SectionTitle className="!text-[15px]">Recent History</SectionTitle>
        <button
          onClick={() => openModal('history-log')}
          className="inline-flex items-center gap-0.5 text-[11px] font-bold text-brand-600 hover:text-brand-700 transition-colors"
        >
          View all <ChevronRight className="h-3 w-3" />
        </button>
      </div>

      <div className="mt-2 flex flex-1 flex-col overflow-y-auto no-scrollbar">
        {dataLoading && feed.length === 0 ? (
          <LoadingState label="Loading history…" />
        ) : feed.length === 0 ? (
          <EmptyState icon={Clock} title="No history yet" hint="Doses you take or skip and symptoms you log will show up here." />
        ) : (
          <div className="space-y-0.5">
            {feed.map((h) => {
              const u = usersById[h.user]
              const uTone = (userTone[u?.tone] || userTone.brand).text
              const time = shortTime(h.ts)

              if (h.kind === 'tracker') {
                const t = TRK[h.tkind]
                const Icon = t.icon
                const up = h.amount > 0
                return (
                  <div
                    key={h.id}
                    className="flex items-start gap-3 rounded-2xl px-1.5 py-2 hover:bg-page/70 transition-colors"
                  >
                    <span className={'grid h-10 w-10 shrink-0 place-items-center rounded-full ' + t.chip}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-[13px] font-bold text-ink-900">{t.label}</span>
                        <span className="shrink-0 text-[11px] font-medium text-ink-400">{time}</span>
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-ink-500">
                        <span className={'font-bold ' + t.tone}>
                          {up ? '+' : '−'}
                          {trkAmount(h.tkind, h.amount)}
                        </span>{' '}
                        · {trkTotal(h.tkind, h.total)}
                      </p>
                    </div>
                  </div>
                )
              }

              if (h.kind === 'symptom') {
                return (
                  <div
                    key={h.id}
                    className="flex items-start gap-3 rounded-2xl px-1.5 py-2 hover:bg-page/70 transition-colors"
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-violet-50">
                      <MoodFace mood={h.mood} className={'h-6 w-6 ' + (MOOD_COLOR[moodKey(h.mood)] || 'text-accent-500')} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-[13px] font-bold text-ink-900">{h.name}</span>
                        <span className="shrink-0 text-[11px] font-medium text-ink-400">{time}</span>
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-ink-500">
                        <span className={'font-bold ' + (sevTone[h.severity] || 'text-accent-600')}>
                          {h.severity || 'Mood'}
                        </span>
                        {u && (
                          <>
                            {' · logged by '}
                            <span className={'font-bold ' + uTone}>{u.name}</span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                )
              }

              const moved = h.status === 'Snoozed' || h.status === 'Rescheduled'
              return (
                <div
                  key={h.id}
                  className="flex items-start gap-3 rounded-2xl px-1.5 py-2 hover:bg-page/70 transition-colors"
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full border border-line bg-white">
                    <PillGlyph tone={h.tone} className="h-6 w-6" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-[13px] font-bold text-ink-900">
                        {h.name}
                        {h.dose && <span className="ml-1 font-medium text-ink-400">{h.dose}</span>}
                      </span>
                      <span className="shrink-0 text-[11px] font-medium text-ink-400">{time}</span>
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-ink-500">
                      <span className={'font-bold ' + (statusTone[h.status] || 'text-warn-500')}>{h.status}</span>
                      {moved && h.scheduled && h.marked ? (
                        <> {` · ${h.scheduled} → ${h.marked}`}</>
                      ) : (
                        u && (
                          <>
                            {' · by '}
                            <span className={'font-bold ' + uTone}>{u.name}</span>
                          </>
                        )
                      )}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </Card>
  )
}

export function TipsCard({ className = '' }) {
  const { showToast } = useApp()
  const [tip, setTip] = useState(0)
  return (
    <Card className={'flex flex-col p-4 ' + className}>
      <SectionTitle className="!text-[15px]">Health Tips for You</SectionTitle>

      <div className="mt-2 flex flex-1 items-stretch overflow-hidden rounded-xl bg-gradient-to-br from-brand-50 to-emerald-50/50">
        <div className="m-2 flex w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white">
          <Illustration src="/assets/water.png" label="Water" className="h-full w-full" />
        </div>
        <div className="flex flex-1 flex-col justify-center p-2 pr-3">
          <div className="flex items-center gap-1.5">
            <Droplet className="h-4 w-4 text-sky-500" />
            <h3 className="text-[15px] font-extrabold text-ink-900">{tips[tip].title}</h3>
          </div>
          <p className="mt-1 text-[11px] leading-snug text-ink-600">{tips[tip].body}</p>
          <button
            onClick={() => showToast(`Tip: ${tips[tip].title}`, 'sky')}
            className="mt-2 w-fit rounded-full border border-line bg-white px-3 py-1 text-[10px] font-bold text-ink-700 hover:bg-page transition-colors"
          >
            Learn more
          </button>
        </div>
      </div>

      <div className="mt-2 flex justify-center gap-1.5">
        {tips.map((_, i) => (
          <button
            key={i}
            onClick={() => setTip(i)}
            className={
              'h-1.5 rounded-full transition-all ' +
              (i === tip ? 'w-5 bg-brand-500' : 'w-1.5 bg-brand-200 hover:bg-brand-300')
            }
            aria-label={`Tip ${i + 1}`}
          />
        ))}
      </div>
    </Card>
  )
}
