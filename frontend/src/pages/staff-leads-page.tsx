import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { CalendarClock, Mail, Phone, Search, UserCheck } from "lucide-react"
import { useEffect, useState, type FormEvent } from "react"
import { useSearchParams } from "react-router-dom"
import { StaffShell } from "@/components/staff/staff-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { usePageMeta } from "@/hooks/use-page-meta"
import { staffClient } from "@/lib/staff-client"
import { cn } from "@/lib/utils"
import type { LeadStatus, Priority, StaffLead } from "@/types/staff"

const statusNames: Record<LeadStatus, string> = { new: "Mới", qualified: "Đủ điều kiện", contacted: "Đã liên hệ", needs_analysis: "Đang phân tích", quoted: "Đã báo giá", won: "Thành công", lost: "Thất bại", spam: "Spam" }
const priorityNames: Record<Priority, string> = { low: "Thấp", normal: "Bình thường", high: "Cao", urgent: "Khẩn" }

export function StaffLeadsPage() {
  usePageMeta("Quản lý Lead", "Tiếp nhận và chăm sóc khách hàng tiềm năng.")
  const [params] = useSearchParams(); const client = useQueryClient()
  const [filters, setFilters] = useState({ q: "", status: "", priority: params.get("priority") || "", assigned: params.get("assigned") || "" })
  const [selected, setSelected] = useState("")
  const list = useQuery({ queryKey: ["staff", "leads", filters], queryFn: () => staffClient.leads(filters) })
  const detail = useQuery({ queryKey: ["staff", "lead", selected], queryFn: () => staffClient.lead(selected), enabled: Boolean(selected) })
  useEffect(() => { if (!selected && list.data?.data.items[0]) setSelected(list.data.data.items[0]._id) }, [list.data, selected])
  const refresh = () => { client.invalidateQueries({ queryKey: ["staff", "leads"] }); client.invalidateQueries({ queryKey: ["staff", "lead", selected] }); client.invalidateQueries({ queryKey: ["staff", "dashboard"] }) }
  const update = useMutation({ mutationFn: (body: Parameters<typeof staffClient.updateLead>[1]) => staffClient.updateLead(selected, body), onSuccess: refresh })
  const note = useMutation({ mutationFn: (content: string) => staffClient.addLeadNote(selected, content), onSuccess: refresh })
  const lead = detail.data?.data
  return <StaffShell title="Khách hàng tiềm năng" description="Sàng lọc, nhận phụ trách và theo dõi lịch chăm sóc Lead từ website.">
    <div className="mb-5 grid gap-3 rounded-2xl border bg-white p-4 md:grid-cols-[1fr_190px_170px_170px]"><label className="relative"><Search className="absolute left-3 top-3.5 size-5 text-slate-400"/><Input className="pl-10" value={filters.q} onChange={event => setFilters({ ...filters, q: event.target.value })} placeholder="Tìm mã, tên, điện thoại..."/></label><Filter value={filters.status} onChange={status => setFilters({ ...filters, status })} first="Mọi trạng thái" options={Object.entries(statusNames)}/><Filter value={filters.priority} onChange={priority => setFilters({ ...filters, priority })} first="Mọi ưu tiên" options={Object.entries(priorityNames)}/><Filter value={filters.assigned} onChange={assigned => setFilters({ ...filters, assigned })} first="Tất cả phụ trách" options={[["mine", "Của tôi"], ["unassigned", "Chưa phân công"]]}/></div>
    <div className="grid gap-5 xl:grid-cols-[390px_1fr]"><div className="space-y-3">{list.isLoading && <p className="rounded-2xl bg-white p-5">Đang tải danh sách...</p>}{list.data?.data.items.map(item => <button key={item._id} onClick={() => setSelected(item._id)} className={cn("w-full rounded-2xl border bg-white p-5 text-left shadow-sm transition hover:border-orange-300", selected === item._id && "border-orange-500 ring-2 ring-orange-100")}><div className="flex items-center justify-between gap-3"><strong className="font-display text-lg text-emerald-950">{item.name}</strong><span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-orange-800">{priorityNames[item.priority]}</span></div><p className="mt-1 text-sm font-bold text-slate-500">{item.code}</p><p className="mt-3 text-slate-700">{item.serviceType || "Chưa chọn dịch vụ"}</p><div className="mt-3 flex items-center justify-between text-sm"><span className="font-bold text-emerald-700">{statusNames[item.status]}</span><span className="text-slate-500">{new Date(item.createdAt).toLocaleDateString("vi-VN")}</span></div></button>)}{!list.isLoading && !list.data?.data.items.length && <p className="rounded-2xl bg-white p-6 text-center text-slate-500">Không có Lead phù hợp.</p>}</div>
      <div>{lead ? <LeadDetail lead={lead} busy={update.isPending || note.isPending} error={(update.error || note.error) as Error | null} onUpdate={body => update.mutate(body)} onNote={content => note.mutate(content)}/> : <div className="rounded-3xl border bg-white p-10 text-center text-slate-500">Chọn một Lead để xử lý.</div>}</div></div>
  </StaffShell>
}

function LeadDetail({ lead, busy, error, onUpdate, onNote }: { lead: StaffLead; busy: boolean; error: Error | null; onUpdate: (body: Parameters<typeof staffClient.updateLead>[1]) => void; onNote: (content: string) => void }) {
  const [status, setStatus] = useState<LeadStatus>(lead.status); const [message, setMessage] = useState(""); const [note, setNote] = useState("")
  useEffect(() => { setStatus(lead.status); setMessage(""); setNote("") }, [lead._id, lead.status])
  const submitStatus = (event: FormEvent) => { event.preventDefault(); onUpdate({ status, message, lostReason: status === "lost" ? message : undefined }) }
  return <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"><div className="flex flex-col justify-between gap-4 md:flex-row"><div><p className="text-sm font-black uppercase tracking-wider text-orange-700">{lead.code}</p><h2 className="mt-2 font-display text-3xl font-bold text-emerald-950">{lead.name}</h2><p className="mt-2 text-slate-600">{lead.serviceType || "Chưa xác định dịch vụ"} · {lead.budget || "Chưa có ngân sách"}</p></div><Button onClick={() => onUpdate({ assignedTo: lead.assignedTo ? "unassigned" : "me" })} disabled={busy} variant={lead.assignedTo ? "outline" : "default"}><UserCheck className="size-5"/>{lead.assignedTo ? `Phụ trách: ${lead.assignedTo.name}` : "Nhận phụ trách"}</Button></div>
    <div className="mt-6 grid gap-3 rounded-2xl bg-slate-50 p-5 sm:grid-cols-2"><a className="flex min-h-11 items-center gap-3 font-bold text-emerald-800" href={`tel:${lead.phone}`}><Phone className="size-5 text-orange-600"/>{lead.phone}</a>{lead.email && <a className="flex min-h-11 items-center gap-3 font-bold text-emerald-800" href={`mailto:${lead.email}`}><Mail className="size-5 text-orange-600"/>{lead.email}</a>}<p className="sm:col-span-2 text-slate-700">{lead.message || "Khách chưa để lại mô tả."}</p></div>
    {error && <p className="mt-4 rounded-xl bg-red-50 p-4 font-semibold text-red-700">{error.message}</p>}
    <div className="mt-6 grid gap-6 lg:grid-cols-2"><form onSubmit={submitStatus} className="space-y-4"><h3 className="text-lg font-bold text-emerald-950">Cập nhật xử lý</h3><Filter value={status} onChange={value => setStatus(value as LeadStatus)} first="Chọn trạng thái" options={Object.entries(statusNames)}/><select className="field-select" value={lead.priority} onChange={event => onUpdate({ priority: event.target.value as Priority })}>{Object.entries(priorityNames).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><label className="block text-sm font-bold text-slate-700"><span className="mb-2 flex items-center gap-2"><CalendarClock className="size-4"/>Lịch liên hệ tiếp theo</span><Input type="datetime-local" defaultValue={lead.nextFollowUpAt?.slice(0, 16) || ""} onBlur={event => onUpdate({ nextFollowUpAt: event.target.value })}/></label><Textarea value={message} onChange={event => setMessage(event.target.value)} placeholder={status === "lost" ? "Lý do thất bại (bắt buộc)" : "Nội dung trao đổi hoặc lý do đổi trạng thái"}/><Button disabled={busy}>Lưu trạng thái</Button></form>
      <form className="space-y-4" onSubmit={event => { event.preventDefault(); if (note.trim()) onNote(note.trim()) }}><h3 className="text-lg font-bold text-emerald-950">Ghi chú nội bộ</h3><Textarea rows={4} value={note} onChange={event => setNote(event.target.value)} placeholder="Nội dung chỉ nhân viên và quản trị viên nhìn thấy"/><Button disabled={busy || !note.trim()} variant="outline">Thêm ghi chú</Button><div className="max-h-64 space-y-3 overflow-y-auto">{lead.notes?.slice().reverse().map(item => <div key={item._id} className="rounded-xl bg-amber-50 p-4 text-sm"><p className="text-slate-800">{item.content}</p><p className="mt-2 text-xs font-bold text-slate-500">{item.author?.name || "Nhân viên"} · {new Date(item.createdAt).toLocaleString("vi-VN")}</p></div>)}</div></form></div>
  </article>
}

function Filter({ value, onChange, first, options }: { value: string; onChange: (value: string) => void; first: string; options: string[][] }) { return <select className="field-select" value={value} onChange={event => onChange(event.target.value)}><option value="">{first}</option>{options.map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select> }
