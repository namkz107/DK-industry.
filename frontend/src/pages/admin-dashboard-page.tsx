import { useQuery } from "@tanstack/react-query"
import { AlertTriangle, Boxes, CircleDollarSign, ClipboardList, PackageCheck, UserCog, UsersRound, Wrench } from "lucide-react"
import { Link } from "react-router-dom"
import { AdminShell } from "@/components/admin/admin-shell"
import { usePageMeta } from "@/hooks/use-page-meta"
import { adminClient } from "@/lib/admin-client"
import { formatPrice } from "@/lib/utils"

export function AdminDashboardPage() {
  usePageMeta("Quản trị hệ thống", "Tổng quan vận hành Cơ khí Đăng Khoa.")
  const summary = useQuery({ queryKey: ["admin", "dashboard"], queryFn: adminClient.dashboard, refetchInterval: 60_000 })
  const data = summary.data?.data
  const cards = [
    { label: "Khách hàng", value: data?.customers, detail: "Tài khoản đã đăng ký", icon: UsersRound, to: "/admin/nhan-su?role=customer" },
    { label: "Nhân sự hoạt động", value: data?.staff, detail: `${data?.blockedUsers || 0} tài khoản đang khóa`, icon: UserCog, to: "/admin/nhan-su" },
    { label: "Lead đang mở", value: data?.openLeads, detail: "Cần tiếp tục chăm sóc", icon: ClipboardList, to: "/staff/leads" },
    { label: "Yêu cầu đang mở", value: data?.openRequests, detail: "Hồ sơ tư vấn/gia công", icon: Wrench, to: "/staff/requests" },
    { label: "Đơn đang xử lý", value: data?.openOrders, detail: `${data?.pendingOrders || 0} đơn chờ xác nhận`, icon: PackageCheck, to: "/staff/orders" },
    { label: "Sản phẩm hoạt động", value: data?.products, detail: `${data?.lowStock || 0} sản phẩm sắp hết`, icon: data?.lowStock ? AlertTriangle : Boxes, to: "/admin/noi-dung?tab=products" },
  ]
  return <AdminShell title="Tổng quan quản trị" description="Một màn hình để theo dõi nhân sự, khách hàng, đơn hàng và nội dung đang vận hành.">
    {summary.isError && <p className="rounded-2xl bg-red-50 p-5 font-semibold text-red-700">Không tải được dữ liệu quản trị. Vui lòng thử lại.</p>}
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{cards.map(({ label, value, detail, icon: Icon, to }) => <Link key={label} to={to} className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-orange-300 hover:shadow-xl"><div className="flex items-start justify-between"><span className="grid size-12 place-items-center rounded-2xl bg-emerald-950 text-white"><Icon className="size-6"/></span><strong className="font-display text-4xl text-orange-700">{summary.isLoading ? "–" : value ?? 0}</strong></div><h2 className="mt-5 text-xl font-bold text-emerald-950">{label}</h2><p className="mt-2 text-base text-slate-600">{detail}</p></Link>)}</div>
    <div className="mt-6 grid gap-5 lg:grid-cols-[.8fr_1.2fr]">
      <section className="rounded-3xl bg-emerald-950 p-6 text-white"><div className="flex items-center gap-3"><CircleDollarSign className="size-7 text-orange-400"/><h2 className="font-display text-2xl font-bold">Doanh thu đã thu</h2></div><p className="mt-6 text-sm text-emerald-50/65">Trong tháng</p><strong className="mt-1 block font-display text-3xl text-orange-300">{formatPrice(data?.monthlyRevenue || 0)}</strong><p className="mt-6 border-t border-white/10 pt-5 text-sm text-emerald-50/65">Lũy kế đơn đã thanh toán</p><strong className="mt-1 block text-xl">{formatPrice(data?.revenue || 0)}</strong></section>
      <section className="rounded-3xl border bg-white p-6"><h2 className="font-display text-2xl font-bold text-emerald-950">Đơn hàng gần đây</h2><div className="mt-4 divide-y">{data?.recentOrders.length ? data.recentOrders.map(order => <Link to="/staff/orders" key={order._id} className="flex min-h-16 items-center justify-between gap-4 py-3"><div><strong className="text-emerald-950">{order.code}</strong><p className="text-sm text-slate-500">{order.customer?.name || "Khách hàng"} · {new Date(order.createdAt).toLocaleDateString("vi-VN")}</p></div><strong className="text-orange-700">{formatPrice(order.total)}</strong></Link>) : <p className="py-8 text-center text-slate-500">Chưa có đơn hàng.</p>}</div></section>
    </div>
    <section className="mt-5 rounded-3xl border bg-white p-6"><div className="flex items-center justify-between"><h2 className="font-display text-2xl font-bold text-emerald-950">Hoạt động quản trị mới nhất</h2><Link className="font-bold text-orange-700" to="/admin/nhat-ky">Xem tất cả</Link></div><div className="mt-4 grid gap-3 md:grid-cols-2">{data?.recentActivity.map(item => <div className="rounded-2xl bg-slate-50 p-4" key={item._id}><strong className="text-slate-800">{item.summary}</strong><p className="mt-1 text-sm text-slate-500">{item.actor?.name || "Admin"} · {new Date(item.createdAt).toLocaleString("vi-VN")}</p></div>)}</div></section>
  </AdminShell>
}
