import { motion, useReducedMotion } from "motion/react"

export function BlurText({ text, className = "" }: { text: string; className?: string }) {
  const reduceMotion = useReducedMotion()
  return <span className={className} aria-label={text}>{text.split(" ").map((word, index) => <motion.span aria-hidden="true" className="mr-[.22em] inline-block" key={`${word}-${index}`} initial={reduceMotion ? false : { filter: "blur(9px)", opacity: 0, y: 12 }} animate={{ filter: "blur(0px)", opacity: 1, y: 0 }} transition={{ duration: .45, delay: index * .055 }}>{word}</motion.span>)}</span>
}
