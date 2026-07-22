import { useState, useEffect } from 'react'
import { useApp } from '../store.jsx'
import {
  Close,
  CheckCircle,
  LogPlus,
  Pill,
  BellPlus,
  Bell,
  Download,
  Check,
  Calendar as CalendarIcon,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  SkipForward,
  RefreshCw,
  Trash,
  Upload,
  Note,
  Users,
  Plus,
  RefreshCw as RestockIcon,
} from '../icons.jsx'
import { PillGlyph, MedGlyph, UserAvatar } from '../ui.jsx'
import { ScheduleTimeline, Calendar } from './ScheduleView.jsx'
import { useNow, istCalendarDate, sameDay, addDays, formatLongDate, medActiveOn } from '../time.js'
import { DEFAULT_MED_INFO } from '../data.js'

const field =
  'w-full rounded-xl border border-line bg-white px-3 py-2.5 text-[13px] font-medium text-ink-900 outline-none focus:border-brand-400 transition-colors'
const label = 'text-[12px] font-semibold text-ink-500'

// Themed selectable-chip styles (used for frequency + weekday pickers).
const chipOn = 'border-brand-400 bg-brand-50 text-brand-700'
const chipOff = 'border-line text-ink-500 hover:bg-page'

const FREQUENCIES = ['Daily', 'Twice daily', 'Weekly']
const WEEKDAYS = [
  { key: 'Sun', short: 'S' },
  { key: 'Mon', short: 'M' },
  { key: 'Tue', short: 'T' },
  { key: 'Wed', short: 'W' },
  { key: 'Thu', short: 'T' },
  { key: 'Fri', short: 'F' },
  { key: 'Sat', short: 'S' },
]

// Today (IST) as a yyyy-mm-dd string for the native date input.
function todayISO() {
  const d = istCalendarDate()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const softMap = {
  brand: 'bg-brand-50 text-brand-600',
  accent: 'bg-violet-50 text-accent-600',
  warn: 'bg-amber-50 text-warn-500',
  sky: 'bg-sky-50 text-sky-600',
}
const solidMap = {
  brand: 'bg-brand-500 hover:bg-brand-600',
  accent: 'bg-accent-500 hover:bg-accent-600',
  warn: 'bg-amber-500 hover:bg-amber-600',
  sky: 'bg-sky-500 hover:bg-sky-600',
}

function Shell({ icon: Icon, tone = 'brand', title, subtitle, children }) {
  const { closeModal } = useApp()
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm" onClick={closeModal} />
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-start justify-between p-6 pb-4">
          <div className="flex items-center gap-3">
            <span className={'grid h-11 w-11 place-items-center rounded-2xl ' + softMap[tone]}>
              <Icon className="h-6 w-6" />
            </span>
            <div>
              <h2 className="text-[17px] font-extrabold text-ink-900">{title}</h2>
              <p className="text-[12px] text-ink-500">{subtitle}</p>
            </div>
          </div>
          <button
            onClick={closeModal}
            className="grid h-8 w-8 place-items-center rounded-full text-ink-400 hover:bg-page transition-colors"
          >
            <Close className="h-4 w-4" />
          </button>
        </div>
        <div className="px-6 pb-6">{children}</div>
      </div>
    </div>
  )
}

function Actions({ onConfirm, confirmLabel = 'Confirm', tone = 'brand' }) {
  const { closeModal } = useApp()
  return (
    <div className="mt-5 flex gap-3">
      <button
        onClick={closeModal}
        className="flex-1 rounded-xl border border-line py-2.5 text-[13px] font-bold text-ink-500 hover:bg-page transition-colors"
      >
        Cancel
      </button>
      <button
        onClick={onConfirm}
        className={'flex-1 rounded-xl py-2.5 text-[13px] font-bold text-white transition-colors ' + solidMap[tone]}
      >
        {confirmLabel}
      </button>
    </div>
  )
}

