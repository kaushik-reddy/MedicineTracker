import { ChevronRight, LogPlus, Pill, BellPlus, Download, RefreshCw, CheckCircle, Cart, Note, Users } from '../icons.jsx'
import { Card, SectionTitle, toneSoft, toneText, PillGlyph, UserAvatar, userTone, EmptyState, LoadingState } from '../ui.jsx'
import { quickActions } from '../data.js'
import { useApp } from '../store.jsx'
import { emptyByLabel } from '../time.js'

const actionIcon = { log: LogPlus, pill: Pill, bellplus: BellPlus, download: Download, refill: Cart, note: Note, users: Users }
const LOW_THRESHOLD = 10

// Segmented "dotted" progress: a row of thin vertical lines, filled up to pct.
function SegmentedBar({ pct, low }) {
  const N = 28
  const filled = Math.max(0, Math.min(N, Math.round((pct / 100) * N)))
  return (
    <div className="flex w-full items-center justify-between">
      {Array.from({ length: N }).map((_, i) => (
        <span
          key={i}
          className={
            'h-3 w-[2px] rounded-full transition-colors ' +
            (i < filled ? (low ? 'bg-warn-500' : 'bg-brand-500') : 'bg-line')
          }
        />
      ))}
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
  const { inventory, openRestock, usersById, dataLoading } = useApp()
  const lowCount = inventory.filter((it) => it.days <= LOW_THRESHOLD).length

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
            {inventory.map((it) => {
              const low = it.days <= LOW_THRESHOLD
              return (
                <div
                  key={it.name}
                  className={
                    'rounded-xl border p-2.5 transition-colors ' +
                    (low ? 'border-amber-200 bg-amber-50/40' : 'border-line bg-white')
                  }
                >
                  <div className="flex items-center gap-2.5">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-line bg-white">
                      <PillGlyph tone={it.tone} className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-[12px] font-bold text-ink-900">{it.name}</span>
                        <span className={'shrink-0 text-[12px] font-extrabold ' + (low ? 'text-warn-500' : 'text-ink-900')}>
                          {it.days}
                          <span className="text-[9px] font-semibold text-ink-400"> days</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-1 truncate text-[10px] text-ink-400">
                        {usersById[it.user] && (
                          <span className={'inline-flex items-center gap-1 font-bold ' + (userTone[usersById[it.user].tone] || userTone.brand).text}>
                            <UserAvatar user={usersById[it.user]} className="h-3.5 w-3.5 text-[7px]" />
                            {usersById[it.user].name}
                          </span>
                        )}
                        · Empty by <span className={low ? 'font-bold text-warn-500' : 'font-semibold text-ink-500'}>{emptyByLabel(it.days)}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => openRestock(it.name)}
                      className={
                        'inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1.5 text-[11px] font-bold transition-colors ' +
                        (low
                          ? 'bg-brand-500 text-white hover:bg-brand-600'
                          : 'border border-line text-ink-600 hover:bg-page')
                      }
                    >
                      <RefreshCw className="h-3 w-3" /> Restock
                    </button>
                  </div>
                  <div className="mt-2">
                    <SegmentedBar pct={it.pct} low={low} />
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
  const { openModal, openRestock, inventory, showToast } = useApp()

  const handle = (action) => {
    if (action === 'order-refill') {
      const lowest = [...inventory].sort((a, b) => a.days - b.days)[0]
      if (lowest) openRestock(lowest.name)
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
