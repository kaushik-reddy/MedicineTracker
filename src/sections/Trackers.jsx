import { useState } from 'react'
import { Droplet, Footprints, Moon, Plus, RotateCcw } from '../icons.jsx'
import { Card, SectionTitle } from '../ui.jsx'
import { useApp } from '../store.jsx'

const fmtHours = (mins) => {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

const dayKey = (d) => {
  const p = (x) => String(x).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

// Stock-style change of today's value vs the value N days ago (null when no data).
function buildCompare(rows, key, today) {
  const map = Object.fromEntries(rows.map((r) => [r.date, r[key]]))
  const base = new Date()
  const at = (off) => {
    const d = new Date(base)
    d.setDate(base.getDate() - off)
    return map[dayKey(d)]
  }
  const mk = (label, off) => {
    const past = at(off)
    if (past == null || past === 0) return { label, delta: null }
    return { label, delta: Math.round(((today - past) / past) * 100) }
  }
  return [mk('1D', 1), mk('1W', 7), mk('1M', 30), mk('1Y', 365)]
}

// Light tone bundle (sky uses the default palette; brand/accent are custom).
const TONES = {
  sky: { soft: 'bg-sky-50 text-sky-600', ring: 'text-sky-500', btn: 'bg-sky-50 text-sky-600 hover:bg-sky-100', add: 'bg-sky-500 hover:bg-sky-600' },
  brand: { soft: 'bg-brand-50 text-brand-600', ring: 'text-brand-500', btn: 'bg-brand-50 text-brand-600 hover:bg-brand-100', add: 'bg-brand-500 hover:bg-brand-600' },
  accent: { soft: 'bg-violet-50 text-accent-600', ring: 'text-accent-500', btn: 'bg-violet-50 text-accent-600 hover:bg-violet-100', add: 'bg-accent-500 hover:bg-accent-600' },
}

// Static progress ring with the percentage in the centre.
function Ring({ pct, tone }) {
  const r = 30
  const c = 2 * Math.PI * r
  const h = Math.max(0, Math.min(100, pct))
  return (
    <div className="relative h-[76px] w-[76px] shrink-0">
      <svg viewBox="0 0 72 72" className="h-full w-full -rotate-90">
        <circle cx="36" cy="36" r={r} fill="none" stroke="#eef1f5" strokeWidth="7" />
        <circle
          cx="36"
          cy="36"
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={`${(h / 100) * c} ${c}`}
          className={tone.ring}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[17px] font-extrabold text-ink-900">{pct}%</span>
      </div>
    </div>
  )
}

// Four stock-style change readouts (1D / 1W / 1M / 1Y) vs today.
function Comparisons({ items }) {
  return (
    <div className="grid grid-cols-4 gap-1">
      {items.map((c) => {
        const up = c.delta != null && c.delta > 0
        const down = c.delta != null && c.delta < 0
        const color = up ? 'text-brand-600' : down ? 'text-coral-500' : 'text-ink-400'
        return (
          <div key={c.label} className="flex flex-col items-center rounded-lg bg-page py-1">
            <span className="text-[8px] font-bold uppercase tracking-wide text-ink-400">{c.label}</span>
            <span className={'mt-0.5 text-[10px] font-extrabold leading-none ' + color}>
              {c.delta == null ? '—' : `${up ? '▲' : down ? '▼' : '•'}${Math.abs(c.delta)}%`}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function QuickRow({ quick, undo, onAdd, tone }) {
  return (
    <div className="flex items-center gap-1.5">
      {quick.map((q) => (
        <button
          key={q.label}
          onClick={() => onAdd(q.amount)}
          className={'flex-1 rounded-xl py-1.5 text-[11px] font-bold transition-colors ' + tone.btn}
        >
          <span className="inline-flex items-center gap-0.5">
            <Plus className="h-3 w-3" />
            {q.label}
          </span>
        </button>
      ))}
      <button
        onClick={() => onAdd(undo)}
        title="Undo"
        className="grid h-[30px] w-8 shrink-0 place-items-center rounded-xl border border-line text-ink-400 transition-colors hover:bg-page hover:text-ink-700"
      >
        <RotateCcw className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

// Free-form custom amount entry, added on top of the preset buttons.
function CustomAdd({ onAdd, unit, tone }) {
  const [val, setVal] = useState('')
  const submit = () => {
    const n = parseInt(val, 10)
    if (Number.isFinite(n) && n > 0) {
      onAdd(n)
      setVal('')
    }
  }
  return (
    <div className="flex items-center gap-1.5">
      <input
        type="number"
        inputMode="numeric"
        min="0"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        placeholder={`Custom ${unit}`}
        className="no-spin min-w-0 flex-1 rounded-xl border border-line bg-white px-2.5 py-1.5 text-[11px] font-semibold text-ink-900 outline-none placeholder:text-ink-400 focus:border-ink-400"
      />
      <button
        onClick={submit}
        className={'shrink-0 rounded-xl px-3 py-1.5 text-[11px] font-bold text-white transition-colors ' + tone.add}
      >
        Add
      </button>
    </div>
  )
}

function VitalCard({ icon: Icon, toneKey, title, pct, sub, badge, quick, undo, onAdd, unit, compare, mobile }) {
  const tone = TONES[toneKey] || TONES.sky
  return (
    <Card className={'flex flex-col p-4 ' + (mobile ? '' : 'h-full')}>
      <div className="flex items-center justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <span className={'grid h-7 w-7 shrink-0 place-items-center rounded-xl ' + tone.soft}>
            <Icon className="h-4 w-4" />
          </span>
          <SectionTitle className="!text-[15px] truncate">{title}</SectionTitle>
        </div>
        <span className={'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ' + tone.soft}>{badge}</span>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <Ring pct={pct} tone={tone} />
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-extrabold text-ink-900">{sub}</div>
          <div className="mt-2">
            <Comparisons items={compare} />
          </div>
        </div>
      </div>

      <div className="mt-3">
        <QuickRow quick={quick} undo={undo} onAdd={onAdd} tone={tone} />
      </div>
      <div className="mt-2">
        <CustomAdd onAdd={onAdd} unit={unit} tone={tone} />
      </div>
    </Card>
  )
}

export function TrackersPanel({ className = '', mobile = false }) {
  const {
    water, waterGoal, waterToday, addWater,
    steps, stepsGoal, stepsToday, addSteps,
    sleep, sleepGoal, sleepToday, addSleep,
  } = useApp()

  const pct = (v, g) => (g > 0 ? Math.round((v / g) * 100) : 0)

  const items = [
    {
      icon: Droplet,
      toneKey: 'sky',
      title: 'Water',
      unit: 'ml',
      pct: pct(waterToday, waterGoal),
      sub: (
        <>
          {waterToday} <span className="font-medium text-ink-400">/ {waterGoal} ml</span>
        </>
      ),
      badge: waterToday >= waterGoal ? 'Goal reached' : `${Math.max(0, waterGoal - waterToday)} ml to go`,
      quick: [
        { amount: 250, label: '250' },
        { amount: 500, label: '500' },
        { amount: 150, label: '150' },
      ],
      undo: -250,
      onAdd: addWater,
      compare: buildCompare(water, 'ml', waterToday),
    },
    {
      icon: Footprints,
      toneKey: 'brand',
      title: 'Steps',
      unit: 'steps',
      pct: pct(stepsToday, stepsGoal),
      sub: (
        <>
          {stepsToday.toLocaleString()} <span className="font-medium text-ink-400">/ {stepsGoal.toLocaleString()}</span>
        </>
      ),
      badge: stepsToday >= stepsGoal ? 'Goal reached' : `${Math.max(0, stepsGoal - stepsToday).toLocaleString()} to go`,
      quick: [
        { amount: 1000, label: '1k' },
        { amount: 2000, label: '2k' },
        { amount: 5000, label: '5k' },
      ],
      undo: -1000,
      onAdd: addSteps,
      compare: buildCompare(steps, 'steps', stepsToday),
    },
    {
      icon: Moon,
      toneKey: 'accent',
      title: 'Sleep',
      unit: 'min',
      pct: pct(sleepToday, sleepGoal),
      sub: (
        <>
          {fmtHours(sleepToday)} <span className="font-medium text-ink-400">/ {fmtHours(sleepGoal)}</span>
        </>
      ),
      badge: sleepToday >= sleepGoal ? 'Goal reached' : `${fmtHours(Math.max(0, sleepGoal - sleepToday))} to go`,
      quick: [
        { amount: 15, label: '15m' },
        { amount: 30, label: '30m' },
        { amount: 60, label: '1h' },
      ],
      undo: -30,
      onAdd: addSleep,
      compare: buildCompare(sleep, 'mins', sleepToday),
    },
  ]

  return (
    <div className={(mobile ? 'flex flex-col gap-3 ' : 'grid grid-cols-3 gap-3 ') + className}>
      {items.map((it) => (
        <VitalCard key={it.title} {...it} mobile={mobile} />
      ))}
    </div>
  )
}
