// Clean seed data for MediTrack.

export const user = { name: 'Kaushik Reddy', initials: 'KR' }

// Household members.
export const users = [
  { id: 'kr', name: 'Kaushik', full: 'Kaushik Reddy', initials: 'K', tone: 'brand' },
  { id: 'me', name: 'Meera', full: 'Meera Reddy', initials: 'M', tone: 'accent' },
  { id: 'ar', name: 'Arjun', full: 'Arjun Reddy', initials: 'A', tone: 'sky' },
]

export const DEFAULT_MED_INFO = {
  category: 'Medication',
  purpose: 'General use — details not provided.',
  instructions: 'Take as directed on the label or by your doctor.',
  sideEffects: 'Refer to the package leaflet for possible side effects.',
  warnings: 'Consult your doctor or pharmacist if unsure.',
}

export const medications = [
  {
    id: 'd3',
    name: 'Vitamin D3',
    sub: 'Cholecalciferol',
    dosage: '1000 IU',
    unit: '1 tablet',
    frequency: 'Daily',
    time: '08:00 AM',
    label: '8 AM',
    period: 'am',
    tone: 'brand',
    user: 'kr',
    taken: true,
    scheduledToday: true,
    info: {
      category: 'Vitamin / Supplement',
      purpose: 'Supports bone strength, calcium absorption and immune function.',
      instructions: 'Take once daily with a meal containing fat for best absorption.',
      sideEffects: 'Uncommon: nausea, constipation, or a metallic taste.',
      warnings: 'Avoid combining with high-dose calcium unless advised by your doctor.',
    },
  },
  {
    id: 'om',
    name: 'Omega 3',
    sub: 'Fish Oil',
    dosage: '1000 mg',
    unit: '1 capsule',
    frequency: 'Daily',
    time: '01:45 PM',
    label: '1 PM',
    period: 'day',
    tone: 'accent',
    user: 'me',
    taken: false,
    scheduledToday: true,
    info: {
      category: 'Supplement',
      purpose: 'Supports heart, brain and joint health with EPA/DHA fatty acids.',
      instructions: 'Take with food to reduce fishy aftertaste and reflux.',
      sideEffects: 'Fishy burps, mild stomach upset or loose stools.',
      warnings: 'Consult your doctor if you take blood thinners such as warfarin.',
    },
  },
  {
    id: 'me1',
    name: 'Metformin',
    sub: 'Metformin HCl',
    dosage: '500 mg',
    unit: '1 tablet',
    frequency: 'Daily',
    time: '08:00 PM',
    label: '8 PM',
    period: 'pm',
    tone: 'coral',
    user: 'ar',
    taken: false,
    scheduledToday: true,
    info: {
      category: 'Antidiabetic (Biguanide)',
      purpose: 'Lowers blood glucose in type 2 diabetes by improving insulin response.',
      instructions: 'Take with meals to minimise stomach upset. Do not crush extended-release tablets.',
      sideEffects: 'Nausea, diarrhoea, stomach upset, metallic taste (usually settles).',
      warnings: 'Avoid excess alcohol. Tell your doctor before scans using contrast dye.',
    },
  },
]

export const inventory = [
  { id: 'inv-d3', name: 'Vitamin D3', detail: '1 tablet daily', days: 15, pct: 60, tone: 'brand', user: 'kr' },
  { id: 'inv-om', name: 'Omega 3', detail: '1 capsule daily', days: 8, pct: 32, tone: 'warn', user: 'me' },
  { id: 'inv-me', name: 'Metformin', detail: '1 tablet daily', days: 25, pct: 85, tone: 'coral', user: 'ar' },
]

// A small, realistic recent history (with audit fields).
const DAY_MS = 86400000
const now = new Date()
const fmtDay = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
const d1 = fmtDay(new Date(now.getTime() - DAY_MS))
const d2 = fmtDay(new Date(now.getTime() - 2 * DAY_MS))

export const history = [
  { ts: now.getTime() - DAY_MS + 72e5, day: d1, date: `${d1}, 08:00 PM`, scheduled: '08:00 PM', marked: '08:10 PM', name: 'Metformin', dose: '500 mg', status: 'Taken', tone: 'coral', user: 'ar' },
  { ts: now.getTime() - DAY_MS + 5e6, day: d1, date: `${d1}, 01:45 PM`, scheduled: '01:45 PM', marked: '01:52 PM', name: 'Omega 3', dose: '1000 mg', status: 'Taken', tone: 'accent', user: 'me' },
  { ts: now.getTime() - DAY_MS + 288e5, day: d1, date: `${d1}, 08:00 AM`, scheduled: '08:00 AM', marked: '08:05 AM', name: 'Vitamin D3', dose: '1000 IU', status: 'Taken', tone: 'brand', user: 'kr' },
  { ts: now.getTime() - 2 * DAY_MS + 72e5, day: d2, date: `${d2}, 08:00 PM`, scheduled: '08:00 PM', marked: '08:15 PM', name: 'Metformin', dose: '500 mg', status: 'Taken', tone: 'coral', user: 'ar' },
  { ts: now.getTime() - 2 * DAY_MS + 5e6, day: d2, date: `${d2}, 01:45 PM`, scheduled: '01:45 PM', marked: null, name: 'Omega 3', dose: '1000 mg', status: 'Missed', tone: 'warn', user: 'me' },
  { ts: now.getTime() - 2 * DAY_MS + 288e5, day: d2, date: `${d2}, 08:00 AM`, scheduled: '08:00 AM', marked: '08:02 AM', name: 'Vitamin D3', dose: '1000 IU', status: 'Taken', tone: 'brand', user: 'kr' },
]

export const streak = [
  { day: 'M', value: 60, tone: 'brand' },
  { day: 'T', value: 80, tone: 'brand' },
  { day: 'W', value: 55, tone: 'brand' },
  { day: 'T', value: 90, tone: 'brand' },
  { day: 'F', value: 70, tone: 'brand' },
  { day: 'S', value: 45, tone: 'accent' },
  { day: 'S', value: 85, tone: 'accent' },
]

export const quickActions = [
  { icon: 'bellplus', tone: 'warn', title: 'Set Reminder', body: 'Customize dose reminders', action: 'set-reminder' },
  { icon: 'users', tone: 'brand', title: 'Manage Members', body: 'Add or remove members', action: 'manage-users' },
  { icon: 'note', tone: 'accent', title: 'Log Symptom', body: 'Record how you feel', action: 'log-symptom' },
  { icon: 'download', tone: 'sky', title: 'Export Report', body: 'Download your report', action: 'export-report' },
]

export const tips = [
  { title: 'Stay hydrated!', body: 'Drinking enough water helps your medication work better.' },
  { title: 'Take with food', body: 'Some medications absorb better alongside a light meal.' },
  { title: 'Consistent timing', body: 'Taking doses at the same time builds a reliable habit.' },
]
