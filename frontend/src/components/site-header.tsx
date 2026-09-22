import { Menu, Phone, X } from "lucide-react"
import { useState } from "react"
import { Link, NavLink } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const links = [{ to: "/", label: "Trang chủ" }, { to: "/gioi-thieu", label: "About Us" }, { to: "/dich-vu", label: "Dịch vụ" }, { to: "/du-an", label: "Dự án" }, { to: "/san-pham", label: "Sản phẩm" }]
const logoUrl = import.meta.env.VITE_CLOUDINARY_LOGO_URL || "https://res.cloudinary.com/dgbounqav/image/upload/f_auto,q_auto/logo_dk_uhmnyn"

export function SiteHeader({ onQuote }: { onQuote: () => void }) {
  const [open, setOpen] = useState(false)
  return <header className="sticky top-0 z-40 border-b border-slate-200/90 bg-stone-50/95 shadow-sm shadow-slate-900/5 backdrop-blur-xl">
    <div className="container-page flex h-[84px] items-center justify-between gap-4">
      <Link to="/" className="flex shrink-0 items-center rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 shadow-sm transition duration-200 hover:border-red-200 hover:shadow-md" aria-label="Công ty Đăng Khoa - Trang chủ"><img className="h-12 w-auto max-w-[145px] rounded-lg object-contain" src={logoUrl} alt="Logo Công ty Đăng Khoa"/><span className="sr-only">Công ty Cổ phần Tư vấn Đầu tư Xây dựng Thương mại Đăng Khoa</span></Link>
      <nav className="hidden items-center gap-1 lg:flex" aria-label="Điều hướng chính">{links.map(link => <NavLink key={link.to} to={link.to} className={({ isActive }) => cn("rounded-lg px-4 py-3 text-[15px] font-bold text-slate-600 transition hover:bg-slate-100 hover:text-emerald-950", isActive && "bg-emerald-50 text-emerald-900")}>{link.label}</NavLink>)}</nav>
      <div className="hidden items-center gap-3 sm:flex"><a href="tel:0965243386" className="flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-bold text-emerald-950 hover:bg-slate-100"><Phone className="size-5 text-orange-600" />096 5243 386</a><Button onClick={onQuote}>Nhận báo giá</Button></div>
      <button className="grid size-12 place-items-center rounded-xl border border-slate-200 lg:hidden" onClick={() => setOpen(!open)} aria-expanded={open} aria-label="Mở menu">{open ? <X /> : <Menu />}</button>
    </div>
    {open && <nav className="border-t border-slate-200 bg-white p-4 lg:hidden" aria-label="Điều hướng di động">{links.map(link => <NavLink key={link.to} to={link.to} onClick={() => setOpen(false)} className="block rounded-xl px-4 py-4 text-base font-bold text-slate-800 hover:bg-slate-100">{link.label}</NavLink>)}<Button className="mt-3 w-full" onClick={() => { setOpen(false); onQuote() }}>Nhận tư vấn miễn phí</Button></nav>}
  </header>
}
