import { motion, useReducedMotion } from "motion/react"
import type { PropsWithChildren } from "react"

export function FadeContent({ children, delay = 0, className = "" }: PropsWithChildren<{ delay?: number; className?: string }>) {
  const reduceMotion = useReducedMotion()
  return <motion.div className={className} initial={reduceMotion ? false : { opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-70px" }} transition={{ duration: .6, delay, ease: [.2,.7,.2,1] }}>{children}</motion.div>
}
