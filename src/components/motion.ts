import { useEffect, useRef, useState } from 'react'

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Animate a number toward `target`, starting from wherever it was last (or from `from` on first render).
 * Returns the target immediately when the viewer prefers reduced motion.
 */
export function useCountUp(target: number, { from = 0, ms = 900 } = {}): number {
  const [value, setValue] = useState(() => (prefersReducedMotion() ? target : from))
  const current = useRef(value)

  const reduced = prefersReducedMotion()

  useEffect(() => {
    if (reduced) {
      current.current = target
      return
    }
    const start = current.current
    const t0 = performance.now()
    let frame = 0
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / ms)
      const eased = 1 - (1 - p) ** 3
      current.current = start + (target - start) * eased
      setValue(current.current)
      if (p < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target, ms, reduced])

  return reduced ? target : value
}
