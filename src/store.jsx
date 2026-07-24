import { createContext, useContext, useState, useCallback, useMemo, useRef, useEffect } from 'react'
import {
  medications as medsSeed,
  inventory as invSeed,
  history as histSeed,
  users as usersSeed,
  symptoms as symptomsSeed,
  water as waterSeed,
  waterGoal as waterGoalSeed,
  steps as stepsSeed,
  stepsGoal as stepsGoalSeed,
  sleep as sleepSeed,
  sleepGoal as sleepGoalSeed,
} from './data.js'
import { timeAfterNow, istTimeLabel, istCalendarDate, addDays, medActiveOn, sameDay, dosesPerDay, remainingUnits, effectiveTime, isoDate } from './time.js'
import {
  db,
  loadAll,
  hasSupabase,
  getSession,
  onAuthChange,
  signIn as signInApi,
  signUp as signUpApi,
  signOut as signOutApi,
} from './supabase.js'

// Stable id generator (valid UUID so it matches the Supabase uuid columns).
const newId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`

// Local YYYY-MM-DD key for today (matches how the water seed keys its rows).
const todayWaterKey = (d = new Date()) => {
  const p = (x) => String(x).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

const AppCtx = createContext(null)
export const useApp = () => useContext(AppCtx)

let toastSeq = 0

function parseMins(t) {
  const m = String(t).match(/(\d+):(\d+)\s*(AM|PM)/i)
  if (!m) return 0
  let h = Number(m[1]) % 12
  if (/pm/i.test(m[3])) h += 12
  return h * 60 + Number(m[2])
}

function hourLabel(t) {
  const m = String(t).match(/(\d+):\d+\s*(AM|PM)/i)
  return m ? `${Number(m[1])} ${m[2].toUpperCase()}` : ''
}

// Was there a dose action (taken/skipped) logged for this medication *today* (IST)?
function actedToday(med, history) {
  const today = istCalendarDate()
  return history.some(
    (h) => h.name === med.name && h.user === med.user && h.ts && sameDay(istCalendarDate(h.ts), today),
  )
}

// Clear taken/skipped flags that belong to a previous day. A medication keeps its
// "taken today" state only if there is a matching dose log dated today; otherwise it
// rolls over to upcoming. This self-corrects across IST midnight without any baseline.
function reconcileMedsForToday(meds, history) {
  const changed = []
  const next = meds.map((m) => {
    if (!m.taken && !m.skipped) return m
    if (actedToday(m, history)) return m
    const nm = { ...m, taken: false, skipped: false }
    changed.push(nm)
    return nm
  })
  return { next, changed }
}

// Ensure each inventory row is owned by the same member as its medication. Older
// stock rows can carry a stale member_id; the medication is the source of truth.
function reconcileInventoryOwners(inventory, medications) {
  const byId = Object.fromEntries(medications.map((m) => [m.id, m]))
  const changed = []
  const next = inventory.map((it) => {
    let med = it.medicationId ? byId[it.medicationId] : null
    if (!med) {
      const matches = medications.filter((m) => m.name === it.name)
      if (matches.length === 1) med = matches[0] // unambiguous name link
    }
    if (!med) return it
    if (it.user === med.user && it.medicationId === med.id) return it
    const nm = { ...it, user: med.user, medicationId: med.id }
    changed.push(nm)
    return nm
  })
  return { next, changed }
}

// One-time backfill: give medications created before unit-based stock tracking a
// persistent baseline derived from their existing inventory snapshot, so their
// stock starts depleting as doses are taken from now on. Runs only for meds that
// don't already have a baseline (stockUnits), so it never re-anchors afterwards.
function backfillStockBaseline(medications, inventory) {
  const invByMed = {}
  for (const it of inventory) if (it.medicationId) invByMed[it.medicationId] = it
  const changed = []
  const next = medications.map((m) => {
    if (m.stockUnits != null) return m
    const it = invByMed[m.id] || inventory.find((x) => x.name === m.name && x.user === m.user)
    if (!it) return m
    const perDay = dosesPerDay(m.frequency)
    const units = perDay > 0 ? Math.max(0, Math.round((it.days ?? 0) * perDay)) : it.days ?? 0
    // Anchor at 0 so the existing snapshot is treated as the entered amount and ALL
    // doses already taken from history are subtracted from it (matching the user's
    // mental model: units available − doses already taken).
    const nm = { ...m, stockUnits: units, stockAnchor: 0 }
    changed.push(nm)
    return nm
  })
  return { next, changed }
}

// Build a fresh per-day time-override map: keep only today/future entries (drop
// stale past days) and set the moved time for `date`. Storing overrides per date
// keeps a rescheduled/snoozed dose local to that day instead of shifting the series.
function withTimeOverride(med, date, time) {
  const key = isoDate(date)
  const next = {}
  const cur = med.timeOverrides || {}
  for (const k of Object.keys(cur)) if (k >= key) next[k] = cur[k]
  next[key] = time
  return next
}

export function AppProvider({ children }) {
  const [medications, setMedications] = useState(medsSeed)
  const [inventory, setInventory] = useState(invSeed)
  const [history, setHistory] = useState(histSeed)
  const [users, setUsers] = useState(usersSeed)
  const [symptoms, setSymptoms] = useState(symptomsSeed)
  const [water, setWater] = useState(waterSeed)
  const [waterGoal, setWaterGoal] = useState(waterGoalSeed)
  const [steps, setSteps] = useState(stepsSeed)
  const [stepsGoal, setStepsGoal] = useState(stepsGoalSeed)
  const [sleep, setSleep] = useState(sleepSeed)
  const [sleepGoal, setSleepGoal] = useState(sleepGoalSeed)
  const [modal, setModal] = useState(null)
  const [notice, setNotice] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const [session, setSession] = useState(null)
  const [authLoading, setAuthLoading] = useState(hasSupabase)
  const [dataLoading, setDataLoading] = useState(hasSupabase)

  const usersById = useMemo(() => Object.fromEntries(users.map((u) => [u.id, u])), [users])
  const usersRef = useRef(usersById)
  usersRef.current = usersById
  const userName = (id) => (usersRef.current[id] ? usersRef.current[id].name : '')

  // Mirror the latest medications / inventory so callbacks can read current state
  // synchronously. React only runs the *first* setState updater eagerly in an event
  // handler, so a value captured inside a *second* updater (e.g. setInventory) is not
  // available right after the call — reading from these refs avoids that pitfall.
  const medicationsRef = useRef(medications)
  medicationsRef.current = medications
  const inventoryRef = useRef(inventory)
  inventoryRef.current = inventory
  const waterRef = useRef(water)
  waterRef.current = water
  const stepsRef = useRef(steps)
  stepsRef.current = steps
  const sleepRef = useRef(sleep)
  sleepRef.current = sleep

  // Track the auth session (real email/password login). Data is per-account and
  // roams across devices. When persistence is off, there is no auth to track.
  useEffect(() => {
    if (!hasSupabase) return
    let active = true
    getSession().then((s) => {
      if (!active) return
      setSession(s)
      setAuthLoading(false)
    })
    const unsub = onAuthChange((s) => setSession(s))
    return () => {
      active = false
      unsub()
    }
  }, [])

  // Load this account's data whenever the signed-in user changes; clear on sign-out.
  const uid = session?.user?.id
  useEffect(() => {
    if (!hasSupabase) return
    if (!uid) {
      setUsers([])
      setMedications([])
      setInventory([])
      setHistory([])
      setSymptoms([])
      setWater([])
      setSteps([])
      setSleep([])
      setDataLoading(false)
      return
    }
    setDataLoading(true)
    loadAll().then((data) => {
      if (data) {
        // Roll over any stale taken/skipped flags from previous days on load.
        const { next, changed } = reconcileMedsForToday(data.medications, data.history)
        // Repair inventory rows whose member drifted from their medication.
        const inv = reconcileInventoryOwners(data.inventory, next)
        // Give pre-existing meds a stock baseline so inventory becomes functional.
        const stock = backfillStockBaseline(next, inv.next)
        setUsers(data.users)
        setMedications(stock.next)
        setInventory(inv.next)
        setHistory(data.history)
        setSymptoms(data.symptoms ?? [])
        setWater(data.water ?? [])
        setSteps(data.steps ?? [])
        setSleep(data.sleep ?? [])
        changed.forEach((m) => db.updateMedication(m.id, { taken: false, skipped: false }))
        inv.changed.forEach((it) => db.upsertInventory(it))
        stock.changed.forEach((m) => db.upsertMedication(m))
      }
      setDataLoading(false)
    })
  }, [uid])

  // Keep today's schedule fresh as IST midnight passes while the app stays open.
  const historyRef = useRef(history)
  historyRef.current = history
  useEffect(() => {
    const tick = () => {
      setMedications((meds) => {
        const { next, changed } = reconcileMedsForToday(meds, historyRef.current)
        if (!changed.length) return meds
        changed.forEach((m) => db.updateMedication(m.id, { taken: false, skipped: false }))
        return next
      })
    }
    const t = setInterval(tick, 60000)
    return () => clearInterval(t)
  }, [])

  // A "notice" is a transient event surfaced by the header bell (expand/collapse).
  const showToast = useCallback((message, tone = 'brand') => {
    setNotice({ id: ++toastSeq, message, tone })
  }, [])

  // Surface Supabase write failures so silent data loss becomes visible.
  useEffect(() => {
    const onError = (e) => {
      const label = e.detail?.label || 'save'
      showToast(`Couldn't save (${label}) — data may not persist`, 'warn')
    }
    window.addEventListener('supabase:error', onError)
    return () => window.removeEventListener('supabase:error', onError)
  }, [showToast])

  // ---- Auth actions ----
  const login = useCallback(
    async (email, password) => {
      const { error } = await signInApi(email, password)
      if (error) {
        showToast(error.message, 'warn')
        return false
      }
      return true
    },
    [showToast],
  )

  const register = useCallback(
    async (email, password) => {
      const { data, error } = await signUpApi(email, password)
      if (error) {
        showToast(error.message, 'warn')
        return false
      }
      // When email confirmation is enabled, there is no session yet.
      if (!data.session) showToast('Check your email to confirm your account', 'sky')
      return true
    },
    [showToast],
  )

  const logout = useCallback(async () => {
    await signOutApi()
  }, [])

  const openModal = useCallback((type) => setModal(type), [])
  const closeModal = useCallback(() => setModal(null), [])

  // Open a confirmation dialog for a dose action (taken/snooze/skip/move).
  const requestConfirm = useCallback((payload) => {
    setConfirm(payload)
    setModal('confirm-dose')
  }, [])

  // Open the "add to schedule" form for a specific medication.
  const openScheduleMed = useCallback((id) => {
    setConfirm({ medId: id })
    setModal('add-to-schedule')
  }, [])

  // Open the medication details popup.
  const openMedDetails = useCallback((id) => {
    setConfirm({ medId: id })
    setModal('med-details')
  }, [])

  // Open the edit form for a specific medication.
  const openEditMed = useCallback((id) => {
    setConfirm({ medId: id })
    setModal('edit-medication')
  }, [])

  const [restockId, setRestockId] = useState(null)
  const openRestock = useCallback((id) => {
    setRestockId(id)
    setModal('restock')
  }, [])

  let userSeq = users.length
  const addUser = useCallback(
    ({ name, tone }) => {
      const clean = (name || '').trim()
      if (!clean) return
      const id = newId()
      const u = { id, name: clean, full: `${clean}`, initials: clean[0].toUpperCase(), tone: tone || 'brand' }
      setUsers((list) => [...list, u])
      db.upsertMember(u)
      showToast(`${clean} added as a member`, 'brand')
    },
    [showToast],
  )

  const removeUser = useCallback(
    (id) => {
      const u = usersRef.current[id]
      setMedications((meds) => meds.filter((m) => m.user !== id))
      setInventory((inv) => inv.filter((it) => it.user !== id))
      setHistory((h) => h.filter((e) => e.user !== id))
      setUsers((list) => list.filter((x) => x.id !== id))
      db.deleteMember(id)
      if (u) showToast(`${u.name} and all their data removed`, 'warn')
    },
    [showToast],
  )

  const setUserImage = useCallback((id, image) => {
    let next = null
    setUsers((list) =>
      list.map((u) => {
        if (u.id !== id) return u
        next = { ...u, image }
        return next
      }),
    )
    if (next) db.upsertMember(next)
  }, [])

  // ---- Derived state: everything below stays in sync with `medications` ----
  // Apply the per-day time override for `date` so a dose moved on one day shows at
  // its moved time that day only; other days keep the recurring base time.
  const withDayTime = (m, date) => {
    const t = effectiveTime(m, date)
    return t === m.time ? m : { ...m, time: t, label: hourLabel(t) }
  }

  const schedule = useMemo(() => {
    const today = istCalendarDate()
    return medications
      .filter((m) => m.scheduledToday && medActiveOn(m, today))
      .map((m) => withDayTime(m, today))
      .sort((a, b) => parseMins(a.time) - parseMins(b.time))
  }, [medications])

  // Same list, but for tomorrow's calendar day (repeat days may differ).
  const scheduleTomorrow = useMemo(() => {
    const tomorrow = addDays(istCalendarDate(), 1)
    return medications
      .filter((m) => m.scheduledToday && medActiveOn(m, tomorrow))
      .map((m) => withDayTime(m, tomorrow))
      .sort((a, b) => parseMins(a.time) - parseMins(b.time))
  }, [medications])

  const nextDose = useMemo(() => {
    const m = schedule.find((x) => !x.taken && !x.skipped)
    if (!m) return null
    return {
      id: m.id,
      time: m.time,
      name: m.name,
      detail: `${m.dosage} • ${m.unit}`,
      user: m.user,
    }
  }, [schedule])

  const glance = useMemo(() => {
    const total = schedule.length
    const takenCount = schedule.filter((m) => m.taken).length
    const adherence = total ? Math.round((takenCount / total) * 100) : 0
    return {
      total,
      takenCount,
      adherence,
      items: [
        { label: 'Doses', value: `${takenCount} / ${total}`, tone: 'brand', icon: 'clock' },
        { label: 'Taken', value: `${takenCount}`, tone: 'sky', icon: 'check' },
        { label: 'Adherence', value: `${adherence}%`, tone: 'accent', icon: 'trend' },
      ],
    }
  }, [schedule])

  // ---- Actions ----
  const pushHistory = useCallback((entry) => {
    const withId = { id: entry.id || newId(), ...entry }
    setHistory((h) => [withId, ...h].slice(0, 600))
    db.insertDoseLog(withId)
  }, [])

  const markTaken = useCallback(
    (id, markedTime) => {
      let acted = null
      setMedications((meds) =>
        meds.map((m) => {
          if (m.id !== id || m.taken) return m
          acted = m
          return { ...m, taken: true, skipped: false }
        }),
      )
      if (acted) {
        // Use the caller-supplied time if they took it earlier and are logging it
        // late; otherwise stamp the current time.
        const marked = (markedTime || '').trim() || istTimeLabel()
        const due = effectiveTime(acted, istCalendarDate())
        db.updateMedication(acted.id, { taken: true, skipped: false })
        pushHistory({ ts: Date.now(), day: 'Today', date: `Today, ${due}`, scheduled: due, marked, name: acted.name, dose: acted.dosage, status: 'Taken', tone: acted.tone, user: acted.user })
        showToast(`${userName(acted.user)} took ${acted.name}`, 'brand')
      }
    },
    [pushHistory, showToast],
  )

  const resetDose = useCallback(
    (id) => {
      let acted = null
      setMedications((meds) =>
        meds.map((m) => {
          if (m.id !== id || (!m.taken && !m.skipped)) return m
          acted = m
          return { ...m, taken: false, skipped: false }
        }),
      )
      if (acted) {
        db.updateMedication(acted.id, { taken: false, skipped: false })
        // Remove today's dose log for this med so stock (derived from Taken logs)
        // and adherence recompute correctly when a dose is reverted to upcoming.
        const today = istCalendarDate()
        const victim = historyRef.current.find(
          (h) =>
            h.name === acted.name &&
            h.user === acted.user &&
            h.ts &&
            sameDay(istCalendarDate(h.ts), today) &&
            (h.status === 'Taken' || h.status === 'Skipped'),
        )
        if (victim) {
          setHistory((h) => h.filter((e) => e.id !== victim.id))
          db.deleteDoseLog(victim.id)
        }
        showToast(`${acted.name} reverted to upcoming`, 'accent')
      }
    },
    [showToast],
  )

  const skipDose = useCallback(
    (id) => {
      let acted = null
      setMedications((meds) =>
        meds.map((m) => {
          if (m.id !== id || m.skipped) return m
          acted = m
          return { ...m, skipped: true, taken: false }
        }),
      )
      if (acted) {
        const due = effectiveTime(acted, istCalendarDate())
        db.updateMedication(acted.id, { skipped: true, taken: false })
        pushHistory({ ts: Date.now(), day: 'Today', date: `Today, ${due}`, scheduled: due, marked: null, name: acted.name, dose: acted.dosage, status: 'Skipped', tone: 'warn', user: acted.user })
        showToast(`${userName(acted.user)} skipped ${acted.name}`, 'warn')
      }
    },
    [pushHistory, showToast],
  )

  const rescheduleDose = useCallback(
    (id, time) => {
      const today = istCalendarDate()
      let acted = null
      let from = null
      let overrides = null
      setMedications((meds) =>
        meds.map((m) => {
          if (m.id !== id) return m
          acted = m
          from = effectiveTime(m, today) // where it sat before this move (that day)
          overrides = withTimeOverride(m, today, time)
          // Only this day's occurrence moves; the recurring base time is untouched.
          return { ...m, timeOverrides: overrides }
        }),
      )
      if (acted) {
        db.upsertMedication({ ...acted, timeOverrides: overrides })
        pushHistory({ ts: Date.now(), day: 'Today', date: `Today, ${time}`, scheduled: from, marked: time, name: acted.name, dose: acted.dosage, status: 'Rescheduled', tone: 'accent', user: acted.user })
        showToast(`${acted.name} rescheduled to ${time}`, 'accent')
      }
    },
    [pushHistory, showToast],
  )

  // Add (or update) a medication on the schedule with chosen time/frequency.
  const scheduleMed = useCallback(
    (id, { time, frequency }) => {
      const current = medicationsRef.current.find((m) => m.id === id)
      if (!current) return
      const newTime = time || current.time
      const updated = {
        ...current,
        time: newTime,
        label: hourLabel(newTime),
        frequency: frequency || current.frequency,
        scheduledToday: true,
        taken: false,
        skipped: false,
        timeOverrides: undefined, // a new recurring time applies to every day
      }
      setMedications((meds) => meds.map((m) => (m.id === id ? updated : m)))
      db.upsertMedication(updated)
      showToast(`${current.name} added to schedule`, 'brand')
    },
    [showToast],
  )

  const removeFromSchedule = useCallback(
    (id) => {
      let acted = null
      setMedications((meds) =>
        meds.map((m) => {
          if (m.id !== id) return m
          acted = m
          return { ...m, scheduledToday: false }
        }),
      )
      if (acted) {
        db.updateMedication(acted.id, { scheduled_today: false })
        showToast(`${acted.name} removed from schedule`, 'warn')
      }
    },
    [showToast],
  )

  const snoozeDose = useCallback(
    (id, mins = 15) => {
      const time = timeAfterNow(mins)
      const today = istCalendarDate()
      let acted = null
      let from = null
      let overrides = null
      setMedications((meds) =>
        meds.map((m) => {
          if (m.id !== id) return m
          acted = m
          from = effectiveTime(m, today)
          overrides = withTimeOverride(m, today, time)
          return { ...m, timeOverrides: overrides, taken: false, skipped: false }
        }),
      )
      if (acted) {
        db.upsertMedication({ ...acted, timeOverrides: overrides, taken: false, skipped: false })
        pushHistory({ ts: Date.now(), day: 'Today', date: `Today, ${time}`, scheduled: from, marked: time, name: acted.name, dose: acted.dosage, status: 'Snoozed', tone: 'warn', user: acted.user })
        showToast(`${acted.name} snoozed ${mins} min · now ${time}`, 'warn')
      }
    },
    [pushHistory, showToast],
  )

  // Snooze to an exact precomputed time (used after a confirmation dialog).
  const snoozeDoseTo = useCallback(
    (id, time, mins) => {
      const today = istCalendarDate()
      let acted = null
      let from = null
      let overrides = null
      setMedications((meds) =>
        meds.map((m) => {
          if (m.id !== id) return m
          acted = m
          from = effectiveTime(m, today)
          overrides = withTimeOverride(m, today, time)
          return { ...m, timeOverrides: overrides, taken: false, skipped: false }
        }),
      )
      if (acted) {
        db.upsertMedication({ ...acted, timeOverrides: overrides, taken: false, skipped: false })
        pushHistory({ ts: Date.now(), day: 'Today', date: `Today, ${time}`, scheduled: from, marked: time, name: acted.name, dose: acted.dosage, status: 'Snoozed', tone: 'warn', user: acted.user })
        showToast(`${acted.name} snoozed ${mins} min · now ${time}`, 'warn')
      }
    },
    [pushHistory, showToast],
  )

  const restock = useCallback(
    (invId, units = 30) => {
      const item = inventoryRef.current.find((it) => it.id === invId)
      if (!item) return
      const add = Math.max(0, Math.round(Number(units) || 0))
      const med =
        medicationsRef.current.find((m) => m.id === item.medicationId) ||
        medicationsRef.current.find((m) => m.name === item.name && m.user === item.user)
      if (med) {
        // Grow the persistent unit baseline by the added units and re-anchor so past
        // doses don't count against the new stock. Remaining is derived from here.
        const rem = remainingUnits(med, historyRef.current)
        const nextUnits = (rem == null ? 0 : rem) + add
        const updatedMed = { ...med, stockUnits: nextUnits, stockAnchor: Date.now() }
        setMedications((meds) => meds.map((m) => (m.id === med.id ? updatedMed : m)))
        db.upsertMedication(updatedMed)
        // Keep the inventory snapshot in step (used as a fallback for legacy rows).
        const perDay = dosesPerDay(updatedMed.frequency)
        const days = perDay > 0 ? Math.max(0, Math.round(nextUnits / perDay)) : nextUnits
        const detail = `${nextUnits} ${nextUnits === 1 ? 'unit' : 'units'} in stock`
        const nm = { ...item, days, pct: 100, detail }
        setInventory((inv) => inv.map((it) => (it.id === invId ? nm : it)))
        db.upsertInventory(nm)
        showToast(`${med.name} restocked · +${add} units`, 'brand')
      } else {
        // Legacy inventory row with no linked medication — bump the stored snapshot.
        const nm = { ...item, days: item.days + add, pct: 100 }
        setInventory((inv) => inv.map((it) => (it.id === invId ? nm : it)))
        db.upsertInventory(nm)
        showToast(`${item.name} restocked · +${add} units`, 'brand')
      }
    },
    [showToast],
  )

  const addMedication = useCallback(
    (med) => {
      const id = newId()
      const uid = med.user || null
      // Turn the user's real stock count into days-of-supply for the inventory ring.
      const qty = Math.max(0, Math.round(Number(med.quantity) || 0))
      const perDay = med.frequency === 'Twice daily' ? 2 : med.frequency === 'Weekly' ? 1 / 7 : 1
      const days = perDay > 0 ? Math.max(0, Math.round(qty / perDay)) : qty
      // Persist the entered units as the stock baseline; remaining is derived from
      // this minus the doses taken from history (so it survives refreshes).
      const record = {
        ...med,
        id,
        user: uid,
        label: hourLabel(med.time),
        taken: false,
        scheduledToday: true,
        stockUnits: qty,
        stockAnchor: Date.now(),
      }
      delete record.quantity
      const invItem = {
        id: newId(),
        medicationId: id,
        name: med.name,
        detail: `${qty} ${qty === 1 ? 'unit' : 'units'} in stock`,
        days,
        pct: 100,
        tone: med.tone,
        user: uid,
      }
      setMedications((m) => [...m, record])
      setInventory((inv) => [...inv, invItem])
      // Insert the medication first, then its inventory — the inventory row has a
      // foreign key to medications(id), so it must exist before the linked insert.
      db.upsertMedication(record).then(() => db.upsertInventory(invItem))
      showToast(`${med.name} added for ${userName(uid)}`, 'accent')
    },
    [showToast],
  )

  // Edit an existing medication. `fields.quantity` is optional: blank/undefined
  // leaves the inventory untouched; a number updates the linked stock item.
  const editMedication = useCallback(
    (id, fields) => {
      const { quantity, ...rest } = fields
      // Read current medication from a ref (not inside a setState updater) so the
      // persisted object is available synchronously for the db write below.
      const current = medicationsRef.current.find((m) => m.id === id)
      if (!current) return
      const updated = { ...current, ...rest, label: hourLabel(rest.time ?? current.time) }
      // Blank quantity leaves the stock baseline untouched; a number re-sets it and
      // re-anchors so previously-taken doses don't count against the new baseline.
      const qty = Number(quantity)
      const setsStock = quantity !== '' && quantity != null && Number.isFinite(qty) && qty >= 0
      if (setsStock) {
        updated.stockUnits = qty
        updated.stockAnchor = Date.now()
      }
      setMedications((meds) => meds.map((m) => (m.id === id ? updated : m)))
      db.upsertMedication(updated)

      if (setsStock) {
        const perDay = dosesPerDay(updated.frequency)
        const days = perDay > 0 ? Math.max(0, Math.round(qty / perDay)) : qty
        const detail = `${qty} ${qty === 1 ? 'unit' : 'units'} in stock`
        // Match strictly by the medication link so a duplicate (different med id)
        // can never be updated when its sibling is edited.
        const existing = inventoryRef.current.find((it) => it.medicationId === id)
        const invUpdated = existing
          ? { ...existing, name: updated.name, user: updated.user, days, pct: 100, detail }
          : {
              // No linked stock row yet — create one for this medication only.
              id: newId(),
              medicationId: id,
              name: updated.name,
              detail,
              days,
              pct: 100,
              tone: updated.tone,
              user: updated.user,
            }
        setInventory((inv) =>
          existing ? inv.map((it) => (it.medicationId === id ? invUpdated : it)) : [...inv, invUpdated],
        )
        db.upsertInventory(invUpdated)
      }
      showToast(`${updated.name} updated`, 'brand')
    },
    [showToast],
  )

  // Clone a medication (and its stock) for another member, then open it for edits.
  const duplicateMedication = useCallback(
    (id) => {
      const src = medications.find((m) => m.id === id)
      if (!src) return
      const copyId = newId()
      const copyName = `${src.name} (copy)`
      const copy = { ...src, id: copyId, name: copyName, taken: false, skipped: false }
      setMedications((list) => [...list, copy])

      // Always give the copy its OWN inventory row (own id + link + name) so edits
      // to either medication never affect the other.
      const srcInv = inventory.find((it) => it.medicationId === id)
      const invCopy = {
        id: newId(),
        medicationId: copyId,
        name: copyName,
        detail: srcInv?.detail ?? '',
        days: srcInv?.days ?? 30,
        pct: srcInv?.pct ?? 100,
        tone: copy.tone,
        user: copy.user,
      }
      setInventory((list) => [...list, invCopy])
      db.upsertMedication(copy).then(() => db.upsertInventory(invCopy))

      setConfirm({ medId: copyId })
      setModal('edit-medication')
      showToast(`Duplicated ${src.name}`, 'accent')
    },
    [medications, inventory, showToast],
  )

  const setMedImage = useCallback((id, image) => {
    let next = null
    setMedications((meds) =>
      meds.map((m) => {
        if (m.id !== id) return m
        next = { ...m, image }
        return next
      }),
    )
    if (next) db.updateMedication(id, { image })
  }, [])

  const logDose = useCallback(
    ({ name, time }) => {
      const med = medications.find((m) => m.name === name && m.scheduledToday && !m.taken)
      if (med) {
        markTaken(med.id)
      } else {
        pushHistory({ date: `Today, ${time}`, name, dose: 'Logged', status: 'Taken', tone: 'brand' })
        showToast(`Dose logged · ${name}`, 'brand')
      }
    },
    [medications, markTaken, pushHistory, showToast],
  )

  const setReminder = useCallback(
    ({ name, time, channel }) => showToast(`Reminder set · ${name} at ${time} (${channel})`, 'warn'),
    [showToast],
  )

  // Record how the user is feeling. Persists and shows up in Recent History.
  const logSymptom = useCallback(
    ({ name, severity, mood, user }) => {
      const clean = (name || '').trim() || 'Symptom'
      const entry = { id: newId(), ts: Date.now(), name: clean, severity: severity || null, mood: mood || '', user: user || null }
      setSymptoms((list) => [entry, ...list].slice(0, 200))
      db.insertSymptom(entry)
      const tone = severity === 'Severe' ? 'coral' : severity === 'Moderate' ? 'warn' : 'brand'
      showToast(`Logged · ${clean}`, tone)
    },
    [showToast],
  )

  // Most recent symptom entry (for the hero banner).
  const latestSymptom = useMemo(() => symptoms[0] || null, [symptoms])

  // ---- Water tracker (local only) ----
  // Today's total intake in ml, derived from the daily water log.
  const waterToday = useMemo(() => {
    const key = todayWaterKey()
    return water.find((r) => r.date === key)?.ml || 0
  }, [water])

  // ---- Daily health trackers (Water / Steps / Sleep) ----
  // Values are keyed per day; adds write through to Supabase (no-op when off).
  // Reading the latest rows from a ref keeps the persisted total correct even
  // though React defers the setState update.
  const bumpTracker = (kind, field, ref, setter) => (amount) => {
    const key = todayWaterKey()
    const rows = ref.current
    const idx = rows.findIndex((r) => r.date === key)
    const cur = idx === -1 ? 0 : rows[idx][field]
    const value = Math.max(0, cur + Math.round(Number(amount) || 0))
    setter(idx === -1 ? [...rows, { date: key, [field]: value }] : rows.map((r, i) => (i === idx ? { ...r, [field]: value } : r)))
    db.upsertTracker({ kind, date: key, value })
  }

  const addWater = useCallback(bumpTracker('water', 'ml', waterRef, setWater), [])
  const changeWaterGoal = useCallback((ml) => setWaterGoal(Math.max(0, Math.round(Number(ml) || 0))), [])

  const stepsToday = useMemo(() => {
    const key = todayWaterKey()
    return steps.find((r) => r.date === key)?.steps || 0
  }, [steps])
  const addSteps = useCallback(bumpTracker('steps', 'steps', stepsRef, setSteps), [])
  const changeStepsGoal = useCallback((n) => setStepsGoal(Math.max(0, Math.round(Number(n) || 0))), [])

  const sleepToday = useMemo(() => {
    const key = todayWaterKey()
    return sleep.find((r) => r.date === key)?.mins || 0
  }, [sleep])
  const addSleep = useCallback(bumpTracker('sleep', 'mins', sleepRef, setSleep), [])
  const changeSleepGoal = useCallback((mins) => setSleepGoal(Math.max(0, Math.round(Number(mins) || 0))), [])

  const exportReport = useCallback(
    (format) => {
      let blob
      if (format === 'JSON') {
        blob = new Blob([JSON.stringify({ medications, inventory, history }, null, 2)], { type: 'application/json' })
      } else {
        const rows = [
          ['Medication', 'Dosage', 'Unit', 'Frequency', 'Time', 'Status'],
          ...medications.map((m) => [m.name, m.dosage, m.unit, m.frequency, m.time, m.taken ? 'Taken' : 'Upcoming']),
        ]
        blob = new Blob([rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n')], { type: 'text/csv' })
      }
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `meditrack-report.${format.toLowerCase()}`
      a.click()
      URL.revokeObjectURL(url)
      showToast(`Report exported · ${format}`, 'sky')
    },
    [medications, inventory, history, showToast],
  )

  const value = {
    medications,
    inventory,
    history,
    symptoms,
    latestSymptom,
    water,
    waterGoal,
    waterToday,
    addWater,
    changeWaterGoal,
    steps,
    stepsGoal,
    stepsToday,
    addSteps,
    changeStepsGoal,
    sleep,
    sleepGoal,
    sleepToday,
    addSleep,
    changeSleepGoal,
    schedule,
    scheduleTomorrow,
    nextDose,
    glance,
    users,
    usersById,
    modal,
    notice,
    confirm,
    session,
    authLoading,
    dataLoading,
    authEnabled: hasSupabase,
    login,
    register,
    logout,
    openModal,
    closeModal,
    requestConfirm,
    openScheduleMed,
    openMedDetails,
    openEditMed,
    openRestock,
    restockId,
    addUser,
    removeUser,
    setUserImage,
    showToast,
    markTaken,
    resetDose,
    skipDose,
    rescheduleDose,
    snoozeDose,
    snoozeDoseTo,
    scheduleMed,
    removeFromSchedule,
    setMedImage,
    restock,
    addMedication,
    editMedication,
    duplicateMedication,
    logDose,
    setReminder,
    logSymptom,
    exportReport,
  }

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>
}
