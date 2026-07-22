// Clean seed data for MediTrack.

export const user = { name: 'Kaushik Reddy', initials: 'KR' }

// Household members. Empty by default — users add their own.
export const users = []

export const DEFAULT_MED_INFO = {
  category: 'Medication',
  purpose: 'General use — details not provided.',
  instructions: 'Take as directed on the label or by your doctor.',
  sideEffects: 'Refer to the package leaflet for possible side effects.',
  warnings: 'Consult your doctor or pharmacist if unsure.',
}

// Medications, inventory, history and streak all start empty.
// Users create their own data through the app.
export const medications = []

export const inventory = []

export const history = []

export const streak = []

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
