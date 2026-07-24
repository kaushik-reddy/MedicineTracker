import { ChevronRight, LogPlus, Pill, BellPlus, Download, RefreshCw, CheckCircle, Cart, Note, Users } from '../icons.jsx'
import { Card, SectionTitle, toneSoft, toneText, PillGlyph, UserAvatar, userTone, EmptyState, LoadingState } from '../ui.jsx'
import { quickActions } from '../data.js'
import { useApp } from '../store.jsx'
import { emptyByLabel, stockView } from '../time.js'

const actionIcon = { log: LogPlus, pill: Pill, bellplus: BellPlus, download: Download, refill: Cart, note: Note, users: Users }
const LOW_THRESHOLD = 10

// Hex per tone so the segmented bar can use an inline gradient fade.
const barColor = { brand: '#16a970', accent: '#8b5cf6', coral: '#f43f5e', sky: '#0ea5e9', warn: '#f59e0b' }

// Equalizer-style progress: a row of thin bars that fade in toward the fill edge.
function SegmentedBar({ pct, low, tone = 'brand' }) {
  const N = 30
  const filled = Math.max(0, Math.min(N, Math.round((pct / 100) * N)))
  const color = low ? barColor.warn : barColor[tone] || barColor.brand
  return (
    <div className="flex h-4 w-full items-center gap-[2px]">
      {Array.from({ length: N }).map((_, i) => {
        const on = i < filled
        // brighter toward the leading (right-most filled) edge, faint at the start
        const opacity = on ? 0.4 + 0.6 * (filled > 1 ? i / (filled - 1) : 1) : 1
        return (
          <span
            key={i}
            className={'h-full flex-1 rounded-full ' + (on ? '' : 'bg-line')}
            style={on ? { backgroundColor: color, opacity } : undefined}
          />
        )
      })}
    </div>
  )
}

const ring = {
  brand: 'text-brand-500',
  accent: 'text-accent-500',
  coral: 'text-coral-500',
  warn: 'text-warn-500',
  sky: 'text-sky-500',
}

// Compact progress ring showing remaining stock for a single item.
function StockRing({ pct, tone, days }) {
  const r = 18
  const c = 2 * Math.PI * r
  return (
    <div className="relative h-12 w-12 shrink-0">
      <svg viewBox="0 0 44 44" className="h-full w-full -rotate-90">
        <circle cx="22" cy="22" r={r} fill="none" stroke="#eef1f5" strokeWidth="4" />
        <circle
          cx="22"
          cy="22"
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={`${(pct / 100) * c} ${c}`}
          className={ring[tone]}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className="text-[12px] font-extrabold text-ink-900">{days}</span>
        <span className="text-[7px] font-semibold text-ink-400">days</span>
      </div>
    </div>
  )
}

