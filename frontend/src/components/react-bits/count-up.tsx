import { useEffect, useRef, useState } from "react"
import { useInView, useReducedMotion } from "motion/react"

export function CountUp({ to, suffix = "" }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const visible = useInView(ref, { once: true })
  const reduceMotion = useReducedMotion()
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (!visible) return
    if (reduceMotion) { setValue(to); return }
    const started = performance.now()
    let frame = 0
    const tick = (now: number) => {
      const progress = Math.min((now - started) / 1100, 1)
      setValue(Math.round(to * (1 - Math.pow(1 - progress, 3))))
      if (progress < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [visible, reduceMotion, to])
  return <span ref={ref}>{value}{suffix}</span>
}
