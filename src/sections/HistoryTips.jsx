import { useState, useMemo } from 'react'
import { ChevronRight, Droplet, Clock, MoodFace, moodKey, MOOD_COLOR } from '../icons.jsx'
import { Card, SectionTitle, Illustration, userTone, EmptyState, LoadingState, PillGlyph, UserAvatar } from '../ui.jsx'
import { tips } from '../data.js'
import { useApp } from '../store.jsx'

export function HistoryCard({ className = '' }) {
  const { history, symptoms, openModal, usersById, dataLoading } = useApp()

  // Merge dose logs and symptom logs into one time-sorted feed.
  const feed = useMemo(() => {
    const doses = history.map((h) => ({ ...h, kind: 'dose' }))
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
    return [...doses, ...syms].sort((a, b) => (b.ts || 0) - (a.ts || 0))
  }, [history, symptoms])

  const sevBadge = {
    Mild: 'bg-brand-50 text-brand-600',
    Moderate: 'bg-amber-50 text-warn-500',
    Severe: 'bg-rose-50 text-coral-500',
  }

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
          <div className="space-y-1.5">
            {feed.map((h) => {
              const u = usersById[h.user]
              const uTone = (userTone[u?.tone] || userTone.brand).text
              if (h.kind === 'symptom') {
                return (
                  <div
                    key={h.id}
                    className="flex items-center gap-2.5 rounded-xl border border-line/60 bg-white py-2 pl-2 pr-2.5"
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-violet-50">
                      <MoodFace mood={h.mood} className={'h-5 w-5 ' + (MOOD_COLOR[moodKey(h.mood)] || 'text-accent-500')} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-[12px] font-bold text-ink-900">{h.name}</span>
                        {u && (
                          <span className={'inline-flex shrink-0 items-center gap-1 text-[10px] font-bold ' + uTone}>
                            <UserAvatar user={u} className="h-3.5 w-3.5 text-[7px]" />
                            {u.name}
                          </span>
                        )}
                      </div>
                      <div className="truncate text-[10px] text-ink-400">{h.date}</div>
                    </div>
                    <span
                      className={
                        'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ' +
                        (sevBadge[h.severity] || 'bg-violet-50 text-accent-600')
                      }
                    >
                      {h.severity || 'Mood'}
                    </span>
                  </div>
                )
              }
              const taken = h.status === 'Taken'
              return (
                <div
                  key={h.id}
                  className="flex items-center gap-2.5 rounded-xl border border-line/60 bg-white py-2 pl-2 pr-2.5"
                >
                  <span className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-lg border border-line bg-white">
                    <PillGlyph tone={h.tone} className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-[12px] font-bold text-ink-900">{h.name}</span>
                      {h.dose && <span className="shrink-0 text-[10px] font-medium text-ink-400">{h.dose}</span>}
                      {u && (
                        <span className={'inline-flex shrink-0 items-center gap-1 text-[10px] font-bold ' + uTone}>
                          <UserAvatar user={u} className="h-3.5 w-3.5 text-[7px]" />
                          {u.name}
                        </span>
                      )}
                    </div>
                    <div className="truncate text-[10px] text-ink-400">{h.date}</div>
                  </div>
                  <span
                    className={
                      'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ' +
                      (taken ? 'bg-brand-50 text-brand-600' : 'bg-amber-50 text-warn-500')
                    }
                  >
                    {h.status}
                  </span>
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
