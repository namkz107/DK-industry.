import { lazy, Suspense, useState } from "react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { Outlet, ScrollRestoration, useLocation, useNavigate } from "react-router-dom"
import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"
import { GlobalLoading } from "@/components/global-loading"
import { useAuth } from "@/contexts/auth-context"

export interface LayoutContext { openQuote: (product?: string) => void }

const QuoteDialog = lazy(() => import("@/components/quote-dialog").then(module => ({ default: module.QuoteDialog })))
const SupportChatWidget = lazy(() => import("@/components/support-chat-widget").then(module => ({ default: module.SupportChatWidget })))

export function AppLayout() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const reduceMotion = useReducedMotion()
  const [quoteOpen, setQuoteOpen] = useState(false)
  const [product, setProduct] = useState<string>()
  const openQuote = (value?: string) => {
    if (user?.role === "customer") { navigate(`/tai-khoan/yeu-cau${value ? `?product=${encodeURIComponent(value)}` : ""}`); return }
    setProduct(value); setQuoteOpen(true)
  }
  return <><GlobalLoading /><a href="#main" className="skip-link">Chuyển đến nội dung chính</a><SiteHeader onQuote={() => openQuote()} /><main id="main"><AnimatePresence mode="wait" initial={false}><motion.div key={location.pathname} initial={reduceMotion ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }} transition={{ duration: reduceMotion ? 0 : .32, ease: [.2,.75,.2,1] }}><Outlet context={{ openQuote } satisfies LayoutContext} /></motion.div></AnimatePresence></main><SiteFooter />{quoteOpen && <Suspense fallback={null}><QuoteDialog key={product || "general"} open={quoteOpen} onOpenChange={setQuoteOpen} product={product} /></Suspense>}<Suspense fallback={null}><SupportChatWidget/></Suspense><ScrollRestoration /></>
}
