// Lightweight inline SVG icon set (stroke-based, currentColor).
// Keeps the bundle dependency-free while matching the mockup's line-icon style.

const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

export function Logo({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none">
      <rect x="2" y="2" width="28" height="28" rx="9" fill="#16a970" />
      <path d="M16 9v14M9 16h14" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

export function Bell({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" {...base}>
      <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </svg>
  )
}

export function ChevronDown({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" {...base}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

export function ChevronRight({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" {...base}>
      <path d="m9 6 6 6-6 6" />
    </svg>
  )
}

export function Check({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" {...base}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}

export function CheckCircle({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" {...base}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12 2.4 2.4L15.5 9.5" />
    </svg>
  )
}

export function Clock({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" {...base}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  )
}

export function Pill({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" {...base}>
      <rect x="3" y="8" width="18" height="8" rx="4" transform="rotate(-45 12 12)" />
      <path d="M8.5 8.5 15.5 15.5" />
    </svg>
  )
}

export function Sun({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" {...base}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  )
}

export function Moon({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" {...base}>
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
    </svg>
  )
}

export function Heart({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" {...base}>
      <path d="M20.8 5.6a5.5 5.5 0 0 0-7.8 0L12 6.6l-1-1a5.5 5.5 0 1 0-7.8 7.8l1 1 7.8 7.8 7.8-7.8 1-1a5.5 5.5 0 0 0 0-7.8Z" />
    </svg>
  )
}

export function Calendar({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" {...base}>
      <rect x="3" y="4" width="18" height="17" rx="3" />
      <path d="M3 9h18M8 2v4M16 2v4" />
    </svg>
  )
}

export function TrendingUp({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" {...base}>
      <path d="m3 17 6-6 4 4 8-8" />
      <path d="M17 7h4v4" />
    </svg>
  )
}

export function Plus({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" {...base}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

export function Dots({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <circle cx="5" cy="12" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="19" cy="12" r="1.6" />
    </svg>
  )
}

export function Flame({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="#f97316" stroke="none">
      <path d="M12 2s5 4.5 5 9a5 5 0 0 1-10 0c0-1.5.5-2.7 1.2-3.6C8.9 8.6 9 10 10 10.5 10.8 8 12 6.5 12 2Z" />
    </svg>
  )
}

export function Cart({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" {...base}>
      <circle cx="9" cy="20" r="1.4" />
      <circle cx="18" cy="20" r="1.4" />
      <path d="M2 3h3l2.4 12.4a2 2 0 0 0 2 1.6h8.2a2 2 0 0 0 2-1.6L22 7H6" />
    </svg>
  )
}

export function Download({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" {...base}>
      <path d="M12 3v12m0 0 4-4m-4 4-4-4" />
      <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
    </svg>
  )
}

export function LogPlus({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" {...base}>
      <rect x="4" y="3" width="16" height="18" rx="3" />
      <path d="M12 8v6M9 11h6" />
    </svg>
  )
}

export function BellPlus({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" {...base}>
      <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </svg>
  )
}

export function Droplet({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" {...base}>
      <path d="M12 3s6 6.4 6 10.4A6 6 0 1 1 6 13.4C6 9.4 12 3 12 3Z" />
    </svg>
  )
}

export function Close({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" {...base}>
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  )
}

export function RefreshCw({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" {...base}>
      <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
      <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
      <path d="M21 3v5h-5M3 21v-5h5" />
    </svg>
  )
}

export function ChevronLeft({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" {...base}>
      <path d="m15 18-6-6 6-6" />
    </svg>
  )
}

export function RotateCcw({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" {...base}>
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  )
}

export function SkipForward({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" {...base}>
      <path d="M5 4v16l10-8z" />
      <path d="M19 5v14" />
    </svg>
  )
}

export function CalendarDays({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" {...base}>
      <rect x="3" y="4" width="18" height="17" rx="3" />
      <path d="M3 9h18M8 2v4M16 2v4M8 13h.01M12 13h.01M16 13h.01M8 17h.01M12 17h.01" />
    </svg>
  )
}

export function Trash({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" {...base}>
      <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M6 6l1 14a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-14" />
    </svg>
  )
}

export function Upload({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" {...base}>
      <path d="M12 15V3m0 0 4 4m-4-4L8 7" />
      <path d="M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" />
    </svg>
  )
}

export function Note({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" {...base}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  )
}

export function Users({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" {...base}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

// Mood keys used across the app, in order from best to worst.
export const MOODS = ['great', 'good', 'okay', 'low', 'bad']
export const MOOD_LABEL = { great: 'Great', good: 'Good', okay: 'Okay', low: 'Low', bad: 'Bad' }
// Back-compat: map legacy stored emojis to mood keys.
const EMOJI_TO_MOOD = { '😀': 'great', '🙂': 'good', '😐': 'okay', '🙁': 'low', '😣': 'bad' }
export const moodKey = (m) => (MOODS.includes(m) ? m : EMOJI_TO_MOOD[m] || 'okay')

// Icon-based mood face (replaces mood emojis). `mood` is a key or legacy emoji.
export function MoodFace({ mood, className = '' }) {
  const idx = MOODS.indexOf(moodKey(mood))
  const mouths = [
    'M8 13.5 Q12 18.5 16 13.5', // great
    'M8 14 Q12 16.5 16 14', // good
    'M8.5 15 H15.5', // okay
    'M8 15.5 Q12 13.8 16 15.5', // low
    'M8.5 16 Q12 12.8 15.5 16', // bad
  ]
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="9" cy="10" r="1" fill="currentColor" />
      <circle cx="15" cy="10" r="1" fill="currentColor" />
      <path d={mouths[idx >= 0 ? idx : 2]} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
