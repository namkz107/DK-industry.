import { lazy, Suspense, useState } from "react"
import { Outlet, ScrollRestoration } from "react-router-dom"
import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"

export interface LayoutContext { openQuote: (product?: string) => void }

const QuoteDialog = lazy(() => import("@/components/quote-dialog").then(module => ({ default: module.QuoteDialog })))

export function AppLayout() {
  const [quoteOpen, setQuoteOpen] = useState(false)
  const [product, setProduct] = useState<string>()
  const openQuote = (value?: string) => { setProduct(value); setQuoteOpen(true) }
  return <><a href="#main" className="skip-link">Chuyển đến nội dung chính</a><SiteHeader onQuote={() => openQuote()} /><main id="main"><Outlet context={{ openQuote } satisfies LayoutContext} /></main><SiteFooter />{quoteOpen && <Suspense fallback={null}><QuoteDialog key={product || "general"} open={quoteOpen} onOpenChange={setQuoteOpen} product={product} /></Suspense>}<ScrollRestoration /></>
}
