import { useQuery } from "@tanstack/react-query"
import { ClipboardList, FileCog, LogOut, Mail, Phone, ShieldCheck, ShoppingCart, UserRound } from "lucide-react"
import { Link, useNavigate } from "react-router-dom"
import { CustomerShell } from "@/components/customer/customer-shell"
import { PasswordCard } from "@/components/customer/password-card"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import { usePageMeta } from "@/hooks/use-page-meta"
import { customerClient } from "@/lib/customer-client"

const roleNames = { customer: "Khách hàng", staff: "Nhân viên", admin: "Quản trị viên" }

export function AccountPage() {
  usePageMeta("Tài khoản", "Quản lý tài khoản Cơ khí Đăng Khoa.")
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const summary = useQuery({ queryKey: ["customer", "summary"], queryFn: customerClient.summary, enabled: user?.role === "customer" })
  if (!user) return null
  const handleLogout = async () => { try { await logout() } finally { navigate("/", { replace: true }) } }

  if (user.role !== "customer") return <section className="section-space bg-stone-100"><div className="container-page max-w-4xl"><div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[.2em] text-orange-700">Tài khoản nội bộ</p><h1 className="mt-2 font-display text-4xl font-bold text-emerald-950">Xin chào, {user.name}</h1></div><div className="flex flex-wrap gap-2">{user.role === "admin" && <Button asChild><Link to="/admin">Vào khu vực quản trị</Link></Button>}<Button asChild variant={user.role === "admin" ? "outline" : "default"}><Link to="/staff">Khu vực làm việc</Link></Button><Button variant="outline" onClick={handleLogout}><LogOut className="size-5"/>Đăng xuất</Button></div></div><div className="grid gap-6 md:grid-cols-2"><ProfileCard/><PasswordCard/></div></div></section>

  const data = summary.data?.data
  const cards = [
    { label: "Đơn đang xử lý", value: data?.openOrders ?? 0, detail: `${data?.orders ?? 0} đơn tất cả`, icon: ClipboardList, to: "/tai-khoan/don-hang" },
    { label: "Yêu cầu đang mở", value: data?.openRequests ?? 0, detail: `${data?.requests ?? 0} yêu cầu tất cả`, icon: FileCog, to: "/tai-khoan/yeu-cau" },
    { label: "Sản phẩm trong giỏ", value: data?.cartItems ?? 0, detail: "Kiểm tra và đặt hàng", icon: ShoppingCart, to: "/gio-hang" },
  ]
  return <CustomerShell title={`Xin chào, ${user.name}`} description="Theo dõi đơn hàng, yêu cầu gia công và thông tin giao nhận tại một nơi."><div className="grid gap-5 md:grid-cols-3">{cards.map(({ label, value, detail, icon: Icon, to }) => <Link to={to} key={label} className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-orange-300 hover:shadow-xl"><span className="grid size-12 place-items-center rounded-2xl bg-emerald-950 text-white"><Icon className="size-6"/></span><strong className="mt-6 block font-display text-4xl text-orange-700">{summary.isLoading ? "–" : value}</strong><h2 className="mt-1 text-lg font-bold text-emerald-950">{label}</h2><p className="mt-2 text-sm text-slate-500">{detail}</p></Link>)}</div><div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_.8fr]"><ProfileCard/><article className="rounded-3xl bg-emerald-950 p-7 text-white"><h2 className="font-display text-2xl font-bold">Cần gia công theo bản vẽ?</h2><p className="mt-3 leading-7 text-emerald-50/70">Gửi PDF, DXF, DWG hoặc STEP. Kỹ thuật sẽ kiểm tra và phản hồi theo mã yêu cầu.</p><Button asChild className="mt-6"><Link to="/tai-khoan/yeu-cau">Tạo yêu cầu mới</Link></Button></article></div></CustomerShell>
}

function ProfileCard() {
  const { user } = useAuth()
  if (!user) return null
  return <article className="rounded-3xl border border-slate-200 bg-white p-7"><div className="flex items-start gap-4"><span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-orange-50 text-orange-700"><UserRound className="size-7"/></span><div><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black uppercase tracking-wider text-emerald-800">{roleNames[user.role]}</span><span className="flex items-center gap-1 text-xs font-bold text-emerald-700"><ShieldCheck className="size-4"/>Đang hoạt động</span></div><h2 className="mt-3 font-display text-2xl font-bold text-emerald-950">{user.name}</h2></div></div><div className="mt-6 space-y-3 text-sm text-slate-600"><p className="flex items-center gap-3"><Mail className="size-5 text-orange-600"/>{user.email}</p><p className="flex items-center gap-3"><Phone className="size-5 text-orange-600"/>{user.phone}</p></div>{user.role === "customer" && <Button asChild variant="outline" className="mt-6"><Link to="/tai-khoan/ho-so">Cập nhật hồ sơ & địa chỉ</Link></Button>}</article>
}
