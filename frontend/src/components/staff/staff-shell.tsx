import { ClipboardList, LayoutDashboard, LogOut, PackageCheck, UsersRound } from "lucide-react"
import type { PropsWithChildren, ReactNode } from "react"
import { NavLink, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import { cn } from "@/lib/utils"

const navigation = [
  { to: "/staff", label: "Tổng quan", icon: LayoutDashboard, end: true },
  { to: "/staff/leads", label: "Khách tiềm năng", icon: UsersRound },
  { to: "/staff/requests", label: "Yêu cầu dịch vụ", icon: ClipboardList },
  { to: "/staff/orders", label: "Đơn hàng", icon: PackageCheck },
]

export function StaffShell({ title, description, action, children }: PropsWithChildren<{ title: string; description: string; action?: ReactNode }>) {
  const { user, logout } = useAuth(); const navigate = useNavigate()
  const signOut = async () => { await logout(); navigate("/", { replace: true }) }
  return <section className="min-h-[75vh] bg-slate-100 py-8 sm:py-10"><div className="container-page">
    <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end"><div><p className="text-xs font-black uppercase tracking-[.2em] text-orange-700">Khu vực nhân viên · {user?.name}</p><h1 className="mt-2 font-display text-3xl font-bold text-emerald-950 sm:text-4xl">{title}</h1><p className="mt-3 max-w-3xl text-lg leading-7 text-slate-600">{description}</p></div><div className="flex flex-wrap gap-2">{action}<Button variant="outline" onClick={signOut}><LogOut className="size-5"/>Đăng xuất</Button></div></div>
    <nav className="my-7 flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm" aria-label="Khu vực nhân viên">{navigation.map(({ to, label, icon: Icon, end }) => <NavLink key={to} end={end} to={to} className={({ isActive }) => cn("flex min-h-12 shrink-0 items-center gap-2 rounded-xl px-5 text-base font-bold text-slate-600 transition hover:bg-slate-100", isActive && "bg-emerald-950 text-white hover:bg-emerald-900")}><Icon className="size-5"/>{label}</NavLink>)}</nav>
    {children}
  </div></section>
}
