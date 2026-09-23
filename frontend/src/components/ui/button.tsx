import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 text-[15px] font-bold transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-200 disabled:pointer-events-none disabled:opacity-50 active:scale-[.98]",
  { variants: { variant: {
    default: "bg-orange-600 text-white shadow-lg shadow-orange-950/15 hover:bg-orange-700",
    dark: "bg-emerald-950 text-white hover:bg-emerald-900",
    outline: "border border-slate-300 bg-white text-slate-900 hover:border-orange-500 hover:text-orange-700",
    ghost: "text-slate-700 hover:bg-slate-100",
    destructive: "bg-red-600 text-white shadow-lg shadow-red-950/15 hover:bg-red-700",
  }, size: { default: "h-12", sm: "min-h-11 px-4 text-sm", lg: "min-h-14 px-7 text-base", icon: "size-12 p-0" } }, defaultVariants: { variant: "default", size: "default" } }
)

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> { asChild?: boolean }
export function Button({ className, variant, size, asChild, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button"
  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />
}
