import { ArrowLeft } from "lucide-react"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
export function NotFoundPage(){return <section className="grid min-h-[65vh] place-items-center bg-stone-50 px-6 text-center"><div><span className="font-display text-8xl font-black text-orange-600">404</span><h1 className="mt-3 font-display text-3xl font-bold text-emerald-950">Không tìm thấy trang</h1><p className="mt-3 text-slate-600">Đường dẫn có thể đã thay đổi hoặc không còn tồn tại.</p><Button asChild className="mt-7"><Link to="/"><ArrowLeft className="size-4"/>Về trang chủ</Link></Button></div></section>}
