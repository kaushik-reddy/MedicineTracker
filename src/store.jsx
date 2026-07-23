import { createContext, useContext, useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { medications as medsSeed, inventory as invSeed, history as histSeed, users as usersSeed } from './data.js'
import { timeAfterNow, istTimeLabel, istCalendarDate, addDays, medActiveOn, sameDay } from './time.js'
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

export function AppProvider({ children }) {
  const [medications, setMedications] = useState(medsSeed)
  const [inventory, setInventory] = useState(invSeed)
  const [history, setHistory] = useState(histSeed)
  const [users, setUsers] = useState(usersSeed)
  const [symptoms, setSymptoms] = useState([])
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
        setUsers(data.users)
        setMedications(next)
        setInventory(inv.next)
        setHistory(data.history)
        setSymptoms(data.symptoms ?? [])
        changed.forEach((m) => db.updateMedication(m.id, { taken: false, skipped: false }))
        inv.changed.forEach((it) => db.upsertInventory(it))
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

  const [restockName, setRestockName] = useState(null)
  const openRestock = useCallback((name) => {
    setRestockName(name)
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
  const schedule = useMemo(
    () =>
      medications
        .filter((m) => m.scheduledToday && medActiveOn(m, istCalendarDate()))
        .slice()
        .sort((a, b) => parseMins(a.time) - parseMins(b.time)),
    [medications],
  )

  // Same list, but for tomorrow's calendar day (repeat days may differ).
  const scheduleTomorrow = useMemo(
    () =>
      medications
        .filter((m) => m.scheduledToday && medActiveOn(m, addDays(istCalendarDate(), 1)))
        .slice()
        .sort((a, b) => parseMins(a.time) - parseMins(b.time)),
    [medications],
  )

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
        db.updateMedication(acted.id, { taken: true, skipped: false })
        pushHistory({ ts: Date.now(), day: 'Today', date: `Today, ${acted.time}`, scheduled: acted.time, marked, name: acted.name, dose: acted.dosage, status: 'Taken', tone: acted.tone, user: acted.user })
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
        db.updateMedication(acted.id, { skipped: true, taken: false })
        pushHistory({ ts: Date.now(), day: 'Today', date: `Today, ${acted.time}`, scheduled: acted.time, marked: null, name: acted.name, dose: acted.dosage, status: 'Skipped', tone: 'warn', user: acted.user })
        showToast(`${userName(acted.user)} skipped ${acted.name}`, 'warn')
      }
    },
    [pushHistory, showToast],
  )

  const rescheduleDose = useCallback(
    (id, time) => {
      let acted = null
      setMedications((meds) =>
        meds.map((m) => {
          if (m.id !== id) return m
          acted = m
          return { ...m, time, label: hourLabel(time) }
        }),
      )
      if (acted) {
        db.updateMedication(acted.id, { time, label: hourLabel(time) })
        showToast(`${acted.name} rescheduled to ${time}`, 'accent')
      }
    },
    [showToast],
  )

  // Add (or update) a medication on the schedule with chosen time/frequency.
  const scheduleMed = useCallback(
    (id, { time, frequency }) => {
      let acted = null
      setMedications((meds) =>
        meds.map((m) => {
          if (m.id !== id) return m
          acted = m
          return {
            ...m,
            time: time || m.time,
            label: hourLabel(time || m.time),
            frequency: frequency || m.frequency,
            scheduledToday: true,
            taken: false,
            skipped: false,
          }
        }),
      )
      if (acted) {
        db.updateMedication(acted.id, {
          time: time || acted.time,
          label: hourLabel(time || acted.time),
          frequency: frequency || acted.frequency,
          scheduled_today: true,
          taken: false,
          skipped: false,
        })
        showToast(`${acted.name} added to schedule`, 'brand')
      }
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
      let acted = null
      setMedications((meds) =>
        meds.map((m) => {
          if (m.id !== id) return m
          acted = m
          return { ...m, time, label: hourLabel(time), taken: false, skipped: false }
        }),
      )
      if (acted) {
        db.updateMedication(acted.id, { time, label: hourLabel(time), taken: false, skipped: false })
        showToast(`${acted.name} snoozed ${mins} min · now ${time}`, 'warn')
      }
    },
    [showToast],
  )

  // Snooze to an exact precomputed time (used after a confirmation dialog).
  const snoozeDoseTo = useCallback(
    (id, time, mins) => {
      let acted = null
      setMedications((meds) =>
        meds.map((m) => {
          if (m.id !== id) return m
          acted = m
          return { ...m, time, label: hourLabel(time), taken: false, skipped: false }
        }),
      )
      if (acted) {
        db.updateMedication(acted.id, { time, label: hourLabel(time), taken: false, skipped: false })
        showToast(`${acted.name} snoozed ${mins} min · now ${time}`, 'warn')
      }
    },
    [showToast],
  )

  const restock = useCallback(
    (name, days = 30) => {
      const changed = []
      setInventory((inv) =>
        inv.map((it) => {
          if (it.name !== name) return it
          const next = { ...it, days: it.days + days, pct: 100, tone: 'brand' }
          changed.push(next)
          return next
        }),
      )
      db.upsertInventoryMany(changed)
      showToast(`${name} restocked · +${days} units`, 'brand')
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
      const record = { ...med, id, user: uid, label: hourLabel(med.time), taken: false, scheduledToday: true }
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
      let updated = null
      setMedications((meds) =>
        meds.map((m) => {
          if (m.id !== id) return m
          updated = { ...m, ...rest, label: hourLabel(rest.time ?? m.time) }
          return updated
        }),
      )
      if (!updated) return
      db.upsertMedication(updated)

      const qty = Number(quantity)
      if (quantity !== '' && quantity != null && Number.isFinite(qty) && qty >= 0) {
        const perDay = updated.frequency === 'Twice daily' ? 2 : updated.frequency === 'Weekly' ? 1 / 7 : 1
        const days = perDay > 0 ? Math.max(0, Math.round(qty / perDay)) : qty
        const detail = `${qty} ${qty === 1 ? 'unit' : 'units'} in stock`
        let invUpdated = null
        setInventory((inv) => {
          let found = false
          // Match by explicit link first; fall back to name+member for older rows
          // that were created before medications and inventory were linked.
          const next = inv.map((it) => {
            const linked = it.medicationId && it.medicationId === id
            const byName = !it.medicationId && it.name === updated.name && it.user === updated.user
            if (!linked && !byName) return it
            found = true
            invUpdated = { ...it, medicationId: id, name: updated.name, user: updated.user, days, pct: 100, detail }
            return invUpdated
          })
          if (found) return next
          // No stock row yet — create one linked to this medication.
          invUpdated = {
            id: newId(),
            medicationId: id,
            name: updated.name,
            detail,
            days,
            pct: 100,
            tone: updated.tone,
            user: updated.user,
          }
          return [...next, invUpdated]
        })
        if (invUpdated) db.upsertInventory(invUpdated)
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
      const copy = { ...src, id: copyId, name: `${src.name} (copy)`, taken: false, skipped: false }
      setMedications((list) => [...list, copy])

      const srcInv = inventory.find((it) => it.medicationId === id)
      let invCopy = null
      if (srcInv) {
        invCopy = { ...srcInv, id: newId(), medicationId: copyId }
        setInventory((list) => [...list, invCopy])
      }
      db.upsertMedication(copy).then(() => {
        if (invCopy) db.upsertInventory(invCopy)
      })

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
      const entry = { id: newId(), ts: Date.now(), name: clean, severity: severity || 'Mild', mood: mood || '', user: user || null }
      setSymptoms((list) => [entry, ...list].slice(0, 200))
      db.insertSymptom(entry)
      const tone = severity === 'Severe' ? 'coral' : severity === 'Moderate' ? 'warn' : 'brand'
      showToast(`Logged · ${clean}${mood ? ` ${mood}` : ''}`, tone)
    },
    [showToast],
  )

  // Most recent symptom entry (for the hero banner).
  const latestSymptom = useMemo(() => symptoms[0] || null, [symptoms])

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
    restockName,
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
