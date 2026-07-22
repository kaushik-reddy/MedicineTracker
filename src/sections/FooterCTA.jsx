import { Heart } from '../icons.jsx'

// Minimal footer — copyright + made-with note, no background/CTA.
export function FooterBar({ className = '' }) {
  return (
    <footer className={'flex items-center justify-between px-1 text-[11px] text-ink-400 ' + className}>
      <span>© 2024 MediTrack. All rights reserved.</span>
      <span className="flex items-center gap-1">
        Made with <Heart className="h-3.5 w-3.5 text-coral-500" /> for your health
      </span>
    </footer>
  )
}
