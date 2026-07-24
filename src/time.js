import { useState, useEffect } from 'react'

const IST_TZ = 'Asia/Kolkata'

// Re-render on an interval so live countdowns/clocks stay current.
export function useNow(interval = 1000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), interval)
    return () => clearInterval(id)
  }, [interval])
  return now
}

// Break an epoch into IST calendar/clock parts regardless of the user's zone.
export function istParts(epoch = Date.now()) {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: IST_TZ,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
  const p = Object.fromEntries(
    fmt
      .formatToParts(new Date(epoch))
      .filter((x) => x.type !== 'literal')
      .map((x) => [x.type, Number(x.value)]),
  )
  // Intl may return hour 24 at midnight in some engines.
  if (p.hour === 24) p.hour = 0
  return p
}

export function istSecondsOfDay(epoch = Date.now()) {
  const { hour, minute, second } = istParts(epoch)
  return hour * 3600 + minute * 60 + second
}

export function parseDoseSeconds(time) {
  const m = String(time).match(/(\d+):(\d+)\s*(AM|PM)/i)
  if (!m) return 0
  let h = Number(m[1]) % 12
  if (/pm/i.test(m[3])) h += 12
  return h * 3600 + Number(m[2]) * 60
}

export function countdown(time, epoch = Date.now()) {
  let diff = parseDoseSeconds(time) - istSecondsOfDay(epoch)
  const overdue = diff < 0
  diff = Math.abs(diff)
  return { h: Math.floor(diff / 3600), m: Math.floor((diff % 3600) / 60), s: diff % 60, overdue }
}

const pad = (x) => String(x).padStart(2, '0')

export function formatCountdown(time, epoch = Date.now()) {
  const { h, m, s, overdue } = countdown(time, epoch)
  const core = `${h > 0 ? `${h}h ` : ''}${pad(m)}m ${pad(s)}s`
  return overdue ? `overdue by ${core}` : `in ${core}`
}

export function isOverdue(time, epoch = Date.now()) {
  return parseDoseSeconds(time) - istSecondsOfDay(epoch) < 0
}

// Format a minutes-of-day into "hh:mm AM/PM".
function fmtMinutes(total) {
  total = ((Math.round(total) % 1440) + 1440) % 1440
  const h = Math.floor(total / 60)
  const mi = total % 60
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = ((h + 11) % 12) + 1
  return `${pad(h12)}:${pad(mi)} ${ampm}`
}

// Current IST time as a dose-style label (used as reschedule default).
export function istTimeLabel(epoch = Date.now()) {
  return fmtMinutes(istSecondsOfDay(epoch) / 60)
}

// "now (IST) + mins" as a dose-style label.
export function timeAfterNow(mins, epoch = Date.now()) {
  return fmtMinutes(istSecondsOfDay(epoch) / 60 + mins)
}

// "<dose time> + mins" as a dose-style label (used for snooze relative to the dose).
export function addMinutesToTime(time, mins) {
  return fmtMinutes(parseDoseSeconds(time) / 60 + mins)
}

// ---- Calendar-date helpers (work on plain JS dates representing y/m/d) ----
export function istCalendarDate(epoch = Date.now()) {
  const p = istParts(epoch)
  return new Date(p.year, p.month - 1, p.day)
}

export function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

export function addDays(d, n) {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

export function formatLongDate(d) {
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
}

export function formatShortDate(d) {
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

// "Empty by <date>" label from remaining days of stock (IST today + days).
export function emptyByLabel(days) {
  return formatShortDate(addDays(istCalendarDate(), days))
}

// ---- Dose-history collapsing -------------------------------------------------
// A dose can produce several raw log rows in one day (e.g. Snoozed → Rescheduled →
// Taken). For the timeline and every adherence/streak stat we want ONE entry per
// logical dose, so repeated delays don't show as separate rows or inflate totals.
// A dose is grouped by (member + medication + IST calendar day) and split into
// "sessions" that each end at a terminal status (Taken/Skipped/Missed). Trailing
// non-terminal events (still pending / only snoozed) form one open session.
const TERMINAL_STATUS = new Set(['Taken', 'Skipped', 'Missed'])

export function collapseDoseHistory(history = []) {
  const groups = new Map()
  for (const e of history) {
    if (!e) continue
    const dayKey = e.ts ? istCalendarDate(e.ts).getTime() : `no-ts-${e.id}`
    const key = `${e.user ?? ''}|${e.name ?? ''}|${dayKey}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(e)
  }

  const doses = []
  for (const entries of groups.values()) {
    const asc = entries.slice().sort((a, b) => (a.ts || 0) - (b.ts || 0))
    let buf = []
    const flush = (terminal) => {
      const all = terminal ? [...buf, terminal] : buf
      if (!all.length) return
      const first = all[0]
      const last = all[all.length - 1]
      const takenEvt = all.find((x) => x.status === 'Taken')
      const resolved = terminal || last
      const moves = all.filter((x) => x.status === 'Snoozed' || x.status === 'Rescheduled').length
      doses.push({
        ...resolved,
        id: resolved.id || first.id,
        ts: resolved.ts || last.ts,
        // Keep the ORIGINAL scheduled time (before any snooze/reschedule moved it).
        scheduled: first.scheduled || first.time || resolved.scheduled,
        marked: takenEvt ? takenEvt.marked : resolved.marked,
        status: resolved.status,
        moves, // how many times this dose was snoozed/rescheduled before resolving
      })
      buf = []
    }
    for (const e of asc) {
      if (TERMINAL_STATUS.has(e.status)) flush(e)
      else buf.push(e)
    }
    if (buf.length) flush(null)
  }

  return doses.sort((a, b) => (b.ts || 0) - (a.ts || 0))
}

// Weekday keys must match the picker in the Add/Edit medication form (Sun..Sat).
export const DAY_KEYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// Is this medication due on the given calendar date?
// Honours the chosen start date and the selected repeat weekdays.
export function medActiveOn(m, date) {
  if (m.startDate) {
    const [y, mo, d] = String(m.startDate).split('-').map(Number)
    if (y && mo && d) {
      const start = new Date(y, mo - 1, d)
      const day = new Date(date.getFullYear(), date.getMonth(), date.getDate())
      if (day < start) return false // hasn't started yet
    }
  }
  if (Array.isArray(m.activeDays) && m.activeDays.length > 0 && m.activeDays.length < 7) {
    if (!m.activeDays.includes(DAY_KEYS[date.getDay()])) return false // not a repeat day
  }
  return true
}
