// Sample seed data for MediTrack (local / in-memory mode).
//
// When Supabase persistence is OFF (no VITE_SUPABASE_* env vars), the app boots
// with the data below so every card has something realistic to show: multiple
// household members, medications across all frequencies + scheduling options, a
// full stock/inventory range (including a low item), 30 days of dose history
// (taken / skipped / missed / snoozed / rescheduled), mood + symptom logs and
// daily water intake — spanning the last 30 days and continuing into the next 30
// via recurring schedules and a future-dated medication.

export const user = { name: 'Kaushik Reddy', initials: 'KR' }

// ---- small local helpers (kept independent of time.js so this file self-seeds) --
const DAY = 86400000
const NOW = Date.now()
// Sample/demo data is included in local dev only; production builds ship empty so
// real accounts start clean (medications/trackers load from Supabase per user).
const DEMO = import.meta.env.DEV
const uid = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `id-${Math.random().toString(36).slice(2)}`

const DAY_KEYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const pad = (x) => String(x).padStart(2, '0')

// A JS Date `n` days before now (negative = future), at a given local clock time.
const dateNDaysAgo = (n, hour = 9, min = 0) => {
  const d = new Date(NOW - n * DAY)
  d.setHours(hour, min, 0, 0)
  return d
}
const isoLocal = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const fmtTime = (h, m = 0) => {
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = ((h + 11) % 12) + 1
  return `${pad(h12)}:${pad(m)} ${ampm}`
}
const fmtLabel = (h) => {
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = ((h + 11) % 12) + 1
  return `${h12} ${ampm}`
}
const readable = (d) =>
  d.toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

export const DEFAULT_MED_INFO = {
  category: 'Medication',
  purpose: 'General use — details not provided.',
  instructions: 'Take as directed on the label or by your doctor.',
  sideEffects: 'Refer to the package leaflet for possible side effects.',
  warnings: 'Consult your doctor or pharmacist if unsure.',
}

// ---------------------------------------------------------------------------
// Household members (each colour-toned for avatars / name text).
// ---------------------------------------------------------------------------
const U = {
  kaushik: uid(),
  priya: uid(),
  arjun: uid(),
  lakshmi: uid(),
}

const USERS = [
  { id: U.kaushik, name: 'Kaushik', full: 'Kaushik Reddy', initials: 'K', tone: 'brand' },
  { id: U.priya, name: 'Priya', full: 'Priya Reddy', initials: 'P', tone: 'accent' },
  { id: U.arjun, name: 'Arjun', full: 'Arjun Reddy', initials: 'A', tone: 'coral' },
  { id: U.lakshmi, name: 'Lakshmi', full: 'Lakshmi Reddy', initials: 'L', tone: 'sky' },
]
export const users = DEMO ? USERS : []

