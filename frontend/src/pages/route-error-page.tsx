import { AlertTriangle } from "lucide-react"
import { isRouteErrorResponse, Link, useRouteError } from "react-router-dom"
import { Button } from "@/components/ui/button"

export function RouteErrorPage() {
  const error = useRouteError()
  const message = isRouteErrorResponse(error) ? error.statusText : error instanceof Error ? error.message : "Đã xảy ra lỗi không mong muốn."
  return <main className="grid min-h-screen place-items-center bg-stone-50 p-6"><section className="w-full max-w-xl rounded-3xl border bg-white p-8 text-center shadow-xl"><AlertTriangle className="mx-auto size-12 text-orange-600"/><h1 className="mt-5 font-display text-3xl font-bold text-emerald-950">Không thể mở trang này</h1><p className="mt-3 text-slate-600">{message}</p><div className="mt-7 flex flex-wrap justify-center gap-3"><Button type="button" onClick={() => window.location.reload()}>Thử lại</Button><Button asChild variant="outline"><Link to="/">Về trang chủ</Link></Button></div></section></main>
}