export function InventoryCard({ className = '' }) {
  const { inventory, medications, history, openRestock, usersById, dataLoading } = useApp()
  // Remaining stock is derived live: baseline units (from the medication) minus the
  // doses taken from history. This recomputes on every render/refresh, so counts and
  // the progress bar always match "units entered − doses taken".
  const rows = inventory.map((it) => {
    const med =
      medications.find((m) => m.id === it.medicationId) ||
      medications.find((m) => m.name === it.name && m.user === it.user)
    const view = stockView(it, med, history)
    return { it, ...view }
  })
  const lowCount = rows.filter((r) => r.days <= LOW_THRESHOLD).length

  return (
    <Card className={'flex flex-col p-4 ' + className}>
      <div className="flex items-center justify-between">
        <SectionTitle className="!text-[15px]">Medication Inventory</SectionTitle>
        {inventory.length === 0 ? null : lowCount > 0 ? (
          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-warn-500">{lowCount} low</span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-bold text-brand-600">
            <CheckCircle className="h-3 w-3" /> All stocked
          </span>
        )}
      </div>

      <div className="mt-2 flex flex-1 flex-col overflow-y-auto no-scrollbar">
        {dataLoading && inventory.length === 0 ? (
          <LoadingState label="Loading inventory…" />
        ) : inventory.length === 0 ? (
          <EmptyState icon={Pill} title="No inventory yet" hint="Stock is tracked automatically when you add a medication." />
        ) : (
          <div className="space-y-2">
            {rows.map(({ it, days, pct }) => {
              const low = days <= LOW_THRESHOLD
              const u = usersById[it.user]
              return (
                <div
                  key={it.id || it.name}
                  className={
                    'rounded-2xl border p-3 transition-colors ' +
                    (low ? 'border-amber-200 bg-amber-50/40' : 'border-line bg-white')
                  }
                >
                  {/* Top: identity */}
                  <div className="flex items-center gap-2.5">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-line bg-white">
                      <PillGlyph tone={it.tone} className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-bold text-ink-900">{it.name}</div>
                      <div className="flex items-center gap-1 truncate text-[10px] text-ink-400">
                        {u && (
                          <span className={'inline-flex items-center gap-1 font-bold ' + (userTone[u.tone] || userTone.brand).text}>
                            <UserAvatar user={u} className="h-3.5 w-3.5 text-[7px]" />
                            {u.name}
                          </span>
                        )}
                        <span>· Empty by </span>
                        <span className={low ? 'font-bold text-warn-500' : 'font-semibold text-ink-500'}>{emptyByLabel(days)}</span>
                      </div>
                    </div>
                    {low && (
                      <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-warn-500">
                        Low
                      </span>
                    )}
                  </div>

                  {/* Bottom: bar (≈3/4) + days count & restock on the right */}
                  <div className="mt-2.5 flex items-center gap-3">
                    <div className="min-w-0 flex-[3]">
                      <SegmentedBar pct={pct} low={low} tone={it.tone} />
                    </div>
                    <div className="flex flex-1 items-center justify-end gap-2">
                      <div className="text-right leading-none">
                        <div className={'text-[15px] font-extrabold ' + (low ? 'text-warn-500' : 'text-ink-900')}>
                          {days}
                        </div>
                        <div className="text-[8px] font-semibold uppercase tracking-wide text-ink-400">days left</div>
                      </div>
                      <button
                        onClick={() => openRestock(it.id)}
                        title="Restock"
                        className={
                          'grid h-8 w-8 shrink-0 place-items-center rounded-full transition-colors ' +
                          (low
                            ? 'bg-brand-500 text-white hover:bg-brand-600'
                            : 'border border-line text-ink-600 hover:bg-page')
                        }
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                      </button>
                    </div>
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

export function QuickActionsCard({ className = '' }) {
  const { openModal, openRestock, inventory, medications, history, showToast } = useApp()

  const handle = (action) => {
    if (action === 'order-refill') {
      // Pick the item with the fewest days left, using derived remaining stock.
      const lowest = [...inventory]
        .map((it) => {
          const med =
            medications.find((m) => m.id === it.medicationId) ||
            medications.find((m) => m.name === it.name && m.user === it.user)
          return { it, days: stockView(it, med, history).days }
        })
        .sort((a, b) => a.days - b.days)[0]
      if (lowest) openRestock(lowest.it.id)
      else showToast('Everything is well stocked', 'brand')
    } else {
      openModal(action)
    }
  }

  return (
    <Card className={'flex flex-col p-4 ' + className}>
      <SectionTitle className="!text-[15px]">Quick Actions</SectionTitle>

      <div className="mt-2 flex flex-1 flex-col justify-between gap-2">
        {quickActions.map((a) => {
          const Icon = actionIcon[a.icon]
          return (
            <button
              key={a.title}
              onClick={() => handle(a.action)}
              className="group flex w-full items-center justify-between rounded-xl border border-line p-1.5 text-left hover:border-brand-200 hover:bg-page transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className={'grid h-8 w-8 place-items-center rounded-lg ' + toneSoft[a.tone]}>
                  <Icon className="h-4 w-4" />
                </span>
                <div className="leading-tight">
                  <div className="text-[12px] font-bold text-ink-900">{a.title}</div>
                  <div className="text-[10px] text-ink-400">{a.body}</div>
                </div>
              </div>
              <ChevronRight
                className={'h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 ' + toneText[a.tone]}
              />
            </button>
          )
        })}
      </div>
    </Card>
  )
}
