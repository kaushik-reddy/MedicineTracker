import { useState } from 'react'
import { Check, Close, ChevronLeft, ChevronRight } from '../icons.jsx'
import { PillGlyph } from '../ui.jsx'
import { sameDay, addDays } from '../time.js'

function Node({ status }) {
  if (status === 'taken')
    return (
      <span className="grid h-5 w-5 place-items-center rounded-full bg-brand-500 text-white">
        <Check className="h-3 w-3" />
      </span>
    )
  if (status === 'skipped')
    return (
      <span className="grid h-5 w-5 place-items-center rounded-full bg-amber-400 text-white">
        <Close className="h-3 w-3" />
      </span>
    )
  if (status === 'active') return <span className="h-3.5 w-3.5 rounded-full bg-brand-500 ring-4 ring-brand-100" />
  return <span className="h-3.5 w-3.5 rounded-full border-2 border-line bg-white" />
}

// Presentational timeline + dose cards. Reused by the dashboard card and the
// full-schedule modal so both stay pixel-identical.
export function ScheduleTimeline({ items, activeId = null, onItemClick, size = 'sm' }) {
  const n = items.length || 1
  const activeIdx = activeId ? items.findIndex((i) => i.id === activeId) : -1
  const lastTaken = items.reduce((a, it, i) => (it.taken ? i : a), -1)
  const fillIdx = activeIdx >= 0 ? activeIdx : lastTaken
  const fillW = fillIdx > 0 ? (fillIdx / n) * 100 : 0
  const cols = `repeat(${n}, minmax(0, 1fr))`
  const big = size === 'lg'

  const statusOf = (it) => (it.taken ? 'taken' : it.skipped ? 'skipped' : it.id === activeId ? 'active' : 'upcoming')

  return (
    <div>
      <div className="relative">
        <div
          className="absolute top-[31px] h-[3px] -translate-y-1/2 rounded-full bg-line"
          style={{ left: `${(0.5 / n) * 100}%`, width: `${((n - 1) / n) * 100}%` }}
        />
        <div
          className="absolute top-[31px] h-[3px] -translate-y-1/2 rounded-full bg-brand-500 transition-all duration-300"
          style={{ left: `${(0.5 / n) * 100}%`, width: `${fillW}%` }}
        />
        <div className="relative grid" style={{ gridTemplateColumns: cols }}>
          {items.map((it) => (
            <div key={it.id} className="flex flex-col items-center">
              <div className="mb-1.5 text-[10px] font-semibold text-ink-400">{it.label}</div>
              <div className="flex h-6 items-center justify-center">
                <Node status={statusOf(it)} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={'mt-3 grid gap-2 ' + (big ? '' : '')} style={{ gridTemplateColumns: cols }}>
        {items.map((it) => {
          const status = statusOf(it)
          const done = status === 'taken'
          const skipped = status === 'skipped'
          const active = status === 'active'
          return (
            <button
              key={it.id}
              onClick={() => onItemClick && onItemClick(it)}
              disabled={!onItemClick}
              className={
                'group flex flex-col rounded-xl border text-left transition-colors ' +
                (big ? 'p-3' : 'p-2.5') +
                ' ' +
                (active
                  ? 'border-brand-400 bg-brand-50/40'
                  : done
                    ? 'border-brand-100 bg-brand-50/20'
                    : skipped
                      ? 'border-amber-200 bg-amber-50/30'
                      : 'border-line bg-white') +
                (onItemClick ? ' hover:border-brand-200 hover:bg-page' : ' cursor-default')
              }
            >
              <div className="flex items-start justify-between">
                <span className={'grid place-items-center rounded-lg border border-line bg-white ' + (big ? 'h-10 w-10' : 'h-8 w-8')}>
                  <PillGlyph tone={it.tone} className={big ? 'h-7 w-7' : 'h-6 w-6'} />
                </span>
                {done && (
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-brand-500 text-white">
                    <Check className="h-3 w-3" />
                  </span>
                )}
                {skipped && (
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-amber-400 text-white">
                    <Close className="h-3 w-3" />
                  </span>
                )}
              </div>
              <div className={'mt-2 truncate font-bold leading-tight text-ink-900 ' + (big ? 'text-[14px]' : 'text-[12px]')}>
                {it.name}
              </div>
              <div className={'truncate text-ink-500 ' + (big ? 'text-[11px]' : 'text-[10px]')}>
                {`${it.dosage} • ${it.unit}`}
              </div>
              <div className={'mt-auto pt-1 font-semibold text-ink-400 ' + (big ? 'text-[11px]' : 'text-[10px]')}>
                {done ? 'Taken' : skipped ? 'Skipped' : active ? (onItemClick ? 'Tap to take' : 'Next up') : it.time}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

// Month calendar with the same rounded/brand styling as the rest of the app.
export function Calendar({ value, today, onChange }) {
  const [cursor, setCursor] = useState(new Date(value.getFullYear(), value.getMonth(), 1))
  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]

  return (
    <div className="w-64 rounded-2xl border border-line bg-white p-3 shadow-xl">
      <div className="flex items-center justify-between px-1">
        <button
          onClick={() => setCursor(new Date(year, month - 1, 1))}
          className="grid h-7 w-7 place-items-center rounded-lg text-ink-500 hover:bg-page"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-[13px] font-bold text-ink-900">
          {MONTHS[month]} {year}
        </span>
        <button
          onClick={() => setCursor(new Date(year, month + 1, 1))}
          className="grid h-7 w-7 place-items-center rounded-lg text-ink-500 hover:bg-page"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-2 grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((d, i) => (
          <div key={i} className="text-[10px] font-bold text-ink-400">
            {d}
          </div>
        ))}
        {cells.map((day, i) => {
          if (!day) return <div key={i} />
          const date = new Date(year, month, day)
          const isToday = today && sameDay(date, today)
          const isSel = sameDay(date, value)
          return (
            <button
              key={i}
              onClick={() => onChange(date)}
              className={
                'grid h-8 place-items-center rounded-lg text-[12px] font-semibold transition-colors ' +
                (isSel
                  ? 'bg-brand-500 text-white'
                  : isToday
                    ? 'bg-brand-50 text-brand-600'
                    : 'text-ink-700 hover:bg-page')
              }
            >
              {day}
            </button>
          )
        })}
      </div>

      <button
        onClick={() => onChange(today)}
        className="mt-2 w-full rounded-xl border border-line py-1.5 text-[12px] font-bold text-brand-600 hover:bg-page transition-colors"
      >
        Jump to Today
      </button>
    </div>
  )
}

export { addDays }
