import { createContext, useContext, useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { medications as medsSeed, inventory as invSeed, history as histSeed, users as usersSeed } from './data.js'
import { timeAfterNow, istTimeLabel } from './time.js'
import { db, loadAll, hasSupabase } from './supabase.js'

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

export function AppProvider({ children }) {
  const [medications, setMedications] = useState(medsSeed)
  const [inventory, setInventory] = useState(invSeed)
  const [history, setHistory] = useState(histSeed)
  const [users, setUsers] = useState(usersSeed)
  const [modal, setModal] = useState(null)
  const [notice, setNotice] = useState(null)
  const [confirm, setConfirm] = useState(null)

  const usersById = useMemo(() => Object.fromEntries(users.map((u) => [u.id, u])), [users])
  const usersRef = useRef(usersById)
  usersRef.current = usersById
  const userName = (id) => (usersRef.current[id] ? usersRef.current[id].name : '')

  // Hydrate from Supabase on first load (no-op when persistence is not configured).
  const hydrated = useRef(false)
  useEffect(() => {
    if (!hasSupabase || hydrated.current) return
    hydrated.current = true
    loadAll().then((data) => {
      if (!data) return
      setUsers(data.users)
      setMedications(data.medications)
      setInventory(data.inventory)
      setHistory(data.history)
    })
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
        .filter((m) => m.scheduledToday)
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
    (id) => {
      let acted = null
      setMedications((meds) =>
        meds.map((m) => {
          if (m.id !== id || m.taken) return m
          acted = m
          return { ...m, taken: true, skipped: false }
        }),
      )
      if (acted) {
        db.updateMedication(acted.id, { taken: true, skipped: false })
        pushHistory({ ts: Date.now(), day: 'Today', date: `Today, ${acted.time}`, scheduled: acted.time, marked: istTimeLabel(), name: acted.name, dose: acted.dosage, status: 'Taken', tone: acted.tone, user: acted.user })
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
        let invUpdated = null
        setInventory((inv) =>
          inv.map((it) => {
            if (it.medicationId !== id) return it
            invUpdated = { ...it, days, pct: 100, detail: `${qty} ${qty === 1 ? 'unit' : 'units'} in stock` }
            return invUpdated
          }),
        )
        if (invUpdated) db.upsertInventory(invUpdated)
      }
      showToast(`${updated.name} updated`, 'brand')
    },
    [showToast],
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
    schedule,
    nextDose,
    glance,
    users,
    usersById,
    modal,
    notice,
    confirm,
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
    logDose,
    setReminder,
    exportReport,
  }

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>
}