// ---------------------------------------------------------------------------
// Medications — deliberately spans every scheduling feature the app supports:
//   • Daily, Twice daily and Weekly frequencies
//   • custom repeat weekdays (Amoxicillin: Mon/Wed/Fri)
//   • a future start date (Iron: begins in 7 days → shows in the next-30-day window)
//   • an off-schedule / as-needed medication (Ibuprofen)
//   • the full stock range incl. a low-stock item (Atorvastatin)
//   • all three accent tones and four members
// ---------------------------------------------------------------------------
const MEDS = [
  {
    key: 'levo',
    user: U.lakshmi,
    name: 'Levothyroxine',
    sub: 'Synthroid',
    dosage: '50 mcg',
    unit: '1 tablet',
    frequency: 'Daily',
    hour: 7,
    tone: 'sky',
    activeDays: DAY_KEYS.slice(),
    startAgo: 90,
    stockUnits: 45,
    takenToday: true,
    info: {
      category: 'Thyroid',
      purpose: 'Replaces thyroid hormone to treat hypothyroidism.',
      instructions: 'Take on an empty stomach, 30–60 min before breakfast.',
      sideEffects: 'Palpitations, weight change, insomnia if over-dosed.',
      warnings: 'Do not take within 4 hours of calcium or iron supplements.',
    },
  },
  {
    key: 'aspirin',
    user: U.kaushik,
    name: 'Aspirin',
    sub: 'Ecosprin',
    dosage: '75 mg',
    unit: '1 tablet',
    frequency: 'Daily',
    hour: 8,
    tone: 'brand',
    activeDays: DAY_KEYS.slice(),
    startAgo: 120,
    stockUnits: 60,
    takenToday: true,
    info: {
      category: 'Cardiovascular',
      purpose: 'Low-dose blood thinner to reduce clot risk.',
      instructions: 'Take with food to protect the stomach.',
      sideEffects: 'Stomach irritation, easy bruising.',
      warnings: 'Avoid with other NSAIDs; tell your dentist before procedures.',
    },
  },
  {
    key: 'metformin',
    user: U.priya,
    name: 'Metformin',
    sub: 'Glycomet',
    dosage: '500 mg',
    unit: '1 tablet',
    frequency: 'Twice daily',
    hour: 8,
    secondHour: 20,
    tone: 'accent',
    activeDays: DAY_KEYS.slice(),
    startAgo: 60,
    stockUnits: 44,
    takenToday: true, // morning dose taken
    info: {
      category: 'Diabetes',
      purpose: 'Lowers blood sugar in type 2 diabetes.',
      instructions: 'Take with morning and evening meals.',
      sideEffects: 'Nausea, upset stomach, metallic taste.',
      warnings: 'Stay hydrated; pause before contrast scans.',
    },
  },
  {
    key: 'atorva',
    user: U.lakshmi,
    name: 'Atorvastatin',
    sub: 'Lipitor',
    dosage: '10 mg',
    unit: '1 tablet',
    frequency: 'Daily',
    hour: 21,
    tone: 'coral',
    activeDays: DAY_KEYS.slice(),
    startAgo: 75,
    stockUnits: 6, // low stock → triggers the "low" badge
    info: {
      category: 'Cholesterol',
      purpose: 'Lowers LDL cholesterol.',
      instructions: 'Take at night, with or without food.',
      sideEffects: 'Muscle aches, mild digestive upset.',
      warnings: 'Avoid grapefruit juice; report unexplained muscle pain.',
    },
  },
  {
    key: 'vitd',
    user: U.kaushik,
    name: 'Vitamin D3',
    sub: 'Cholecalciferol',
    dosage: '60,000 IU',
    unit: '1 sachet',
    frequency: 'Weekly',
    hour: 9,
    tone: 'brand',
    activeDays: ['Sun'], // once a week
    startAgo: 84,
    stockUnits: 8,
    info: {
      category: 'Supplement',
      purpose: 'Weekly vitamin D top-up for bone health.',
      instructions: 'Dissolve the sachet in water after breakfast on Sundays.',
      sideEffects: 'Rare at recommended doses.',
      warnings: 'Do not exceed the weekly dose without advice.',
    },
  },
  {
    key: 'amox',
    user: U.arjun,
    name: 'Amoxicillin',
    sub: 'Mox',
    dosage: '250 mg',
    unit: '1 capsule',
    frequency: 'Daily',
    hour: 18,
    tone: 'sky',
    activeDays: ['Mon', 'Wed', 'Fri'], // custom repeat days
    startAgo: 20,
    stockUnits: 15,
    info: {
      category: 'Antibiotic',
      purpose: 'Short antibiotic course for an ear infection.',
      instructions: 'Take on Mon/Wed/Fri evenings until the course ends.',
      sideEffects: 'Diarrhoea, rash.',
      warnings: 'Finish the full course even if symptoms improve.',
    },
  },
  {
    key: 'iron',
    user: U.priya,
    name: 'Iron Supplement',
    sub: 'Ferrous fumarate',
    dosage: '65 mg',
    unit: '1 tablet',
    frequency: 'Daily',
    hour: 10,
    tone: 'accent',
    activeDays: DAY_KEYS.slice(),
    startIn: 7, // begins in 7 days → appears in the next-30-day schedule
    stockUnits: 30,
    info: {
      category: 'Supplement',
      purpose: 'Treats iron-deficiency anaemia.',
      instructions: 'Take with vitamin C; avoid tea/coffee around the dose.',
      sideEffects: 'Constipation, dark stools.',
      warnings: 'Keep away from children — iron overdose is dangerous.',
    },
  },
  {
    key: 'ibu',
    user: U.kaushik,
    name: 'Ibuprofen',
    sub: 'Brufen',
    dosage: '400 mg',
    unit: '1 tablet',
    frequency: 'Daily',
    hour: 13,
    tone: 'coral',
    activeDays: DAY_KEYS.slice(),
    startAgo: 30,
    stockUnits: 20,
    offSchedule: true, // as-needed: in the med list but not on the daily schedule
    info: {
      category: 'Pain relief',
      purpose: 'As-needed relief for headaches and muscle pain.',
      instructions: 'Take with food only when needed, max 3× a day.',
      sideEffects: 'Stomach upset, heartburn.',
      warnings: 'Avoid combining with aspirin for long periods.',
    },
  },
]

