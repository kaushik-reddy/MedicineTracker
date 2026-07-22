import { useEffect, useState } from 'react'

// True when the viewport is phone-sized. Used to switch to a stacked mobile layout.
export function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth <= breakpoint : false,
  )

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint}px)`)
    const onChange = (e) => setIsMobile(e.matches)
    setIsMobile(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [breakpoint])

  return isMobile
}

// Scales a fixed design canvas so it always fills the viewport with no scroll.
export function useFitScale(designWidth, designHeight) {
  const [scale, setScale] = useState(1)

  useEffect(() => {
    function recompute() {
      const s = Math.min(window.innerWidth / designWidth, window.innerHeight / designHeight)
      setScale(s)
    }
    recompute()
    window.addEventListener('resize', recompute)
    return () => window.removeEventListener('resize', recompute)
  }, [designWidth, designHeight])

  return scale
}
