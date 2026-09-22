import { lazy, Suspense, useState } from "react"
import { Outlet, ScrollRestoration, useNavigate } from "react-router-dom"
import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"
import { useAuth } from "@/contexts/auth-context"

export interface LayoutContext { openQuote: (product?: string) => void }

const QuoteDialog = lazy(() => import("@/components/quote-dialog").then(module => ({ default: module.QuoteDialog })))

export function AppLayout() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [quoteOpen, setQuoteOpen] = useState(false)
  const [product, setProduct] = useState<string>()
  const openQuote = (value?: string) => {
    if (user?.role === "customer") { navigate(`/tai-khoan/yeu-cau${value ? `?product=${encodeURIComponent(value)}` : ""}`); return }
    setProduct(value); setQuoteOpen(true)
  }
  return <><a href="#main" className="skip-link">Chuyển đến nội dung chính</a><SiteHeader onQuote={() => openQuote()} /><main id="main"><Outlet context={{ openQuote } satisfies LayoutContext} /></main><SiteFooter />{quoteOpen && <Suspense fallback={null}><QuoteDialog key={product || "general"} open={quoteOpen} onOpenChange={setQuoteOpen} product={product} /></Suspense>}<ScrollRestoration /></>
}