function nowTime() {
  return new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

function LogDose() {
  const { medications, logDose, closeModal } = useApp()
  const [name, setName] = useState(medications[0]?.name || '')
  const [time, setTime] = useState(nowTime())
  return (
    <Shell icon={LogPlus} tone="brand" title="Log a Dose" subtitle="Manually record a taken dose">
      <div className="space-y-3">
        <div>
          <div className={label}>Medication</div>
          <select className={field + ' mt-1'} value={name} onChange={(e) => setName(e.target.value)}>
            {medications.map((m) => (
              <option key={m.name}>{m.name}</option>
            ))}
          </select>
        </div>
        <div>
          <div className={label}>Time taken</div>
          <input className={field + ' mt-1'} value={time} onChange={(e) => setTime(e.target.value)} />
        </div>
      </div>
      <Actions
        confirmLabel="Log dose"
        onConfirm={() => {
          logDose({ name, time })
          closeModal()
        }}
      />
    </Shell>
  )
}

function MedicationForm({ mode = 'add', med = null }) {
  const { addMedication, editMedication, closeModal, users } = useApp()
  const isEdit = mode === 'edit'
  const info = med?.info || {}
  const [form, setForm] = useState({
    name: med?.name ?? '',
    dosage: med?.dosage ?? '',
    unit: med?.unit ?? '1 tablet',
    frequency: med?.frequency ?? 'Daily',
    activeDays: med?.activeDays?.length ? med.activeDays : WEEKDAYS.map((d) => d.key),
    startDate: med?.startDate ?? todayISO(),
    quantity: '',
    time: med?.time ?? '08:00 AM',
    tone: med?.tone ?? 'brand',
    image: med?.image ?? null,
    user: med?.user ?? users[0]?.id ?? '',
    category: info.category ?? '',
    purpose: info.purpose ?? '',
    instructions: info.instructions ?? '',
    sideEffects: info.sideEffects ?? '',
    warnings: info.warnings ?? '',
  })
  const [showInfo, setShowInfo] = useState(isEdit)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const toggleDay = (key) =>
    setForm((f) => {
      const has = f.activeDays.includes(key)
      const next = has ? f.activeDays.filter((d) => d !== key) : [...f.activeDays, key]
      return { ...f, activeDays: next.length ? next : f.activeDays } // keep at least one day
    })
  const qtyNum = Number(form.quantity)
  // Quantity is required when adding; optional when editing (blank = leave stock as-is).
  const valid = form.name.trim() && form.dosage.trim() && (isEdit || qtyNum > 0)
  const tones = [
    ['brand', 'bg-brand-500'],
    ['accent', 'bg-accent-500'],
    ['coral', 'bg-coral-500'],
  ]
  const submit = () => {
    if (!valid) return
    const infoObj = {
      category: form.category.trim() || DEFAULT_MED_INFO.category,
      purpose: form.purpose.trim() || DEFAULT_MED_INFO.purpose,
      instructions: form.instructions.trim() || DEFAULT_MED_INFO.instructions,
      sideEffects: form.sideEffects.trim() || DEFAULT_MED_INFO.sideEffects,
      warnings: form.warnings.trim() || DEFAULT_MED_INFO.warnings,
    }
    if (isEdit) {
      editMedication(med.id, {
        name: form.name,
        dosage: form.dosage,
        unit: form.unit,
        frequency: form.frequency,
        activeDays: form.activeDays,
        startDate: form.startDate,
        time: form.time,
        tone: form.tone,
        image: form.image,
        user: form.user,
        info: infoObj,
        quantity: form.quantity, // '' = don't touch inventory
      })
    } else {
      addMedication({
        name: form.name,
        sub: 'Custom',
        dosage: form.dosage,
        unit: form.unit,
        frequency: form.frequency,
        activeDays: form.activeDays,
        startDate: form.startDate,
        quantity: qtyNum,
        time: form.time,
        period: 'am',
        status: 'Upcoming',
        tone: form.tone,
        image: form.image,
        user: form.user,
        info: infoObj,
      })
    }
    closeModal()
  }
  return (
    <Shell
      icon={Pill}
      tone="accent"
      title={isEdit ? 'Edit Medication' : 'Add Medication'}
      subtitle={isEdit ? 'Update the details of this medication' : 'Add a new medication to your list'}
    >
      <div className="max-h-[62vh] space-y-3 overflow-y-auto no-scrollbar pr-0.5">
        <div>
          <div className={label}>Name</div>
          <input className={field + ' mt-1'} placeholder="e.g. Ibuprofen" value={form.name} onChange={set('name')} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className={label}>Dosage</div>
            <input className={field + ' mt-1'} placeholder="e.g. 200 mg" value={form.dosage} onChange={set('dosage')} />
          </div>
          <div>
            <div className={label}>Unit</div>
            <input className={field + ' mt-1'} value={form.unit} onChange={set('unit')} />
          </div>
        </div>

        <div>
          <div className={label}>Frequency</div>
          <div className="mt-1.5 grid grid-cols-3 gap-2">
            {FREQUENCIES.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setForm((s) => ({ ...s, frequency: f }))}
                className={
                  'rounded-xl border py-2 text-[12px] font-bold transition-colors ' +
                  (form.frequency === f ? chipOn : chipOff)
                }
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className={label}>Repeat on</div>
          <div className="mt-1.5 grid grid-cols-7 gap-1.5">
            {WEEKDAYS.map((d, i) => {
              const on = form.activeDays.includes(d.key)
              return (
                <button
                  key={i}
                  type="button"
                  title={d.key}
                  onClick={() => toggleDay(d.key)}
                  className={
                    'grid h-9 place-items-center rounded-lg border text-[12px] font-bold transition-colors ' +
                    (on ? chipOn : chipOff)
                  }
                >
                  {d.short}
                </button>
              )
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className={label}>Start tracking</div>
            <input type="date" className={field + ' mt-1'} value={form.startDate} onChange={set('startDate')} />
          </div>
          <div>
            <div className={label}>Time</div>
            <input className={field + ' mt-1'} value={form.time} onChange={set('time')} />
          </div>
        </div>

        <div>
          <div className={label}>{isEdit ? 'Update stock' : 'Quantity in stock'}</div>
          <div className="mt-1 flex items-center gap-2">
            <input
              type="number"
              min="0"
              inputMode="numeric"
              className={field}
              placeholder={isEdit ? 'Leave blank to keep current' : 'e.g. 30'}
              value={form.quantity}
              onChange={set('quantity')}
            />
            <span className="shrink-0 text-[12px] font-semibold text-ink-400">units</span>
          </div>
          <p className="mt-1 text-[11px] text-ink-400">
            {isEdit
              ? 'Enter a new count to update inventory, or leave blank to keep it unchanged.'
              : 'How many doses you currently have — used to track your inventory.'}
          </p>
        </div>

        <div>
          <div className={label}>Member</div>
          <div className="mt-1.5 flex gap-2">
            {users.map((u) => (
              <button
                key={u.id}
                onClick={() => setForm((f) => ({ ...f, user: u.id }))}
                className={
                  'flex items-center gap-1.5 rounded-full border py-1 pl-1 pr-2.5 transition-colors ' +
                  (form.user === u.id ? 'border-brand-400 bg-brand-50' : 'border-line hover:bg-page')
                }
              >
                <UserAvatar user={u} className="h-5 w-5 text-[9px]" />
                <span className="text-[11px] font-bold text-ink-700">{u.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className={label}>Colour &amp; image</div>
          <div className="mt-1.5 flex items-center gap-3">
            <div className="flex gap-2">
              {tones.map(([t, bg]) => (
                <button
                  key={t}
                  onClick={() => setForm((f) => ({ ...f, tone: t }))}
                  className={`h-8 w-8 rounded-full ${bg} ${form.tone === t ? 'ring-2 ring-ink-900 ring-offset-2' : ''}`}
                />
              ))}
            </div>
            <ImageUploader
              med={{ image: form.image, tone: form.tone }}
              onPick={(img) => setForm((f) => ({ ...f, image: img }))}
              size="h-10 w-10"
            />
            <span className="text-[11px] text-ink-400">Upload photo (optional)</span>
          </div>
        </div>

        <div className="rounded-2xl border border-line p-3">
          <button
            type="button"
            onClick={() => setShowInfo((v) => !v)}
            className="flex w-full items-center justify-between text-[12px] font-bold text-ink-600"
          >
            <span>
              Additional information <span className="font-medium text-ink-400">(optional)</span>
            </span>
            <ChevronRight className={'h-4 w-4 transition-transform ' + (showInfo ? 'rotate-90' : '')} />
          </button>
          {showInfo && (
            <div className="mt-3 space-y-3">
              <div>
                <div className={label}>Category</div>
                <input
                  className={field + ' mt-1'}
                  placeholder="e.g. Pain relief"
                  value={form.category}
                  onChange={set('category')}
                />
              </div>
              <div>
                <div className={label}>Purpose</div>
                <textarea
                  className={field + ' mt-1 min-h-[56px] resize-none'}
                  placeholder="What is this medication for?"
                  value={form.purpose}
                  onChange={set('purpose')}
                />
              </div>
              <div>
                <div className={label}>How to take</div>
                <textarea
                  className={field + ' mt-1 min-h-[56px] resize-none'}
                  placeholder="e.g. Take with food, twice a day"
                  value={form.instructions}
                  onChange={set('instructions')}
                />
              </div>
              <div>
                <div className={label}>Side effects</div>
                <textarea
                  className={field + ' mt-1 min-h-[56px] resize-none'}
                  placeholder="Possible side effects"
                  value={form.sideEffects}
                  onChange={set('sideEffects')}
                />
              </div>
              <div>
                <div className={label}>Warnings</div>
                <textarea
                  className={field + ' mt-1 min-h-[56px] resize-none'}
                  placeholder="Precautions or interactions"
                  value={form.warnings}
                  onChange={set('warnings')}
                />
              </div>
            </div>
          )}
        </div>
      </div>
      <Actions tone="accent" confirmLabel={isEdit ? 'Save changes' : 'Add medication'} onConfirm={submit} />
    </Shell>
  )
}

function AddMedication() {
  return <MedicationForm mode="add" />
}

function EditMedication() {
  const { confirm, medications } = useApp()
  const med = medications.find((m) => m.id === (confirm && confirm.medId))
  if (!med) return null
  return <MedicationForm mode="edit" med={med} key={med.id} />
}

function SetReminder() {
  const { medications, setReminder, closeModal } = useApp()
  const [name, setName] = useState(medications[0]?.name || '')
  const [time, setTime] = useState('08:00 AM')
  const [channel, setChannel] = useState('Push')
  return (
    <Shell icon={BellPlus} tone="warn" title="Set Reminder" subtitle="Customize how you're reminded">
      <div className="space-y-3">
        <div>
          <div className={label}>Medication</div>
          <select className={field + ' mt-1'} value={name} onChange={(e) => setName(e.target.value)}>
            {medications.map((m) => (
              <option key={m.name}>{m.name}</option>
            ))}
          </select>
        </div>
        <div>
          <div className={label}>Remind at</div>
          <input className={field + ' mt-1'} value={time} onChange={(e) => setTime(e.target.value)} />
        </div>
        <div>
          <div className={label}>Channel</div>
          <div className="mt-1.5 flex gap-2">
            {['Push', 'Email', 'SMS'].map((c) => (
              <button
                key={c}
                onClick={() => setChannel(c)}
                className={
                  'flex-1 rounded-xl border py-2 text-[12px] font-bold transition-colors ' +
                  (channel === c
                    ? 'border-warn-500 bg-amber-50 text-warn-500'
                    : 'border-line text-ink-500 hover:bg-page')
                }
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>
      <Actions
        tone="warn"
        confirmLabel="Set reminder"
        onConfirm={() => {
          setReminder({ name, time, channel })
          closeModal()
        }}
      />
    </Shell>
  )
}

function ExportReport() {
  const { exportReport, medications, glance, closeModal } = useApp()
  const [format, setFormat] = useState('CSV')
  return (
    <Shell icon={Download} tone="sky" title="Export Report" subtitle="Download your medication data">
      <div className="rounded-2xl bg-page/70 p-4 text-[13px] text-ink-600">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-ink-700">Medications</span>
          <span className="font-bold text-ink-900">{medications.length}</span>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className="font-semibold text-ink-700">Adherence</span>
          <span className="font-bold text-brand-600">{glance.adherence}%</span>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className="font-semibold text-ink-700">Doses today</span>
          <span className="font-bold text-ink-900">{glance.takenCount} / {glance.total}</span>
        </div>
      </div>

      <div className="mt-4">
        <div className={label}>Format</div>
        <div className="mt-1.5 flex gap-2">
          {['CSV', 'JSON'].map((f) => (
            <button
              key={f}
              onClick={() => setFormat(f)}
              className={
                'flex-1 rounded-xl border py-2.5 text-[13px] font-bold transition-colors ' +
                (format === f ? 'border-sky-500 bg-sky-50 text-sky-600' : 'border-line text-ink-500 hover:bg-page')
              }
            >
              {f}
              {format === f && <Check className="ml-1 inline h-3.5 w-3.5" />}
            </button>
          ))}
        </div>
      </div>

      <Actions
        tone="sky"
        confirmLabel="Download report"
        onConfirm={() => {
          exportReport(format)
          closeModal()
        }}
      />
    </Shell>
  )
}

function FullSchedule() {
  const { schedule, medications, nextDose, markTaken, resetDose, closeModal } = useApp()
  const now = useNow(1000)
  const today = istCalendarDate(now)
  const [selected, setSelected] = useState(today)
  const [showCal, setShowCal] = useState(false)
  const [dir, setDir] = useState(0)

  const go = (delta) => {
    setDir(delta)
    setSelected((d) => addDays(d, delta))
  }

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowLeft') go(-1)
      else if (e.key === 'ArrowRight') go(1)
      else if (e.key === 'Escape') closeModal()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [closeModal])

  const isToday = sameDay(selected, today)
  const isPast = selected < today && !isToday

  // Build the items for the selected day. Today is live; other days are derived.
  const baseMeds = medications.filter((m) => m.scheduledToday && medActiveOn(m, selected))
  const items = isToday
    ? schedule
    : baseMeds.map((m) => ({ ...m, taken: isPast, skipped: false }))
  const activeId = isToday ? nextDose?.id : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm" onClick={closeModal} />
      <div className="relative w-full max-w-2xl overflow-visible rounded-3xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line p-5">
          <div>
            <h2 className="text-[17px] font-extrabold text-ink-900">Full Schedule</h2>
            <p className="text-[12px] text-ink-500">Browse doses by day · times in IST</p>
          </div>
          <button
            onClick={closeModal}
            className="grid h-8 w-8 place-items-center rounded-full text-ink-400 hover:bg-page transition-colors"
          >
            <Close className="h-4 w-4" />
          </button>
        </div>

        {/* Date navigator */}
        <div className="flex items-center justify-between px-5 pt-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => go(-1)}
              className="grid h-9 w-9 place-items-center rounded-xl border border-line text-ink-500 hover:bg-page transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="min-w-[190px] text-center">
              <div className="text-[14px] font-extrabold text-ink-900">{formatLongDate(selected)}</div>
              <div className="text-[11px] font-semibold text-brand-600">
                {isToday ? 'Today' : isPast ? 'Past' : 'Upcoming'}
              </div>
            </div>
            <button
              onClick={() => go(1)}
              className="grid h-9 w-9 place-items-center rounded-xl border border-line text-ink-500 hover:bg-page transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="relative">
            <button
              onClick={() => setShowCal((s) => !s)}
              className={
                'inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-[12px] font-bold transition-colors ' +
                (showCal ? 'border-brand-400 bg-brand-50 text-brand-600' : 'border-line text-ink-600 hover:bg-page')
              }
            >
              <CalendarIcon className="h-4 w-4" /> Calendar
            </button>
            {showCal && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowCal(false)} />
                <div className="absolute right-0 z-20 mt-2">
                  <Calendar
                    value={selected}
                    today={today}
                    onChange={(d) => {
                      setDir(d < selected ? -1 : 1)
                      setSelected(d)
                      setShowCal(false)
                    }}
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Timeline for the selected date (animated on change) */}
        <div className="p-5 pt-4">
          <div
            key={selected.toDateString()}
            className="animate-slide"
            style={{ '--slide': `${dir >= 0 ? 18 : -18}px` }}
          >
            <ScheduleTimeline
              items={items}
              activeId={activeId}
              size="lg"
              onItemClick={
                isToday ? (it) => (it.taken || it.skipped ? resetDose(it.id) : markTaken(it.id)) : undefined
              }
            />
          </div>
          {!isToday && (
            <p className="mt-3 text-center text-[11px] font-medium text-ink-400">
              Only today's doses can be updated · use the arrows or calendar to browse
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

const CONFIRM_CFG = {
  taken: { icon: CheckCircle, tone: 'brand', title: 'Mark as taken?', confirm: 'Mark as Taken' },
  snooze: { icon: Bell, tone: 'warn', title: 'Snooze this dose?', confirm: 'Snooze dose' },
  skip: { icon: SkipForward, tone: 'warn', title: 'Skip this dose?', confirm: 'Skip for today' },
  move: { icon: RefreshCw, tone: 'accent', title: 'Reschedule dose?', confirm: 'Reschedule' },
  unschedule: { icon: Trash, tone: 'warn', title: 'Remove from schedule?', confirm: 'Remove' },
}

function TimeChip({ caption, time, muted }) {
  return (
    <div className={'flex-1 rounded-xl border px-3 py-2 text-center ' + (muted ? 'border-line bg-page/60' : 'border-brand-200 bg-brand-50')}>
      <div className="text-[10px] font-semibold uppercase tracking-wide text-ink-400">{caption}</div>
      <div className={'text-[15px] font-extrabold ' + (muted ? 'text-ink-500 line-through' : 'text-brand-600')}>{time}</div>
    </div>
  )
}

function ConfirmDose() {
  const { confirm, medications, markTaken, skipDose, rescheduleDose, snoozeDoseTo, removeFromSchedule, closeModal } = useApp()
  if (!confirm) return null
  const med = medications.find((m) => m.id === confirm.medId)
  if (!med) return null

  const cfg = CONFIRM_CFG[confirm.kind]
  const changesTime = confirm.kind === 'snooze' || confirm.kind === 'move'

  const apply = () => {
    if (confirm.kind === 'taken') markTaken(med.id)
    else if (confirm.kind === 'skip') skipDose(med.id)
    else if (confirm.kind === 'move') rescheduleDose(med.id, confirm.toTime)
    else if (confirm.kind === 'snooze') snoozeDoseTo(med.id, confirm.toTime, confirm.mins)
    else if (confirm.kind === 'unschedule') removeFromSchedule(med.id)
    closeModal()
  }

  return (
    <Shell icon={cfg.icon} tone={cfg.tone} title={cfg.title} subtitle="Please confirm this action">
      {/* Which medicine */}
      <div className="flex items-center gap-3 rounded-2xl border border-line bg-page/50 p-3">
        <span className="grid h-11 w-11 place-items-center rounded-xl border border-line bg-white">
          <PillGlyph tone={med.tone} className="h-8 w-8" />
        </span>
        <div className="leading-tight">
          <div className="text-[14px] font-extrabold text-ink-900">{med.name}</div>
          <div className="text-[12px] text-ink-500">
            {med.dosage} • {med.unit}
          </div>
        </div>
      </div>

      {/* Details */}
      {changesTime ? (
        <div className="mt-4 flex items-center gap-2">
          <TimeChip caption="Current" time={confirm.fromTime} muted />
          <ChevronRight className="h-5 w-5 shrink-0 text-ink-400" />
          <TimeChip caption={confirm.kind === 'snooze' ? `+${confirm.mins} min` : 'New time'} time={confirm.toTime} />
        </div>
      ) : (
        <div className="mt-4 rounded-2xl bg-page/60 px-4 py-3 text-[13px] text-ink-600">
          {confirm.kind === 'taken' ? (
            <>
              Marking <span className="font-bold text-ink-900">{med.name}</span> scheduled at{' '}
              <span className="font-bold text-ink-900">{confirm.fromTime}</span> as{' '}
              <span className="font-bold text-brand-600">taken</span>.
            </>
          ) : confirm.kind === 'unschedule' ? (
            <>
              Remove <span className="font-bold text-ink-900">{med.name}</span> from your schedule? It will no longer
              appear in Today's Schedule or Your Next Dose. You can add it back anytime.
            </>
          ) : (
            <>
              Skipping <span className="font-bold text-ink-900">{med.name}</span> at{' '}
              <span className="font-bold text-ink-900">{confirm.fromTime}</span> for today. It will be logged as{' '}
              <span className="font-bold text-warn-500">skipped</span>.
            </>
          )}
        </div>
      )}

      <Actions tone={cfg.tone} confirmLabel={cfg.confirm} onConfirm={apply} />
    </Shell>
  )
}

function AddToSchedule() {
  const { confirm, medications, scheduleMed, closeModal } = useApp()
  const med = medications.find((m) => m.id === (confirm && confirm.medId))
  const todayISO = (() => {
    const d = istCalendarDate(Date.now())
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })()
  const [date, setDate] = useState(todayISO)
  const [time, setTime] = useState(med ? med.time : '08:00 AM')
  const [frequency, setFrequency] = useState(med ? med.frequency : 'Daily')

  if (!med) return null

  return (
    <Shell icon={CalendarIcon} tone="brand" title="Add to Schedule" subtitle="Choose when to take this medication">
      <div className="flex items-center gap-3 rounded-2xl border border-line bg-page/50 p-3">
        <span className="grid h-11 w-11 place-items-center rounded-xl border border-line bg-white">
          <PillGlyph tone={med.tone} className="h-8 w-8" />
        </span>
        <div className="leading-tight">
          <div className="text-[14px] font-extrabold text-ink-900">{med.name}</div>
          <div className="text-[12px] text-ink-500">
            {med.dosage} • {med.unit}
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <div>
          <div className={label}>Date</div>
          <input type="date" className={field + ' mt-1'} value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className={label}>Time</div>
            <input className={field + ' mt-1'} value={time} onChange={(e) => setTime(e.target.value)} placeholder="08:00 AM" />
          </div>
          <div>
            <div className={label}>Frequency</div>
            <select className={field + ' mt-1'} value={frequency} onChange={(e) => setFrequency(e.target.value)}>
              <option>Daily</option>
              <option>Twice daily</option>
              <option>Weekly</option>
            </select>
          </div>
        </div>
      </div>

      <Actions
        tone="brand"
        confirmLabel="Add to Schedule"
        onConfirm={() => {
          scheduleMed(med.id, { time: time.trim(), frequency })
          closeModal()
        }}
      />
    </Shell>
  )
}

function ImageUploader({ med, onPick, size = 'h-14 w-14' }) {
  const readFile = (e) => {
    const file = e.target.files && e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => onPick(reader.result)
    reader.readAsDataURL(file)
  }
  return (
    <label className={'group relative grid cursor-pointer place-items-center overflow-hidden rounded-xl border border-dashed border-line bg-page/50 ' + size}>
      {med.image ? (
        <img src={med.image} alt="" className="h-full w-full object-cover" />
      ) : (
        <MedGlyph med={med} className="h-8 w-8" />
      )}
      <span className="absolute inset-0 hidden place-items-center bg-ink-900/40 text-white group-hover:grid">
        <Upload className="h-4 w-4" />
      </span>
      <input type="file" accept="image/*" className="hidden" onChange={readFile} />
    </label>
  )
}

function MedDetails() {
  const { confirm, medications, openScheduleMed, openEditMed, requestConfirm, setMedImage, closeModal, usersById } = useApp()
  const med = medications.find((m) => m.id === (confirm && confirm.medId))
  if (!med) return null
  const owner = usersById[med.user]

  const statusLabel = !med.scheduledToday
    ? 'Off schedule'
    : med.taken
      ? 'Taken'
      : med.skipped
        ? 'Skipped'
        : 'Upcoming'
  const statusColor = !med.scheduledToday
    ? 'text-ink-400'
    : med.taken
      ? 'text-brand-600'
      : med.skipped
        ? 'text-warn-500'
        : 'text-accent-600'

  const rows = [
    ['Member', owner ? owner.full || owner.name : '—'],
    ['Generic name', med.sub],
    ['Dosage', `${med.dosage} • ${med.unit}`],
    ['Frequency', med.frequency],
    ['Time', med.time],
  ]
  if (med.activeDays && med.activeDays.length && med.activeDays.length < 7) {
    rows.push(['Repeats on', med.activeDays.join(', ')])
  }
  if (med.startDate) {
    const [y, mo, d] = String(med.startDate).split('-').map(Number)
    if (y && mo && d) rows.push(['Starts', formatLongDate(new Date(y, mo - 1, d))])
  }

  const info = med.info || {
    category: 'Medication',
    purpose: 'General use — details not provided.',
    instructions: 'Take as directed on the label or by your doctor.',
    sideEffects: 'Refer to the package leaflet for possible side effects.',
    warnings: 'Consult your doctor or pharmacist if unsure.',
  }
  const infoRows = [
    ['Purpose', info.purpose],
    ['How to take', info.instructions],
    ['Side effects', info.sideEffects],
    ['Warnings', info.warnings],
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm" onClick={closeModal} />
      <div className="relative flex max-h-[88vh] w-full max-w-md flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-start justify-between p-6 pb-4">
          <div className="flex items-center gap-3">
            <ImageUploader med={med} onPick={(img) => setMedImage(med.id, img)} />
            <div>
              <h2 className="text-[18px] font-extrabold text-ink-900">{med.name}</h2>
              <div className="mt-0.5 flex items-center gap-2">
                <span className="rounded-full bg-page px-2 py-0.5 text-[10px] font-bold text-ink-500">{info.category}</span>
                <span className={'text-[12px] font-bold ' + statusColor}>{statusLabel}</span>
                {owner && (
                  <span className="inline-flex items-center gap-1">
                    <UserAvatar user={owner} className="h-4 w-4 text-[8px]" />
                    <span className="text-[11px] font-bold text-ink-500">{owner.name}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={closeModal}
            className="grid h-8 w-8 place-items-center rounded-full text-ink-400 hover:bg-page transition-colors"
          >
            <Close className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar px-6">
          <div className="divide-y divide-line rounded-2xl border border-line">
            {rows.map(([k, v]) => (
              <div key={k} className="flex items-center justify-between px-4 py-2.5">
                <span className="text-[12px] font-semibold text-ink-500">{k}</span>
                <span className="text-[13px] font-bold text-ink-900">{v}</span>
              </div>
            ))}
          </div>

          <div className="mt-4 text-[11px] font-bold uppercase tracking-wide text-ink-400">Medical information</div>
          <div className="mt-2 space-y-2.5">
            {infoRows.map(([k, v]) => (
              <div key={k} className="rounded-2xl bg-page/50 p-3">
                <div className="text-[11px] font-bold text-ink-500">{k}</div>
                <div className="mt-0.5 text-[12px] leading-snug text-ink-700">{v}</div>
              </div>
            ))}
          </div>

          <p className="mt-3 px-1 text-[11px] text-ink-400">Tap the image to upload your own pill/capsule photo (optional).</p>
        </div>

        <div className="flex gap-3 p-6 pt-4">
          <button
            onClick={() => openEditMed(med.id)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-line py-2.5 text-[13px] font-bold text-ink-600 hover:bg-page transition-colors"
          >
            <Note className="h-4 w-4" /> Edit
          </button>
          <button
            onClick={() => openScheduleMed(med.id)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-brand-500 py-2.5 text-[13px] font-bold text-white hover:bg-brand-600 transition-colors"
          >
            <CalendarDays className="h-4 w-4" /> Add to calendar
          </button>
          {med.scheduledToday && (
            <button
              onClick={() => requestConfirm({ kind: 'unschedule', medId: med.id })}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 py-2.5 text-[13px] font-bold text-warn-500 hover:bg-amber-100 transition-colors"
            >
              <Trash className="h-4 w-4" /> Remove from calendar
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function Restock() {
  const { restockName, inventory, restock, closeModal } = useApp()
  const item = inventory.find((it) => it.name === restockName)
  const [qty, setQty] = useState(30)
  if (!item) return null

  return (
    <Shell icon={RestockIcon} tone="brand" title="Restock medication" subtitle="How many units to add?">
      <div className="flex items-center justify-between rounded-2xl border border-line bg-page/50 p-3">
        <div className="leading-tight">
          <div className="text-[14px] font-extrabold text-ink-900">{item.name}</div>
          <div className="text-[12px] text-ink-500">{item.detail}</div>
        </div>
        <div className="text-right leading-tight">
          <div className="text-[15px] font-extrabold text-ink-900">{item.days}</div>
          <div className="text-[10px] font-semibold text-ink-400">days left</div>
        </div>
      </div>

      <div className="mt-4">
        <div className={label}>Units to add</div>
        <div className="mt-1 flex items-center gap-2">
          <button
            onClick={() => setQty((q) => Math.max(1, q - 5))}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-line text-[18px] font-bold text-ink-500 hover:bg-page"
          >
            −
          </button>
          <input
            type="number"
            min="1"
            value={qty}
            onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
            className={field + ' text-center'}
          />
          <button
            onClick={() => setQty((q) => q + 5)}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-line text-[18px] font-bold text-ink-500 hover:bg-page"
          >
            +
          </button>
        </div>
        <div className="mt-2 flex gap-2">
          {[10, 30, 60].map((n) => (
            <button
              key={n}
              onClick={() => setQty(n)}
              className={
                'flex-1 rounded-lg border py-1.5 text-[12px] font-bold transition-colors ' +
                (qty === n ? 'border-brand-400 bg-brand-50 text-brand-600' : 'border-line text-ink-500 hover:bg-page')
              }
            >
              +{n}
            </button>
          ))}
        </div>
        <p className="mt-2 text-center text-[11px] font-medium text-ink-400">
          New total: <span className="font-bold text-ink-700">{item.days + qty} days</span>
        </p>
      </div>

      <Actions
        tone="brand"
        confirmLabel="Restock"
        onConfirm={() => {
          restock(item.name, qty)
          closeModal()
        }}
      />
    </Shell>
  )
}

function LogSymptom() {
  const { showToast, closeModal } = useApp()
  const [text, setText] = useState('')
  const [severity, setSeverity] = useState('Mild')
  const sevTone = { Mild: 'brand', Moderate: 'warn', Severe: 'coral' }
  const sevCls = {
    Mild: 'border-brand-400 bg-brand-50 text-brand-600',
    Moderate: 'border-amber-400 bg-amber-50 text-warn-500',
    Severe: 'border-rose-300 bg-rose-50 text-coral-500',
  }
  return (
    <Shell icon={Note} tone="accent" title="Log a Symptom" subtitle="Record how you're feeling">
      <div className="space-y-3">
        <div>
          <div className={label}>Symptom</div>
          <input
            className={field + ' mt-1'}
            placeholder="e.g. Headache, nausea, dizziness…"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </div>
        <div>
          <div className={label}>Severity</div>
          <div className="mt-1.5 flex gap-2">
            {['Mild', 'Moderate', 'Severe'].map((s) => (
              <button
                key={s}
                onClick={() => setSeverity(s)}
                className={
                  'flex-1 rounded-xl border py-2 text-[12px] font-bold transition-colors ' +
                  (severity === s ? sevCls[s] : 'border-line text-ink-500 hover:bg-page')
                }
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>
      <Actions
        tone="accent"
        confirmLabel="Log symptom"
        onConfirm={() => {
          const name = text.trim() || 'Symptom'
          showToast(`Logged · ${name} (${severity})`, sevTone[severity])
          closeModal()
        }}
      />
    </Shell>
  )
}

function RemoveMemberButton({ onConfirm }) {
  const [armed, setArmed] = useState(false)
  if (armed)
    return (
      <div className="flex shrink-0 items-center gap-1">
        <button
          onClick={onConfirm}
          className="rounded-lg bg-coral-500 px-2 py-1 text-[10px] font-bold text-white hover:bg-rose-600"
        >
          Remove
        </button>
        <button
          onClick={() => setArmed(false)}
          className="rounded-lg border border-line px-2 py-1 text-[10px] font-bold text-ink-500 hover:bg-page"
        >
          Cancel
        </button>
      </div>
    )
  return (
    <button
      onClick={() => setArmed(true)}
      title="Remove member"
      className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-ink-400 hover:bg-rose-50 hover:text-coral-500 transition-colors"
    >
      <Trash className="h-4 w-4" />
    </button>
  )
}

function UserImageUploader({ user, onPick }) {
  const readFile = (e) => {
    const file = e.target.files && e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => onPick(reader.result)
    reader.readAsDataURL(file)
  }
  return (
    <label className="group relative grid h-11 w-11 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-full">
      <UserAvatar user={user} className="h-11 w-11 text-[15px]" />
      <span className="absolute inset-0 hidden place-items-center rounded-full bg-ink-900/40 text-white group-hover:grid">
        <Upload className="h-4 w-4" />
      </span>
      <input type="file" accept="image/*" className="hidden" onChange={readFile} />
    </label>
  )
}

function ManageUsers() {
  const { users, medications, addUser, removeUser, setUserImage, closeModal } = useApp()
  const [name, setName] = useState('')
  const [tone, setTone] = useState('brand')
  const tones = [
    ['brand', 'bg-brand-500'],
    ['accent', 'bg-accent-500'],
    ['sky', 'bg-sky-500'],
    ['coral', 'bg-coral-500'],
    ['warn', 'bg-warn-500'],
  ]

  return (
    <Shell icon={Users} tone="brand" title="Manage Members" subtitle="Profiles, medications & household setup">
      <div className="max-h-[46vh] space-y-2 overflow-y-auto no-scrollbar">
        {users.map((u) => {
          const meds = medications.filter((m) => m.user === u.id)
          const sched = meds.filter((m) => m.scheduledToday)
          const pct = sched.length ? Math.round((sched.filter((m) => m.taken).length / sched.length) * 100) : 0
          return (
            <div key={u.id} className="rounded-2xl border border-line p-3">
              <div className="flex items-center gap-3">
                <UserImageUploader user={u} onPick={(img) => setUserImage(u.id, img)} />
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-extrabold text-ink-900">{u.full || u.name}</div>
                  <div className="flex items-center gap-3 text-[11px] font-semibold text-ink-400">
                    <span>{meds.length} med{meds.length === 1 ? '' : 's'}</span>
                    <span>Adherence {pct}%</span>
                  </div>
                </div>
                <RemoveMemberButton onConfirm={() => removeUser(u.id)} />
              </div>
              {meds.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {meds.map((m) => (
                    <span
                      key={m.id}
                      className="inline-flex items-center gap-1 rounded-full border border-line bg-page/50 py-0.5 pl-0.5 pr-2 text-[10px] font-semibold text-ink-600"
                    >
                      <span className="grid h-4 w-4 place-items-center overflow-hidden rounded-full bg-white">
                        <MedGlyph med={m} className="h-3.5 w-3.5" />
                      </span>
                      {m.name} · {m.time}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="mt-3 border-t border-line pt-3">
        <div className={label}>Add member</div>
        <div className="mt-1.5 flex items-center gap-2">
          <input className={field} placeholder="Member name" value={name} onChange={(e) => setName(e.target.value)} />
          <div className="flex shrink-0 gap-1.5">
            {tones.map(([t, bg]) => (
              <button
                key={t}
                onClick={() => setTone(t)}
                className={`h-8 w-8 rounded-full ${bg} ${tone === t ? 'ring-2 ring-ink-900 ring-offset-2' : ''}`}
              />
            ))}
          </div>
        </div>
        <button
          onClick={() => {
            if (name.trim()) {
              addUser({ name, tone })
              setName('')
            }
          }}
          className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-xl bg-brand-500 py-2.5 text-[13px] font-bold text-white hover:bg-brand-600 transition-colors"
        >
          <Plus className="h-4 w-4" /> Add member
        </button>
        <p className="mt-2 text-center text-[11px] text-ink-400">Removing a member deletes all their medications, inventory &amp; history.</p>
      </div>
    </Shell>
  )
}

const selectCls =
  'rounded-xl border border-line bg-white px-2.5 py-1.5 text-[12px] font-semibold text-ink-700 outline-none focus:border-brand-400'

function HistoryLog() {
  const { history, users, usersById, medications, closeModal } = useApp()
  const [member, setMember] = useState('all')
  const [medName, setMedName] = useState('all')
  const [status, setStatus] = useState('all')
  const [sort, setSort] = useState('new')

  const medNames = [...new Set(history.map((h) => h.name))].sort()

  let rows = history.filter(
    (h) =>
      (member === 'all' || h.user === member) &&
      (medName === 'all' || h.name === medName) &&
      (status === 'all' || h.status === status),
  )
  rows = rows.slice().sort((a, b) => (sort === 'new' ? (b.ts || 0) - (a.ts || 0) : (a.ts || 0) - (b.ts || 0)))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm" onClick={closeModal} />
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-line p-5">
          <div>
            <h2 className="text-[17px] font-extrabold text-ink-900">Full History &amp; Audit Log</h2>
            <p className="text-[12px] text-ink-500">Every dose event across all members · times in IST</p>
          </div>
          <button
            onClick={closeModal}
            className="grid h-8 w-8 place-items-center rounded-full text-ink-400 hover:bg-page transition-colors"
          >
            <Close className="h-4 w-4" />
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 border-b border-line px-5 py-3">
          <select className={selectCls} value={member} onChange={(e) => setMember(e.target.value)}>
            <option value="all">All members</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
          <select className={selectCls} value={medName} onChange={(e) => setMedName(e.target.value)}>
            <option value="all">All medicines</option>
            {medNames.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <select className={selectCls} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">All statuses</option>
            <option value="Taken">Taken</option>
            <option value="Skipped">Skipped</option>
            <option value="Missed">Missed</option>
          </select>
          <button
            onClick={() => setSort((s) => (s === 'new' ? 'old' : 'new'))}
            className={selectCls + ' inline-flex items-center gap-1 hover:bg-page'}
          >
            {sort === 'new' ? 'Newest first' : 'Oldest first'}
          </button>
          <span className="ml-auto text-[12px] font-bold text-ink-400">{rows.length} events</span>
        </div>

        {/* Entries */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-4">
          <div className="space-y-2">
            {rows.map((h, i) => {
              const u = usersById[h.user]
              const med = medications.find((m) => m.name === h.name) || { tone: h.tone || 'brand' }
              const dotColor = h.status === 'Taken' ? 'bg-brand-500' : 'bg-warn-500'
              return (
                <div key={i} className="rounded-2xl border border-line p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-lg border border-line bg-white">
                        <MedGlyph med={med} className="h-5 w-5" />
                      </span>
                      <div className="min-w-0">
                        <div className="truncate text-[13px] font-bold text-ink-900">
                          {h.name} <span className="font-medium text-ink-400">{h.dose}</span>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] font-semibold text-ink-400">
                          {u && <UserAvatar user={u} className="h-3.5 w-3.5 text-[7px]" />}
                          {u ? u.name : 'Unknown'} · {h.day}
                        </div>
                      </div>
                    </div>
                    <span
                      className={
                        'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ' +
                        (h.status === 'Taken' ? 'bg-brand-50 text-brand-600' : 'bg-amber-50 text-warn-500')
                      }
                    >
                      {h.status}
                    </span>
                  </div>

                  {/* Audit timeline */}
                  <div className="mt-2.5 flex items-center gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-ink-400" />
                      <span className="text-[10px] font-semibold text-ink-500">
                        Scheduled <span className="font-bold text-ink-700">{h.scheduled || h.time || '—'}</span>
                      </span>
                    </div>
                    <div className="h-px flex-1 bg-line" />
                    <div className="flex items-center gap-1.5">
                      <span className={'h-2 w-2 rounded-full ' + dotColor} />
                      <span className="text-[10px] font-semibold text-ink-500">
                        {h.status === 'Taken' ? (
                          <>
                            Taken <span className="font-bold text-brand-600">{h.marked || '—'}</span>
                          </>
                        ) : (
                          <span className="font-bold text-warn-500">{h.status}</span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
            {rows.length === 0 && (
              <div className="py-10 text-center text-[13px] font-semibold text-ink-400">No matching events</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

const MODALS = {
  'log-dose': LogDose,
  'add-medication': AddMedication,
  'edit-medication': EditMedication,
  'set-reminder': SetReminder,
  'export-report': ExportReport,
  'full-schedule': FullSchedule,
  'confirm-dose': ConfirmDose,
  'add-to-schedule': AddToSchedule,
  'med-details': MedDetails,
  'restock': Restock,
  'log-symptom': LogSymptom,
  'manage-users': ManageUsers,
  'history-log': HistoryLog,
}

export function ModalLayer() {
  const { modal } = useApp()
  if (!modal) return null
  const Cmp = MODALS[modal]
  return Cmp ? <Cmp /> : null
}
