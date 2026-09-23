import { useQuery } from "@tanstack/react-query"
import { ClipboardClock, UserRound } from "lucide-react"
import { useState } from "react"
import { AdminShell } from "@/components/admin/admin-shell"
import { usePageMeta } from "@/hooks/use-page-meta"
import { adminClient } from "@/lib/admin-client"

const entityNames: Record<string, string> = { user: "Tài khoản", product: "Sản phẩm", service: "Dịch vụ", project: "Dự án" }

export function AdminAuditPage() {
  usePageMeta("Nhật ký quản trị", "Theo dõi các thay đổi nhạy cảm trong hệ thống.")
  const [entity, setEntity] = useState("")
  const logs = useQuery({ queryKey: ["admin", "audit", entity], queryFn: () => adminClient.auditLogs(entity) })
  return <AdminShell title="Nhật ký quản trị" description="Lưu dấu ai đã thay đổi tài khoản hoặc nội dung nào và vào thời điểm nào.">
    <div className="mb-5 flex flex-col justify-between gap-3 rounded-2xl border bg-white p-4 sm:flex-row sm:items-center"><p className="flex items-center gap-2 font-bold text-emerald-950"><ClipboardClock className="size-5 text-orange-600"/>{logs.data?.data.total || 0} hoạt động được ghi nhận</p><select className="field-select sm:w-52" value={entity} onChange={event => setEntity(event.target.value)}><option value="">Tất cả đối tượng</option>{Object.entries(entityNames).map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select></div>
    <div className="overflow-hidden rounded-3xl border bg-white"><div className="divide-y">{logs.data?.data.items.map(item => <article className="flex gap-4 p-5 sm:p-6" key={item._id}><span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-800"><UserRound className="size-5"/></span><div className="min-w-0 flex-1"><div className="flex flex-col justify-between gap-1 sm:flex-row"><strong className="text-emerald-950">{item.summary}</strong><time className="shrink-0 text-xs text-slate-400">{new Date(item.createdAt).toLocaleString("vi-VN")}</time></div><p className="mt-2 text-sm text-slate-500">Thực hiện bởi <strong>{item.actor?.name || "Tài khoản hệ thống"}</strong> · {entityNames[item.entity] || item.entity} · {item.action}</p></div></article>)}</div>{logs.isLoading && <p className="p-10 text-center">Đang tải nhật ký...</p>}{!logs.isLoading && !logs.data?.data.items.length && <p className="p-12 text-center text-slate-500">Chưa có hoạt động quản trị phù hợp.</p>}</div>
  </AdminShell>
}
