import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Pill } from './icons.jsx'

// Tone → tailwind class maps used across cards/badges.
export const toneSoft = {
  brand: 'bg-brand-50 text-brand-600',
  accent: 'bg-violet-50 text-accent-600',
  sky: 'bg-sky-50 text-sky-600',
  warn: 'bg-amber-50 text-warn-500',
  coral: 'bg-rose-50 text-coral-500',
}

export const toneBar = {
  brand: 'bg-brand-500',
  accent: 'bg-accent-500',
  sky: 'bg-sky-500',
  warn: 'bg-warn-500',
  coral: 'bg-coral-500',
}

export const toneText = {
  brand: 'text-brand-600',
  accent: 'text-accent-600',
  sky: 'text-sky-600',
  warn: 'text-warn-500',
  coral: 'text-coral-500',
}

export function Card({ className = '', children }) {
  return (
    <div
      className={
        'rounded-3xl bg-white border border-line/70 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_12px_28px_-18px_rgba(16,24,40,0.18)] ' +
        className
      }
    >
      {children}
    </div>
  )
}

export function SectionTitle({ children, className = '' }) {
  return <h2 className={'text-[17px] font-bold text-ink-900 ' + className}>{children}</h2>
}

// Shown inside a card's content area when there is nothing to display.
export function EmptyState({ icon: Icon, title = 'Nothing here yet', hint, className = '' }) {
  return (
    <div className={'flex flex-1 flex-col items-center justify-center gap-2 px-4 py-6 text-center ' + className}>
      {Icon && (
        <span className="grid h-10 w-10 place-items-center rounded-2xl bg-page text-ink-400">
          <Icon className="h-5 w-5" />
        </span>
      )}
      <div className="text-[13px] font-bold text-ink-500">{title}</div>
      {hint && <div className="max-w-[240px] text-[11px] leading-snug text-ink-400">{hint}</div>}
    </div>
  )
}

// Shown while a card's data is still loading from the backend.
export function LoadingState({ label = 'Loading…', className = '' }) {
  return (
    <div className={'flex flex-1 flex-col items-center justify-center gap-2.5 px-4 py-6 text-center ' + className}>
      <span className="h-6 w-6 animate-spin rounded-full border-2 border-line border-t-brand-500" />
      <div className="text-[11px] font-semibold text-ink-400">{label}</div>
    </div>
  )
}

export function Dropdown({ options, value, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function onDoc(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-[13px] font-semibold text-ink-500 hover:bg-page transition-colors"
      >
        {value}
        <ChevronDown className="h-3.5 w-3.5" />
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-1.5 min-w-[9rem] overflow-hidden rounded-2xl border border-line bg-white p-1 shadow-lg">
          {options.map((opt) => (
            <button
              key={opt}
              onClick={() => {
                onChange(opt)
                setOpen(false)
              }}
              className={
                'block w-full rounded-xl px-3 py-2 text-left text-[13px] font-medium transition-colors ' +
                (opt === value ? 'bg-brand-50 text-brand-600' : 'text-ink-700 hover:bg-page')
              }
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// Empty image slot placeholder (used as fallback until assets are cropped).
export function ImageSlot({ className = '', label = 'Image' }) {
  return (
    <div
      className={
        'flex items-center justify-center rounded-2xl border border-dashed border-brand-200 bg-brand-50/40 text-brand-400 ' +
        className
      }
    >
      <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
    </div>
  )
}

// Renders a real illustration, falling back to the placeholder if the file
// isn't present yet (before the crop script has run).
export function Illustration({ src, label = 'Image', className = '', imgClassName = 'object-contain' }) {
  const [failed, setFailed] = useState(false)
  if (failed) return <ImageSlot className={className} label={label} />
  return (
    <img
      src={src}
      alt={label}
      onError={() => setFailed(true)}
      className={'block h-full w-full ' + imgClassName + ' ' + className}
    />
  )
}

// Small pill glyph keyed by tone; falls back to an emoji if the crop is missing.
const pillByTone = {
  brand: '/assets/pill-green.png',
  accent: '/assets/pill-purple.png',
  coral: '/assets/pill-white.png',
  warn: '/assets/pill-white.png',
  sky: '/assets/pill-white.png',
}

export function PillGlyph({ tone = 'brand', className = '' }) {
  const [failed, setFailed] = useState(false)
  if (failed)
    return (
      <span className={className + ' grid place-items-center text-ink-400'}>
        <Pill className="h-3/4 w-3/4" />
      </span>
    )
  return (
    <img
      src={pillByTone[tone] || pillByTone.brand}
      alt=""
      onError={() => setFailed(true)}
      className={'object-contain ' + className}
    />
  )
}

// Renders a medication's custom uploaded image if present, else the default pill glyph.
export function MedGlyph({ med, className = '' }) {
  if (med && med.image) {
    return <img src={med.image} alt="" className={'rounded-md object-cover ' + className} />
  }
  return <PillGlyph tone={med ? med.tone : 'brand'} className={className} />
}

// Per-user colour tokens for avatars / name text.
export const userTone = {
  brand: { avatar: 'bg-brand-500', text: 'text-brand-600', soft: 'bg-brand-50 text-brand-600' },
  accent: { avatar: 'bg-accent-500', text: 'text-accent-600', soft: 'bg-violet-50 text-accent-600' },
  sky: { avatar: 'bg-sky-500', text: 'text-sky-600', soft: 'bg-sky-50 text-sky-600' },
  coral: { avatar: 'bg-coral-500', text: 'text-coral-500', soft: 'bg-rose-50 text-coral-500' },
  warn: { avatar: 'bg-warn-500', text: 'text-warn-500', soft: 'bg-amber-50 text-warn-500' },
}

export function UserAvatar({ user, className = 'h-5 w-5 text-[9px]' }) {
  if (!user) return null
  const t = userTone[user.tone] || userTone.brand
  if (user.image) {
    return <img src={user.image} alt="" className={'shrink-0 rounded-full object-cover ' + className} />
  }
  return (
    <span className={'grid shrink-0 place-items-center rounded-full font-bold text-white ' + t.avatar + ' ' + className}>
      {user.initials}
    </span>
  )
}

// Small avatar + first name chip.
export function UserChip({ user, className = '' }) {
  if (!user) return null
  const t = userTone[user.tone] || userTone.brand
  return (
    <span className={'inline-flex items-center gap-1 rounded-full py-0.5 pl-0.5 pr-2 ' + t.soft + ' ' + className}>
      <UserAvatar user={user} className="h-4 w-4 text-[8px]" />
      <span className="text-[10px] font-bold">{user.name}</span>
    </span>
  )
}
