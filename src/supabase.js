// Supabase client + data-access layer for MediTrack.
//
// Persistence is optional. If VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not
// set, `supabase` is null and every helper here is a no-op — the app keeps working
// with in-memory state exactly as before.
//
// The database schema (see supabase/schema.sql) protects every row with Row Level
// Security keyed on auth.uid(), so we sign the visitor in anonymously on first load.
// Enable "Anonymous sign-ins" in your Supabase dashboard: Authentication → Providers.

import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = url && anonKey ? createClient(url, anonKey) : null
export const hasSupabase = !!supabase

if (!hasSupabase && typeof console !== 'undefined') {
  console.warn(
    '[supabase] Persistence is OFF — VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not set. ' +
      'Data lives in memory only and is lost on refresh. Add them to .env (local) and Vercel (prod).',
  )
}

// Ensure there is a signed-in session so RLS policies allow reads/writes.
export async function ensureSession() {
  if (!supabase) return null
  const { data: { session } } = await supabase.auth.getSession()
  if (session) return session
  const { data, error } = await supabase.auth.signInAnonymously()
  if (error) {
    console.warn('[supabase] anonymous sign-in failed:', error.message)
    return null
  }
  return data.session
}

// ---- Row <-> app-shape mapping -------------------------------------------

const memberToRow = (u) => ({
  id: u.id,
  name: u.name,
  full_name: u.full ?? u.name,
  initials: u.initials,
  tone: u.tone ?? 'brand',
  image: u.image ?? null,
})
const rowToMember = (r) => ({
  id: r.id,
  name: r.name,
  full: r.full_name ?? r.name,
  initials: r.initials,
  tone: r.tone ?? 'brand',
  image: r.image ?? null,
})

const medToRow = (m) => ({
  id: m.id,
  member_id: m.user ?? null,
  name: m.name,
  sub: m.sub ?? null,
  dosage: m.dosage ?? null,
  unit: m.unit ?? null,
  frequency: m.frequency ?? 'Daily',
  time: m.time ?? null,
  label: m.label ?? null,
  period: m.period ?? null,
  tone: m.tone ?? 'brand',
  image: m.image ?? null,
  taken: !!m.taken,
  skipped: !!m.skipped,
  scheduled_today: m.scheduledToday !== false,
  info: m.info ?? {},
})
const rowToMed = (r) => ({
  id: r.id,
  user: r.member_id,
  name: r.name,
  sub: r.sub,
  dosage: r.dosage,
  unit: r.unit,
  frequency: r.frequency,
  time: r.time,
  label: r.label,
  period: r.period,
  tone: r.tone ?? 'brand',
  image: r.image,
  taken: !!r.taken,
  skipped: !!r.skipped,
  scheduledToday: r.scheduled_today !== false,
  info: r.info ?? undefined,
})

const invToRow = (it) => ({
  id: it.id,
  member_id: it.user ?? null,
  medication_id: it.medicationId ?? null,
  name: it.name,
  detail: it.detail ?? null,
  days: it.days ?? 30,
  pct: it.pct ?? 100,
  tone: it.tone ?? 'brand',
})
const rowToInv = (r) => ({
  id: r.id,
  user: r.member_id,
  medicationId: r.medication_id ?? undefined,
  name: r.name,
  detail: r.detail,
  days: r.days,
  pct: r.pct,
  tone: r.tone ?? 'brand',
})

const logToRow = (e) => ({
  id: e.id,
  member_id: e.user ?? null,
  medication_id: e.medicationId ?? null,
  name: e.name,
  dose: e.dose ?? null,
  scheduled_time: e.scheduled ?? null,
  marked_time: e.marked ?? null,
  status: e.status ?? 'Taken',
})
const rowToLog = (r) => ({
  id: r.id,
  ts: r.logged_at ? Date.parse(r.logged_at) : Date.now(),
  user: r.member_id,
  name: r.name,
  dose: r.dose,
  scheduled: r.scheduled_time,
  marked: r.marked_time,
  status: r.status,
  date: r.scheduled_time ? `Today, ${r.scheduled_time}` : 'Today',
  day: 'Today',
  tone: r.status === 'Skipped' ? 'warn' : 'brand',
})

// ---- Reads ----------------------------------------------------------------

// Load everything the app needs in one shot. Returns null if persistence is off.
export async function loadAll() {
  if (!supabase) return null
  await ensureSession()
  const [members, meds, inv, logs] = await Promise.all([
    supabase.from('members').select('*').order('created_at', { ascending: true }),
    supabase.from('medications').select('*').order('created_at', { ascending: true }),
    supabase.from('inventory').select('*').order('created_at', { ascending: true }),
    supabase.from('dose_logs').select('*').order('logged_at', { ascending: false }).limit(600),
  ])
  const firstError = members.error || meds.error || inv.error || logs.error
  if (firstError) {
    console.warn('[supabase] load failed:', firstError.message)
    return null
  }
  return {
    users: (members.data ?? []).map(rowToMember),
    medications: (meds.data ?? []).map(rowToMed),
    inventory: (inv.data ?? []).map(rowToInv),
    history: (logs.data ?? []).map(rowToLog),
  }
}

// ---- Writes (fire-and-forget; log errors, never throw) --------------------

function report(label, error) {
  if (error) console.warn(`[supabase] ${label} failed:`, error.message)
}

export const db = {
  async upsertMember(u) {
    if (!supabase) return
    const { error } = await supabase.from('members').upsert(memberToRow(u))
    report('upsert member', error)
  },
  async deleteMember(id) {
    if (!supabase) return
    // medications / inventory / dose_logs cascade on delete in the schema.
    const { error } = await supabase.from('members').delete().eq('id', id)
    report('delete member', error)
  },
  async upsertMedication(m) {
    if (!supabase) return
    const { error } = await supabase.from('medications').upsert(medToRow(m))
    report('upsert medication', error)
  },
  async updateMedication(id, patch) {
    if (!supabase) return
    const { error } = await supabase.from('medications').update(patch).eq('id', id)
    report('update medication', error)
  },
  async upsertInventory(it) {
    if (!supabase) return
    const { error } = await supabase.from('inventory').upsert(invToRow(it))
    report('upsert inventory', error)
  },
  async upsertInventoryMany(items) {
    if (!supabase || !items.length) return
    const { error } = await supabase.from('inventory').upsert(items.map(invToRow))
    report('upsert inventory (many)', error)
  },
  async insertDoseLog(entry) {
    if (!supabase) return
    const { error } = await supabase.from('dose_logs').insert(logToRow(entry))
    report('insert dose log', error)
  },
}
