import { useQuery } from "@tanstack/react-query"
import { AlertTriangle, ClipboardList, MailWarning, PackageCheck, UserCheck, UsersRound } from "lucide-react"
import { Link } from "react-router-dom"
import { StaffShell } from "@/components/staff/staff-shell"
import { usePageMeta } from "@/hooks/use-page-meta"
import { staffClient } from "@/lib/staff-client"

export function StaffDashboardPage() {
  usePageMeta("Tổng quan nhân viên", "Theo dõi Lead và yêu cầu dịch vụ Cơ khí Đăng Khoa.")
  const summary = useQuery({ queryKey: ["staff", "dashboard"], queryFn: staffClient.dashboard, refetchInterval: 60_000 })
  const data = summary.data?.data
  const cards = [
    { label: "Lead mới", value: data?.newLeads, detail: "Cần liên hệ và sàng lọc", icon: UsersRound, to: "/staff/leads" },
    { label: "Lead tôi phụ trách", value: data?.myLeads, detail: "Đang trong quy trình chăm sóc", icon: UserCheck, to: "/staff/leads?assigned=mine" },
    { label: "Yêu cầu đang mở", value: data?.openRequests, detail: "Toàn bộ hồ sơ cần xử lý", icon: ClipboardList, to: "/staff/requests" },
    { label: "Hồ sơ của tôi", value: data?.myRequests, detail: "Đã được giao cho bạn", icon: UserCheck, to: "/staff/requests?assigned=mine" },
    { label: "Tin khách chưa đọc", value: data?.unreadCustomers, detail: "Ưu tiên phản hồi sớm", icon: MailWarning, to: "/staff/requests" },
    { label: "Yêu cầu khẩn", value: data?.urgent, detail: "Cần kiểm tra ngay", icon: AlertTriangle, to: "/staff/requests?priority=urgent" },
    { label: "Đơn mới", value: data?.pendingOrders, detail: "Cần xác nhận tồn kho", icon: PackageCheck, to: "/staff/orders?status=pending" },
    { label: "Đơn tôi phụ trách", value: data?.myOrders, detail: "Đang chuẩn bị hoặc giao", icon: PackageCheck, to: "/staff/orders?assigned=mine" },
  ]
  return <StaffShell title="Tổng quan công việc" description="Nhìn nhanh các việc cần ưu tiên và đi thẳng tới hồ sơ cần xử lý.">
    {summary.isError && <p className="rounded-2xl bg-red-50 p-5 font-semibold text-red-700">Không tải được dữ liệu. Vui lòng thử lại.</p>}
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{cards.map(({ label, value, detail, icon: Icon, to }) => <Link key={label} to={to} className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-orange-300 hover:shadow-xl"><div className="flex items-start justify-between"><span className="grid size-12 place-items-center rounded-2xl bg-emerald-950 text-white"><Icon className="size-6"/></span><strong className="font-display text-4xl text-orange-700">{summary.isLoading ? "–" : value ?? 0}</strong></div><h2 className="mt-5 text-xl font-bold text-emerald-950">{label}</h2><p className="mt-2 text-base text-slate-600">{detail}</p></Link>)}</div>
    <div className="mt-7 rounded-3xl bg-emerald-950 p-7 text-white"><h2 className="font-display text-2xl font-bold">Quy tắc xử lý</h2><div className="mt-5 grid gap-4 md:grid-cols-3"><p><strong className="block text-orange-300">1. Nhận hồ sơ</strong><span className="text-emerald-50/75">Kiểm tra thông tin và nhận phụ trách trước khi liên hệ.</span></p><p><strong className="block text-orange-300">2. Ghi nhận đầy đủ</strong><span className="text-emerald-50/75">Mọi trạng thái, trao đổi và ghi chú đều phải lưu trên hệ thống.</span></p><p><strong className="block text-orange-300">3. Báo giá có phiên bản</strong><span className="text-emerald-50/75">Không sửa đè báo giá đã gửi; luôn phát hành phiên bản mới.</span></p></div></div>
  </StaffShell>
}