// Build the medication records the store consumes. Stock is anchored at "now" so
// the 30 days of past history below don't deplete the displayed baseline.
const MEDICATIONS = MEDS.map((m) => {
  m.id = uid()
  const startDate = m.startIn
    ? isoLocal(dateNDaysAgo(-m.startIn))
    : isoLocal(dateNDaysAgo(m.startAgo ?? 60))
  return {
    id: m.id,
    user: m.user,
    name: m.name,
    sub: m.sub,
    dosage: m.dosage,
    unit: m.unit,
    frequency: m.frequency,
    time: fmtTime(m.hour, 0),
    label: fmtLabel(m.hour),
    period: m.hour < 12 ? 'am' : m.hour < 17 ? 'day' : 'pm',
    tone: m.tone,
    image: null,
    taken: !!m.takenToday,
    skipped: false,
    scheduledToday: !m.offSchedule,
    activeDays: m.activeDays,
    startDate,
    stockUnits: m.stockUnits,
    stockAnchor: NOW,
    info: m.info,
  }
})
export const medications = DEMO ? MEDICATIONS : []

const medByKey = Object.fromEntries(MEDS.map((m) => [m.key, m]))

// ---------------------------------------------------------------------------
// Inventory — one linked stock row per medication (days/pct are fallbacks; the
// live value is derived from stockUnits − doses taken in the store).
// ---------------------------------------------------------------------------
const perDayOf = (freq) => (freq === 'Twice daily' ? 2 : freq === 'Weekly' ? 1 / 7 : 1)

export const inventory = DEMO
  ? MEDS.map((m) => {
      const perDay = perDayOf(m.frequency)
      const days = perDay > 0 ? Math.max(0, Math.round(m.stockUnits / perDay)) : m.stockUnits
      return {
        id: uid(),
        medicationId: m.id,
        name: m.name,
        detail: `${m.stockUnits} ${m.stockUnits === 1 ? 'unit' : 'units'} in stock`,
        days,
        pct: 100,
        tone: m.tone,
        user: m.user,
      }
    })
  : []

// ---------------------------------------------------------------------------
// Dose history — 30 days of realistic logs for every scheduled medication,
// exercising all statuses (Taken / Skipped / Missed / Snoozed / Rescheduled).
// ---------------------------------------------------------------------------
const activeOnDay = (m, d) => {
  if (m.startAgo != null && dateNDaysAgo(m.startAgo) > d) return false
  if (Array.isArray(m.activeDays) && m.activeDays.length > 0 && m.activeDays.length < 7) {
    if (!m.activeDays.includes(DAY_KEYS[d.getDay()])) return false
  }
  return true
}

const entry = (m, ts, hour, status, marked, extra = {}) => ({
  id: uid(),
  ts,
  day: 'Log',
  date: readable(new Date(ts)),
  scheduled: fmtTime(hour, 0),
  marked: marked ?? null,
  name: m.name,
  dose: m.dosage,
  status,
  tone: status === 'Skipped' ? 'warn' : status === 'Missed' ? 'coral' : m.tone,
  user: m.user,
  ...extra,
})

function buildHistory() {
  const out = []
  for (const m of MEDS) {
    if (m.offSchedule || m.startIn) continue // as-needed & future meds have no past logs
    for (let n = 30; n >= 1; n--) {
      const base = dateNDaysAgo(n, m.hour, 0)
      if (!activeOnDay(m, base)) continue
      const hours = [m.hour]
      if (m.secondHour != null) hours.push(m.secondHour)
      for (const h of hours) {
        const d = dateNDaysAgo(n, h, 0)
        const ts = d.getTime()
        const sched = fmtTime(h, 0)
        // Deterministic variety so the feed looks lived-in without randomness.
        if (n % 13 === 0) {
          out.push(entry(m, ts, h, 'Skipped', null))
        } else if (n % 17 === 0) {
          out.push(entry(m, ts, h, 'Missed', null))
        } else if (n % 11 === 0) {
          out.push(entry(m, ts, h, 'Snoozed', fmtTime(h, 30)))
          out.push(entry(m, ts + 30 * 60000, h, 'Taken', fmtTime(h, 30)))
        } else if (n % 19 === 0) {
          out.push(entry(m, ts, h, 'Rescheduled', fmtTime(h + 1, 0)))
          out.push(entry(m, ts + 60 * 60000, h, 'Taken', fmtTime(h + 1, 0)))
        } else {
          out.push(entry(m, ts, h, 'Taken', sched))
        }
      }
    }
  }
  // Today's resolved doses for the meds flagged taken (keeps taken flags consistent
  // with reconcileMedsForToday, which needs a matching same-day log).
  const todayTs = NOW - 2 * 3600 * 1000
  for (const key of ['levo', 'aspirin', 'metformin']) {
    const m = medByKey[key]
    out.push(entry(m, todayTs, m.hour, 'Taken', fmtTime(m.hour, 0), { day: 'Today', date: `Today, ${fmtTime(m.hour, 0)}` }))
  }
  return out.sort((a, b) => b.ts - a.ts)
}

