import { ClipboardList, LayoutDashboard, MapPinned, ShoppingCart } from "lucide-react"
import type { PropsWithChildren, ReactNode } from "react"
import { NavLink } from "react-router-dom"
import { cn } from "@/lib/utils"

const navigation = [
  { to: "/tai-khoan", label: "Tổng quan", icon: LayoutDashboard, end: true },
  { to: "/tai-khoan/ho-so", label: "Hồ sơ & địa chỉ", icon: MapPinned },
  { to: "/gio-hang", label: "Giỏ hàng", icon: ShoppingCart },
  { to: "/tai-khoan/don-hang", label: "Đơn hàng", icon: ClipboardList },
  { to: "/tai-khoan/yeu-cau", label: "Yêu cầu gia công", icon: ClipboardList },
]

export function CustomerShell({ title, description, action, children }: PropsWithChildren<{ title: string; description: string; action?: ReactNode }>) {
  return <section className="min-h-[70vh] bg-stone-100 py-8 sm:py-12"><div className="container-page">
    <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end"><div><p className="text-xs font-black uppercase tracking-[.2em] text-orange-700">Trung tâm khách hàng</p><h1 className="mt-2 font-display text-3xl font-bold text-emerald-950 sm:text-4xl">{title}</h1><p className="mt-3 max-w-2xl leading-7 text-slate-600">{description}</p></div>{action}</div>
    <nav className="my-7 flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm" aria-label="Khu vực khách hàng">{navigation.map(({ to, label, icon: Icon, end }) => <NavLink key={to} end={end} to={to} className={({ isActive }) => cn("flex min-h-12 shrink-0 items-center gap-2 rounded-xl px-4 text-sm font-bold text-slate-600 transition hover:bg-slate-100", isActive && "bg-emerald-950 text-white hover:bg-emerald-900")}><Icon className="size-5"/>{label}</NavLink>)}</nav>
    {children}
  </div></section>
}
