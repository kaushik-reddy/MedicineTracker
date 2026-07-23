import { useState, useEffect, useRef } from 'react'
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
  ChevronDown,
  SkipForward,
  RefreshCw,
  Trash,
  Upload,
  Note,
  Users,
  Plus,
  RefreshCw as RestockIcon,
  Heart,
  Droplet,
  MoodFace,
  MOODS,
  MOOD_LABEL,
  MOOD_COLOR,
} from '../icons.jsx'
import { PillGlyph, MedGlyph, UserAvatar } from '../ui.jsx'
import { Calendar } from './ScheduleView.jsx'
import { useNow, istCalendarDate, sameDay, addDays, formatLongDate, medActiveOn, istTimeLabel, emptyByLabel } from '../time.js'
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
// Soft gradient header wash per tone — gives the modals a fresh, premium look.
const headMap = {
  brand: 'from-brand-50 via-white to-white',
  accent: 'from-violet-50 via-white to-white',
  warn: 'from-amber-50 via-white to-white',
  sky: 'from-sky-50 via-white to-white',
}

function Shell({ icon: Icon, tone = 'brand', title, subtitle, children }) {
  const { closeModal } = useApp()
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm" onClick={closeModal} />
      <div className="relative flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-black/5">
        <div className={'flex shrink-0 items-start justify-between gap-3 bg-gradient-to-br p-6 pb-5 ' + (headMap[tone] || headMap.brand)}>
          <div className="flex items-center gap-3">
            <span className={'grid h-11 w-11 shrink-0 place-items-center rounded-2xl shadow-sm ring-1 ring-black/5 ' + softMap[tone]}>
              <Icon className="h-6 w-6" />
            </span>
            <div>
              <h2 className="text-[17px] font-extrabold text-ink-900">{title}</h2>
              <p className="text-[12px] text-ink-500">{subtitle}</p>
            </div>
          </div>
          <button
            onClick={closeModal}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/70 text-ink-400 hover:bg-white transition-colors"
          >
            <Close className="h-4 w-4" />
          </button>
        </div>
        <div className="no-scrollbar flex-1 overflow-y-auto px-6 pb-6 pt-4">{children}</div>
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

// Themed replacement for a native <select>. `options` is an array of strings or
// { value, label }. Renders a field-styled trigger + a rounded popup list.
function SelectField({ value, options, onChange, placeholder = 'Select', wrapClass = 'relative mt-1', triggerClass }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    const onDoc = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false)
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])
  const norm = options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o))
  const current = norm.find((o) => o.value === value)
  return (
    <div ref={ref} className={wrapClass}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={(triggerClass || field) + ' flex items-center justify-between gap-2 text-left'}
      >
        <span className={'truncate ' + (current ? '' : 'text-ink-400')}>{current ? current.label : placeholder}</span>
        <ChevronDown className={'h-4 w-4 shrink-0 text-ink-400 transition-transform ' + (open ? 'rotate-180' : '')} />
      </button>
      {open && (
        <div className="absolute z-30 mt-1.5 max-h-56 w-full min-w-[9rem] overflow-y-auto no-scrollbar rounded-xl border border-line bg-white p-1 shadow-lg">
          {norm.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => {
                onChange(o.value)
                setOpen(false)
              }}
              className={
                'block w-full truncate rounded-lg px-3 py-2 text-left text-[13px] font-medium transition-colors ' +
                (o.value === value ? 'bg-brand-50 text-brand-600' : 'text-ink-700 hover:bg-page')
              }
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// Themed date picker built on the app's Calendar. Works on yyyy-mm-dd strings and
// expands inline (so it never gets clipped inside scrollable modal bodies).
function DateField({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const parse = (s) => {
    const [y, m, d] = String(s).split('-').map(Number)
    return y && m && d ? new Date(y, m - 1, d) : istCalendarDate()
  }
  const selected = parse(value)
  const toISO = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={field + ' flex items-center justify-between gap-2 text-left'}
      >
        <span>{selected.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
        <CalendarIcon className="h-4 w-4 shrink-0 text-ink-400" />
      </button>
      {open && (
        <div className="mt-2">
          <Calendar
            value={selected}
            today={istCalendarDate()}
            onChange={(d) => {
              onChange(toISO(d))
              setOpen(false)
            }}
          />
        </div>
      )}
    </div>
  )
}

// Titled section card used to group fields in the medication form.
function FormSection({ title, icon: Icon, children }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-3.5">
      <div className="mb-2.5 flex items-center gap-1.5">
        {Icon && <Icon className="h-3.5 w-3.5 text-accent-500" />}
        <span className="text-[10px] font-bold uppercase tracking-wide text-ink-400">{title}</span>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  )
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
          <SelectField
            value={name}
            options={medications.map((m) => m.name)}
            onChange={setName}
            placeholder="Select medication"
          />
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
  const { addMedication, editMedication, closeModal, users, inventory } = useApp()
  const isEdit = mode === 'edit'
  const info = med?.info || {}
  // For edit, pre-fill the current stock so the user can see and adjust it.
  const invItem = med ? inventory.find((it) => it.medicationId === med.id) : null
  const perDayInit = med?.frequency === 'Twice daily' ? 2 : med?.frequency === 'Weekly' ? 1 / 7 : 1
  const initialQty = isEdit && invItem ? String(Math.max(0, Math.round(invItem.days * perDayInit))) : ''
  const [form, setForm] = useState({
    name: med?.name ?? '',
    dosage: med?.dosage ?? '',
    unit: med?.unit ?? '1 tablet',
    frequency: med?.frequency ?? 'Daily',
    activeDays: med?.activeDays?.length ? med.activeDays : WEEKDAYS.map((d) => d.key),
    startDate: med?.startDate ?? todayISO(),
    quantity: initialQty,
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
  const owner = users.find((u) => u.id === form.user)
  return (
    <Shell
      icon={Pill}
      tone="accent"
      title={isEdit ? 'Edit Medication' : 'Add Medication'}
      subtitle={isEdit ? 'Update the details of this medication' : 'Add a new medication to your list'}
    >
      {/* Live preview of the medication being created/edited */}
      <div className="mb-3 flex items-center gap-3 rounded-2xl border border-line bg-gradient-to-br from-violet-50/70 via-white to-white p-3">
        <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-2xl border border-line bg-white">
          <MedGlyph med={{ image: form.image, tone: form.tone }} className="h-8 w-8" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14px] font-extrabold text-ink-900">{form.name.trim() || 'New medication'}</div>
          <div className="truncate text-[11px] text-ink-500">
            {[form.dosage, form.frequency].filter(Boolean).join(' · ') || 'Fill in the details below'}
          </div>
        </div>
        {owner && <UserAvatar user={owner} className="h-8 w-8 text-[11px]" />}
      </div>

      <div className="max-h-[54vh] space-y-3 overflow-y-auto no-scrollbar pr-0.5">
        <FormSection title="Details" icon={Pill}>
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
        </FormSection>

        <FormSection title="Schedule" icon={CalendarDays}>
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
              <DateField value={form.startDate} onChange={(v) => setForm((f) => ({ ...f, startDate: v }))} />
            </div>
            <div>
              <div className={label}>Time</div>
              <input className={field + ' mt-1'} value={form.time} onChange={set('time')} />
            </div>
          </div>
        </FormSection>

        <FormSection title="Stock & member" icon={Users}>
          <div>
            <div className={label}>{isEdit ? 'Stock in hand' : 'Quantity in stock'}</div>
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
                ? 'Current stock — change the count to update your inventory.'
                : 'How many doses you currently have — used to track your inventory.'}
            </p>
          </div>

          <div>
            <div className={label}>Member</div>
            <div className="mt-1.5 flex flex-wrap gap-2">
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
        </FormSection>

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
          <SelectField
            value={name}
            options={medications.map((m) => m.name)}
            onChange={setName}
            placeholder="Select medication"
          />
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
  const { schedule, medications, history, nextDose, closeModal, usersById } = useApp()
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

  // Build the items for the selected day. Today is live; other days are
  // reconstructed from the dose-log history so past days show what actually
  // happened (taken / skipped / missed) instead of a guess.
  const baseMeds = medications.filter((m) => m.scheduledToday && medActiveOn(m, selected))
  const items = isToday
    ? schedule
    : baseMeds.map((m) => {
        const log = history.find(
          (h) => h.name === m.name && h.user === m.user && h.ts && sameDay(istCalendarDate(h.ts), selected),
        )
        return { ...m, taken: log?.status === 'Taken', skipped: log?.status === 'Skipped' }
      })
  const activeId = isToday ? nextDose?.id : null
  const takenCount = items.filter((i) => i.taken).length
  const skippedCount = items.filter((i) => i.skipped).length
  const dayBadge = isToday
    ? 'bg-brand-50 text-brand-600'
    : isPast
      ? 'bg-page text-ink-500'
      : 'bg-violet-50 text-accent-600'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm" onClick={closeModal} />
      <div className="relative w-full max-w-2xl overflow-visible rounded-3xl bg-white shadow-2xl ring-1 ring-black/5">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 rounded-t-3xl border-b border-line bg-gradient-to-br from-brand-50 via-white to-white p-5">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-600 shadow-sm ring-1 ring-black/5">
              <CalendarDays className="h-6 w-6" />
            </span>
            <div>
              <h2 className="text-[17px] font-extrabold text-ink-900">Full Schedule</h2>
              <p className="text-[12px] text-ink-500">Browse doses by day · times in IST</p>
            </div>
          </div>
          <button
            onClick={closeModal}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/70 text-ink-400 hover:bg-white transition-colors"
          >
            <Close className="h-4 w-4" />
          </button>
        </div>

        {/* Date navigator */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 pt-4">
          <div className="flex flex-1 items-center justify-center gap-2 sm:flex-none sm:justify-start">
            <button
              onClick={() => go(-1)}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-line text-ink-500 hover:bg-page transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="min-w-[130px] flex-1 text-center sm:min-w-[190px] sm:flex-none">
              <div className="text-[14px] font-extrabold text-ink-900">{formatLongDate(selected)}</div>
              <span className={'mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ' + dayBadge}>
                {isToday ? 'Today' : isPast ? 'Past' : 'Upcoming'}
              </span>
            </div>
            <button
              onClick={() => go(1)}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-line text-ink-500 hover:bg-page transition-colors"
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

        {/* Day summary */}
        <div className="mx-5 mt-3 grid grid-cols-3 gap-2">
          <div className="rounded-xl border border-line bg-brand-50/40 p-2 text-center">
            <div className="text-[15px] font-extrabold text-brand-600">{takenCount}</div>
            <div className="text-[9px] font-bold uppercase tracking-wide text-ink-400">Taken</div>
          </div>
          <div className="rounded-xl border border-line bg-amber-50/40 p-2 text-center">
            <div className="text-[15px] font-extrabold text-warn-500">{skippedCount}</div>
            <div className="text-[9px] font-bold uppercase tracking-wide text-ink-400">Skipped</div>
          </div>
          <div className="rounded-xl border border-line bg-page/50 p-2 text-center">
            <div className="text-[15px] font-extrabold text-ink-900">{items.length}</div>
            <div className="text-[9px] font-bold uppercase tracking-wide text-ink-400">Scheduled</div>
          </div>
        </div>

        {/* Day agenda for the selected date (animated on change) */}
        <div className="max-h-[46vh] overflow-y-auto no-scrollbar p-5 pt-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-page text-ink-400">
                <CalendarDays className="h-6 w-6" />
              </span>
              <div className="text-[13px] font-bold text-ink-500">No doses on this day</div>
              <div className="text-[11px] text-ink-400">Nothing was scheduled for {formatLongDate(selected)}.</div>
            </div>
          ) : (
            <div
              key={selected.toDateString()}
              className="animate-slide space-y-2"
              style={{ '--slide': `${dir >= 0 ? 18 : -18}px` }}
            >
              {items.map((it) => {
                const active = it.id === activeId
                const owner = usersById[it.user]
                const state = it.taken ? 'taken' : it.skipped ? 'skipped' : active ? 'active' : 'upcoming'
                const cardCls =
                  state === 'taken'
                    ? 'border-brand-200 bg-brand-50/30'
                    : state === 'skipped'
                      ? 'border-amber-200 bg-amber-50/30'
                      : state === 'active'
                        ? 'border-brand-400 bg-brand-50/40'
                        : 'border-line bg-white'
                return (
                  <div key={it.id} className={'flex items-center gap-3 rounded-2xl border p-3 transition-colors ' + cardCls}>
                    {/* Time */}
                    <div className="w-14 shrink-0 text-center leading-tight">
                      <div className="text-[13px] font-extrabold text-ink-900">{(it.time || '').replace(/\s?[AP]M/i, '')}</div>
                      <div className="text-[9px] font-bold uppercase text-ink-400">{(String(it.time).match(/[AP]M/i) || [''])[0]}</div>
                    </div>
                    <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl border border-line bg-white">
                      <MedGlyph med={it} className="h-7 w-7" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-bold text-ink-900">{it.name}</div>
                      <div className="flex items-center gap-1.5 truncate text-[10px] text-ink-400">
                        <span className="truncate">{it.dosage} • {it.unit}</span>
                        {owner && (
                          <span className="inline-flex shrink-0 items-center gap-1 font-bold text-ink-500">
                            <UserAvatar user={owner} className="h-3.5 w-3.5 text-[7px]" />
                            {owner.name}
                          </span>
                        )}
                      </div>
                    </div>
                    {/* Status (view only — take from the Next Dose card) */}
                    <span
                      className={
                        'shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ' +
                        (it.taken
                          ? 'bg-brand-50 text-brand-600'
                          : it.skipped
                            ? 'bg-amber-50 text-warn-500'
                            : isPast
                              ? 'bg-rose-50 text-coral-500'
                              : 'bg-violet-50 text-accent-600')
                      }
                    >
                      {it.taken ? 'Taken' : it.skipped ? 'Skipped' : isPast ? 'Missed' : 'Upcoming'}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
          {!isToday && items.length > 0 && (
            <p className="mt-3 text-center text-[11px] font-medium text-ink-400">
              Browse days with the arrows or calendar · mark doses from Your Next Dose
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
  const [takenMode, setTakenMode] = useState('now') // 'now' | 'custom'
  const [takenTime, setTakenTime] = useState(() => istTimeLabel())
  if (!confirm) return null
  const med = medications.find((m) => m.id === confirm.medId)
  if (!med) return null

  const cfg = CONFIRM_CFG[confirm.kind]
  const changesTime = confirm.kind === 'snooze' || confirm.kind === 'move'

  const apply = () => {
    if (confirm.kind === 'taken') markTaken(med.id, takenMode === 'custom' ? takenTime : undefined)
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
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTakenMode('now')}
                  className={
                    'rounded-xl border py-2 text-[12px] font-bold transition-colors ' +
                    (takenMode === 'now' ? chipOn : chipOff)
                  }
                >
                  Taken now
                </button>
                <button
                  type="button"
                  onClick={() => setTakenMode('custom')}
                  className={
                    'rounded-xl border py-2 text-[12px] font-bold transition-colors ' +
                    (takenMode === 'custom' ? chipOn : chipOff)
                  }
                >
                  Different time
                </button>
              </div>
              {takenMode === 'custom' && (
                <div className="mt-2.5">
                  <div className={label}>Time taken (IST)</div>
                  <input
                    className={field + ' mt-1'}
                    value={takenTime}
                    onChange={(e) => setTakenTime(e.target.value)}
                    placeholder="e.g. 08:05 AM"
                  />
                  <p className="mt-1 text-[11px] text-ink-400">
                    Use this if you took it earlier and forgot to mark it — it won't be counted as late.
                  </p>
                </div>
              )}
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
          <DateField value={date} onChange={setDate} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className={label}>Time</div>
            <input className={field + ' mt-1'} value={time} onChange={(e) => setTime(e.target.value)} placeholder="08:00 AM" />
          </div>
          <div>
            <div className={label}>Frequency</div>
            <SelectField value={frequency} options={['Daily', 'Twice daily', 'Weekly']} onChange={setFrequency} />
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
  const { confirm, medications, openScheduleMed, openEditMed, duplicateMedication, requestConfirm, setMedImage, closeModal, usersById } = useApp()
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

  // Prominent facts shown as tiles; the rest go in the detail list below.
  const quickStats = [
    { label: 'Dosage', value: `${med.dosage} • ${med.unit}`, icon: Pill },
    { label: 'Frequency', value: med.frequency, icon: RefreshCw },
    { label: 'Time', value: med.time, icon: Bell },
  ]
  const rows = [
    ['Member', owner ? owner.full || owner.name : '—'],
    ['Generic name', med.sub],
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
      <div className="relative flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-black/5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 bg-gradient-to-br from-brand-50 via-white to-white p-5">
          <div className="flex min-w-0 items-center gap-3">
            <ImageUploader med={med} onPick={(img) => setMedImage(med.id, img)} />
            <div className="min-w-0">
              <h2 className="break-words text-[19px] font-extrabold leading-tight text-ink-900">{med.name}</h2>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="max-w-[180px] truncate rounded-full bg-page px-2 py-0.5 text-[10px] font-bold text-ink-500">{info.category}</span>
                <span className={'text-[12px] font-bold ' + statusColor}>{statusLabel}</span>
                {owner && (
                  <span className="inline-flex items-center gap-1">
                    <UserAvatar user={owner} className="h-4 w-4 text-[8px]" />
                    <span className="max-w-[140px] truncate text-[11px] font-bold text-ink-500">{owner.name}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={closeModal}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/70 text-ink-400 hover:bg-white transition-colors"
          >
            <Close className="h-4 w-4" />
          </button>
        </div>

        {/* Landscape body: details (left) · medical information (right) */}
        <div className="grid flex-1 gap-5 overflow-y-auto no-scrollbar p-5 pt-3 md:grid-cols-2">
          {/* LEFT — details */}
          <div className="space-y-3">
            <div className="text-[11px] font-bold uppercase tracking-wide text-ink-400">Details</div>
            <div className="grid grid-cols-3 gap-2">
              {quickStats.map((s) => (
                <div key={s.label} className="rounded-2xl border border-line bg-page/40 p-2.5 text-center">
                  <s.icon className="mx-auto h-4 w-4 text-accent-500" />
                  <div className="mt-1 truncate text-[12px] font-extrabold text-ink-900" title={s.value}>
                    {s.value}
                  </div>
                  <div className="text-[9px] font-bold uppercase tracking-wide text-ink-400">{s.label}</div>
                </div>
              ))}
            </div>
            <div className="divide-y divide-line rounded-2xl border border-line">
              {rows.map(([k, v]) => (
                <div key={k} className="flex items-start justify-between gap-3 px-4 py-2.5">
                  <span className="shrink-0 text-[12px] font-semibold text-ink-500">{k}</span>
                  <span className="min-w-0 break-words text-right text-[13px] font-bold text-ink-900">{v}</span>
                </div>
              ))}
            </div>
            <p className="px-1 text-[11px] text-ink-400">Tap the image to upload your own pill/capsule photo (optional).</p>
          </div>

          {/* RIGHT — medical information */}
          <div className="space-y-2.5">
            <div className="text-[11px] font-bold uppercase tracking-wide text-ink-400">Medical information</div>
            {infoRows.map(([k, v]) => (
              <div key={k} className="rounded-2xl border border-line bg-page/40 p-3">
                <div className="text-[11px] font-bold text-accent-600">{k}</div>
                <div className="mt-0.5 text-[12px] leading-snug text-ink-700">{v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer — all actions in one row */}
        <div className="flex flex-wrap gap-2.5 border-t border-line p-4">
          <button
            onClick={() => openEditMed(med.id)}
            className="flex min-w-[110px] flex-1 items-center justify-center gap-1.5 rounded-xl border border-line py-2.5 text-[12px] font-bold text-ink-600 hover:bg-page transition-colors"
          >
            <Note className="h-4 w-4" /> Edit
          </button>
          <button
            onClick={() => duplicateMedication(med.id)}
            className="flex min-w-[110px] flex-1 items-center justify-center gap-1.5 rounded-xl border border-line py-2.5 text-[12px] font-bold text-ink-600 hover:bg-page transition-colors"
          >
            <Plus className="h-4 w-4" /> Duplicate
          </button>
          <button
            onClick={() => openScheduleMed(med.id)}
            className="flex min-w-[130px] flex-1 items-center justify-center gap-1.5 rounded-xl bg-brand-500 py-2.5 text-[12px] font-bold text-white hover:bg-brand-600 transition-colors"
          >
            <CalendarDays className="h-4 w-4" /> Add to calendar
          </button>
          {med.scheduledToday && (
            <button
              onClick={() => requestConfirm({ kind: 'unschedule', medId: med.id })}
              className="flex min-w-[110px] flex-1 items-center justify-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 py-2.5 text-[12px] font-bold text-warn-500 hover:bg-amber-100 transition-colors"
            >
              <Trash className="h-4 w-4" /> Remove
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function Restock() {
  const { restockId, inventory, restock, closeModal, usersById } = useApp()
  const item = inventory.find((it) => it.id === restockId)
  const [qty, setQty] = useState(30)
  if (!item) return null
  const low = item.days <= 10
  const owner = usersById[item.user]
  const newDays = item.days + qty

  return (
    <Shell icon={RestockIcon} tone="brand" title="Restock medication" subtitle="Top up this medication's stock">
      {/* Stock overview */}
      <div className={'rounded-2xl border p-3.5 ' + (low ? 'border-amber-200 bg-amber-50/40' : 'border-line bg-page/40')}>
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-line bg-white">
            <PillGlyph tone={item.tone} className="h-7 w-7" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[14px] font-extrabold text-ink-900">{item.name}</div>
            <div className="flex items-center gap-1.5 truncate text-[11px] text-ink-400">
              {owner && (
                <span className="inline-flex items-center gap-1 font-bold text-ink-500">
                  <UserAvatar user={owner} className="h-3.5 w-3.5 text-[7px]" />
                  {owner.name}
                </span>
              )}
              {item.detail && <span className="truncate">· {item.detail}</span>}
            </div>
          </div>
          {low && (
            <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-warn-500">
              Low
            </span>
          )}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-white p-2 text-center">
            <div className={'text-[16px] font-extrabold ' + (low ? 'text-warn-500' : 'text-ink-900')}>{item.days}</div>
            <div className="text-[9px] font-bold uppercase tracking-wide text-ink-400">Days left</div>
          </div>
          <div className="rounded-xl bg-white p-2 text-center">
            <div className="text-[13px] font-extrabold text-ink-900">{emptyByLabel(item.days)}</div>
            <div className="text-[9px] font-bold uppercase tracking-wide text-ink-400">Empty by</div>
          </div>
        </div>
      </div>

      {/* Units to add */}
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
          {[10, 30, 60, 90].map((n) => (
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
      </div>

      {/* After-restock preview */}
      <div className="mt-3 flex items-center justify-between gap-2 rounded-2xl border border-brand-200 bg-brand-50/50 px-4 py-2.5">
        <span className="text-[12px] font-semibold text-brand-700">After restock</span>
        <span className="text-right text-[12px] font-extrabold text-brand-700">
          {newDays} days · empty by {emptyByLabel(newDays)}
        </span>
      </div>

      <Actions
        tone="brand"
        confirmLabel="Restock"
        onConfirm={() => {
          restock(item.id, qty)
          closeModal()
        }}
      />
    </Shell>
  )
}

function LogSymptom() {
  const { logSymptom, closeModal, users } = useApp()
  const [text, setText] = useState('')
  const [severity, setSeverity] = useState('')
  const [mood, setMood] = useState('good')
  const [member, setMember] = useState(users[0]?.id ?? '')
  const sevCls = {
    Mild: 'border-brand-400 bg-brand-50 text-brand-600',
    Moderate: 'border-amber-400 bg-amber-50 text-warn-500',
    Severe: 'border-rose-300 bg-rose-50 text-coral-500',
  }
  return (
    <Shell icon={Note} tone="accent" title="Log Mood / Symptom" subtitle="How are you feeling today?">
      <div className="space-y-3">
        {users.length > 0 && (
          <div>
            <div className={label}>Member</div>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {users.map((u) => (
                <button
                  key={u.id}
                  onClick={() => setMember(u.id)}
                  className={
                    'flex items-center gap-1.5 rounded-full border py-1 pl-1 pr-2.5 transition-colors ' +
                    (member === u.id ? 'border-accent-400 bg-violet-50' : 'border-line hover:bg-page')
                  }
                >
                  <UserAvatar user={u} className="h-5 w-5 text-[9px]" />
                  <span className="text-[11px] font-bold text-ink-700">{u.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Mood — how you feel overall */}
        <div className="rounded-2xl border border-line p-3">
          <div className="flex items-center gap-1.5">
            <Heart className="h-3.5 w-3.5 text-accent-500" />
            <span className="text-[12px] font-bold text-ink-700">Mood</span>
            <span className="text-[11px] font-medium text-ink-400">· how you feel overall</span>
          </div>
          <div className="mt-2 flex gap-2">
            {MOODS.map((key) => (
              <button
                key={key}
                onClick={() => setMood(key)}
                className={
                  'flex flex-1 flex-col items-center gap-1 rounded-xl border py-2 transition-colors ' +
                  (mood === key ? 'border-accent-400 bg-violet-50' : 'border-line hover:bg-page')
                }
              >
                <MoodFace mood={key} className={'h-6 w-6 ' + (mood === key ? MOOD_COLOR[key] : 'text-ink-300')} />
                <span className={'text-[9px] font-bold ' + (mood === key ? 'text-ink-700' : 'text-ink-400')}>{MOOD_LABEL[key]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Symptom — what's bothering you (optional) */}
        <div className="rounded-2xl border border-line p-3">
          <div className="flex items-center gap-1.5">
            <Droplet className="h-3.5 w-3.5 text-accent-500" />
            <span className="text-[12px] font-bold text-ink-700">Symptom</span>
            <span className="text-[11px] font-medium text-ink-400">· optional</span>
          </div>
          <input
            className={field + ' mt-2'}
            placeholder="e.g. Headache, nausea, dizziness…"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="mt-2.5 flex items-center justify-between">
            <div className={label}>Severity</div>
            <span className="text-[10px] font-medium text-ink-400">optional</span>
          </div>
          <div className="mt-1.5 flex gap-2">
            {['Mild', 'Moderate', 'Severe'].map((s) => (
              <button
                key={s}
                onClick={() => setSeverity((cur) => (cur === s ? '' : s))}
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
        confirmLabel="Log entry"
        onConfirm={() => {
          logSymptom({ name: text.trim() || 'Mood check', severity: severity || null, mood, user: member || null })
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

  const statusBadge = {
    Taken: 'bg-brand-50 text-brand-600',
    Skipped: 'bg-amber-50 text-warn-500',
    Missed: 'bg-rose-50 text-coral-500',
    Snoozed: 'bg-amber-50 text-warn-500',
    Rescheduled: 'bg-violet-50 text-accent-600',
  }
  const statusDot = {
    Taken: 'bg-brand-500',
    Skipped: 'bg-warn-500',
    Missed: 'bg-coral-500',
    Snoozed: 'bg-warn-500',
    Rescheduled: 'bg-accent-500',
  }

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
          <SelectField
            value={member}
            onChange={setMember}
            wrapClass="relative w-36"
            triggerClass={selectCls + ' w-full'}
            options={[{ value: 'all', label: 'All members' }, ...users.map((u) => ({ value: u.id, label: u.name }))]}
          />
          <SelectField
            value={medName}
            onChange={setMedName}
            wrapClass="relative w-40"
            triggerClass={selectCls + ' w-full'}
            options={[{ value: 'all', label: 'All medicines' }, ...medNames.map((n) => ({ value: n, label: n }))]}
          />
          <SelectField
            value={status}
            onChange={setStatus}
            wrapClass="relative w-32"
            triggerClass={selectCls + ' w-full'}
            options={[
              { value: 'all', label: 'All statuses' },
              { value: 'Taken', label: 'Taken' },
              { value: 'Skipped', label: 'Skipped' },
              { value: 'Snoozed', label: 'Snoozed' },
              { value: 'Rescheduled', label: 'Rescheduled' },
              { value: 'Missed', label: 'Missed' },
            ]}
          />
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
              const dotColor = statusDot[h.status] || 'bg-warn-500'
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
                        (statusBadge[h.status] || 'bg-amber-50 text-warn-500')
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
                        ) : h.status === 'Snoozed' ? (
                          <>
                            Snoozed to <span className="font-bold text-warn-500">{h.marked || '—'}</span>
                          </>
                        ) : h.status === 'Rescheduled' ? (
                          <>
                            Moved to <span className="font-bold text-accent-600">{h.marked || '—'}</span>
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