export const history = DEMO ? buildHistory() : []

// ---------------------------------------------------------------------------
// Symptom / mood logs — spread across the last 30 days, tied to members.
// mood keys: great | good | okay | low | bad ; severity: Mild | Moderate | Severe
// ---------------------------------------------------------------------------
const SYMPTOMS = [
  { ago: 1, user: U.priya, name: 'Feeling energetic', mood: 'great', severity: null },
  { ago: 2, user: U.lakshmi, name: 'Mild joint stiffness', mood: 'okay', severity: 'Mild' },
  { ago: 4, user: U.kaushik, name: 'Headache', mood: 'low', severity: 'Moderate' },
  { ago: 6, user: U.arjun, name: 'Sore throat', mood: 'low', severity: 'Mild' },
  { ago: 9, user: U.priya, name: 'Nausea after dose', mood: 'bad', severity: 'Moderate' },
  { ago: 13, user: U.lakshmi, name: 'Dizziness', mood: 'low', severity: 'Severe' },
  { ago: 18, user: U.kaushik, name: 'Slept well', mood: 'great', severity: null },
  { ago: 24, user: U.arjun, name: 'Fever', mood: 'bad', severity: 'Moderate' },
  { ago: 28, user: U.priya, name: 'Feeling good', mood: 'good', severity: null },
]

export const symptoms = DEMO
  ? SYMPTOMS.map((s) => {
      const d = dateNDaysAgo(s.ago, 12 + (s.ago % 6), 15)
      return { id: uid(), ts: d.getTime(), name: s.name, severity: s.severity, mood: s.mood, user: s.user }
    })
  : []

// ---------------------------------------------------------------------------
// Water intake — daily totals (ml) for the last 30 days + today (partial).
// ---------------------------------------------------------------------------
export const waterGoal = 2000

export const water = DEMO
  ? (() => {
      const rows = []
      for (let n = 365; n >= 0; n--) {
        const d = dateNDaysAgo(n)
        // Wave + a mild upward trend so day/week/month/year comparisons vary.
        const wave = Math.round(Math.sin(n / 2.3) * 350)
        let ml = 1800 + wave + (n % 3) * 150 - Math.round(n * 0.8)
        if (n === 0) ml = 900 // today is still in progress
        rows.push({ date: isoLocal(d), ml: Math.max(0, ml) })
      }
      return rows
    })()
  : []

// ---------------------------------------------------------------------------
// Step count — daily totals for the last 30 days + today (partial).
// ---------------------------------------------------------------------------
export const stepsGoal = 10000

export const steps = DEMO
  ? (() => {
      const rows = []
      for (let n = 365; n >= 0; n--) {
        const d = dateNDaysAgo(n)
        const wave = Math.round(Math.sin(n / 2.0) * 2200)
        let s = 8600 + wave + (n % 4) * 350 - Math.round(n * 6)
        if (n === 0) s = 6400 // today is still in progress
        rows.push({ date: isoLocal(d), steps: Math.max(0, s) })
      }
      return rows
    })()
  : []

// ---------------------------------------------------------------------------
// Sleep — minutes slept per night for the last 30 days + last night.
// ---------------------------------------------------------------------------
export const sleepGoal = 480 // 8 hours

export const sleep = DEMO
  ? (() => {
      const rows = []
      for (let n = 365; n >= 0; n--) {
        const d = dateNDaysAgo(n)
        const wave = Math.round(Math.sin(n / 1.7) * 55)
        let m = 445 + wave + (n % 3) * 15 - Math.round(n * 0.15)
        rows.push({ date: isoLocal(d), mins: Math.max(0, m) })
      }
      return rows
    })()
  : []

export const streak = []

export const quickActions = [
  { icon: 'bellplus', tone: 'warn', title: 'Set Reminder', body: 'Customize dose reminders', action: 'set-reminder' },
  { icon: 'users', tone: 'brand', title: 'Manage Members', body: 'Add or remove members', action: 'manage-users' },
  { icon: 'note', tone: 'accent', title: 'Log Mood / Symptom', body: 'Record how you feel', action: 'log-symptom' },
  { icon: 'download', tone: 'sky', title: 'Export Report', body: 'Download your report', action: 'export-report' },
]

export const tips = [
  { title: 'Stay hydrated!', body: 'Drinking enough water helps your medication work better.' },
  { title: 'Take with food', body: 'Some medications absorb better alongside a light meal.' },
  { title: 'Consistent timing', body: 'Taking doses at the same time builds a reliable habit.' },
]
