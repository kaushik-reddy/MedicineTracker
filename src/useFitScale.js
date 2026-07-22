import { useEffect, useState } from 'react'

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
