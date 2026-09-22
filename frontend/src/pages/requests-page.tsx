import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { CheckCircle2, ChevronDown, Download, FileCog, FileUp, LoaderCircle, Send, XCircle } from "lucide-react"
import { useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { useSearchParams } from "react-router-dom"
import { z } from "zod"
import { CustomerShell } from "@/components/customer/customer-shell"
import { RequestConversation } from "@/components/customer/request-conversation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { usePageMeta } from "@/hooks/use-page-meta"
import { customerClient } from "@/lib/customer-client"
import type { CustomerRequest, RequestAttachment } from "@/types/customer"

const schema = z.object({
  requestType: z.enum(["machining", "product_quote", "consulting"]), title: z.string().trim().min(5, "Tiêu đề cần ít nhất 5 ký tự").max(200),
  description: z.string().trim().min(10, "Mô tả cần ít nhất 10 ký tự").max(5000), material: z.string().trim().max(200),
  quantity: z.string().regex(/^(|[1-9][0-9]{0,6})$/, "Số lượng không hợp lệ"), dimensions: z.string().trim().max(300), desiredDate: z.string(), budget: z.string().trim().max(100)
})
type RequestData = z.infer<typeof schema>

const statuses: Record<string, { label: string; className: string }> = {
  submitted: { label: "Đã tiếp nhận", className: "bg-blue-50 text-blue-800" }, reviewing: { label: "Đang kiểm tra kỹ thuật", className: "bg-violet-50 text-violet-800" },
  need_more_info: { label: "Cần bổ sung", className: "bg-amber-50 text-amber-800" }, quoted: { label: "Đã báo giá", className: "bg-orange-50 text-orange-800" },
  accepted: { label: "Đã chấp thuận", className: "bg-emerald-50 text-emerald-800" }, rejected: { label: "Không thực hiện", className: "bg-red-50 text-red-700" }, cancelled: { label: "Đã hủy", className: "bg-slate-100 text-slate-700" }
}
const typeNames = { machining: "Gia công theo yêu cầu", product_quote: "Báo giá sản phẩm", consulting: "Tư vấn kỹ thuật" }

export function RequestsPage() {
  usePageMeta("Yêu cầu gia công", "Gửi bản vẽ và theo dõi yêu cầu kỹ thuật.")
  const [params] = useSearchParams()
  const queryClient = useQueryClient()
  const fileInput = useRef<HTMLInputElement>(null)
  const [files, setFiles] = useState<File[]>([])
  const [fileError, setFileError] = useState("")
  const [createdCode, setCreatedCode] = useState("")
  const productId = params.get("productId") || ""
  const productName = params.get("product") || ""
  const form = useForm<RequestData>({ resolver: zodResolver(schema), defaultValues: { requestType: productName ? "product_quote" : "machining", title: productName ? `Báo giá ${productName}` : "", description: productName ? `Tôi cần tư vấn và báo giá sản phẩm ${productName}.` : "", material: "", quantity: "", dimensions: "", desiredDate: "", budget: "Chưa xác định" } })
  const requests = useQuery({ queryKey: ["customer", "requests"], queryFn: customerClient.requests })
  const refresh = () => { void queryClient.invalidateQueries({ queryKey: ["customer", "requests"] }); void queryClient.invalidateQueries({ queryKey: ["customer", "summary"] }) }
  const create = useMutation({ mutationFn: customerClient.createRequest, onSuccess: result => { setCreatedCode(result.data.code); form.reset({ requestType: "machining", title: "", description: "", material: "", quantity: "", dimensions: "", desiredDate: "", budget: "Chưa xác định" }); setFiles([]); if (fileInput.current) fileInput.current.value = ""; refresh() } })
  const cancel = useMutation({ mutationFn: customerClient.cancelRequest, onSuccess: refresh })

  const submit = form.handleSubmit(data => {
    setFileError("")
    if (files.length > 5 || files.some(file => file.size > 10 * 1024 * 1024)) { setFileError("Tối đa 5 tệp, mỗi tệp không quá 10MB"); return }
    const body = new FormData()
    Object.entries(data).forEach(([key, value]) => { if (value) body.append(key, value) })
    if (productId) body.append("productId", productId)
    files.forEach(file => body.append("attachments", file))
    create.mutate(body)
  })

  const download = async (request: CustomerRequest, attachment: RequestAttachment) => {
    try {
      const blob = await customerClient.downloadAttachment(request._id, attachment._id)
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement("a"); anchor.href = url; anchor.download = attachment.originalName; anchor.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (error) { setFileError(error instanceof Error ? error.message : "Không thể tải tệp") }
  }

  return <CustomerShell title="Yêu cầu gia công & báo giá" description="Gửi thông số và bản vẽ một lần; mỗi yêu cầu có mã riêng để theo dõi xuyên suốt.">
    {createdCode && <p role="status" className="mb-5 flex items-center gap-3 rounded-2xl bg-emerald-50 p-4 font-semibold text-emerald-800"><CheckCircle2 className="size-5"/>Đã gửi yêu cầu {createdCode}. Kỹ thuật sẽ kiểm tra trong giờ làm việc.</p>}
    <div className="grid gap-6 xl:grid-cols-[.85fr_1.15fr]">
      <article className="h-fit rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 xl:sticky xl:top-28"><div className="flex items-center gap-3"><span className="grid size-12 place-items-center rounded-2xl bg-orange-50 text-orange-700"><FileCog className="size-6"/></span><div><h2 className="font-display text-2xl font-bold text-emerald-950">Tạo yêu cầu mới</h2><p className="text-sm text-slate-500">Các trường có dấu * là bắt buộc.</p></div></div><form className="mt-6" onSubmit={submit}><Field label="Loại yêu cầu *" error={form.formState.errors.requestType?.message}><select className="field-select" {...form.register("requestType")}><option value="machining">Gia công theo yêu cầu</option><option value="product_quote">Báo giá sản phẩm</option><option value="consulting">Tư vấn kỹ thuật</option></select></Field><Field label="Tiêu đề *" error={form.formState.errors.title?.message}><Input placeholder="Ví dụ: Gia công 200 chi tiết inox 304" {...form.register("title")}/></Field><Field label="Mô tả yêu cầu *" error={form.formState.errors.description?.message}><Textarea className="min-h-32" placeholder="Công dụng, dung sai, bề mặt, tiến độ và yêu cầu nghiệm thu..." {...form.register("description")}/></Field><div className="grid gap-x-4 sm:grid-cols-2"><Field label="Vật liệu"><Input placeholder="Inox 304, thép SS400..." {...form.register("material")}/></Field><Field label="Số lượng" error={form.formState.errors.quantity?.message}><Input inputMode="numeric" placeholder="100" {...form.register("quantity")}/></Field><Field label="Kích thước / dung sai"><Input placeholder="200 × 100 × 3mm" {...form.register("dimensions")}/></Field><Field label="Ngày mong muốn"><Input type="date" {...form.register("desiredDate")}/></Field></div><Field label="Ngân sách dự kiến"><select className="field-select" {...form.register("budget")}><option>Chưa xác định</option><option>Dưới 10 triệu</option><option>10 - 50 triệu</option><option>50 - 200 triệu</option><option>Trên 200 triệu</option></select></Field><label className="block rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center transition hover:border-orange-400"><FileUp className="mx-auto size-8 text-orange-600"/><span className="mt-2 block font-bold text-emerald-950">Đính kèm bản vẽ</span><span className="mt-1 block text-xs leading-5 text-slate-500">PDF, ảnh, DXF, DWG, STEP, IGES hoặc ZIP · tối đa 5 tệp × 10MB</span><input ref={fileInput} className="mt-3 block w-full text-sm" type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.dxf,.dwg,.step,.stp,.iges,.igs,.zip" onChange={event => setFiles(Array.from(event.target.files || []))}/></label>{files.length > 0 && <p className="mt-2 text-sm font-semibold text-slate-600">Đã chọn {files.length} tệp</p>}{(fileError || create.error) && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{fileError || create.error?.message}</p>}<Button className="mt-5 w-full" size="lg" disabled={create.isPending}>{create.isPending ? <><LoaderCircle className="size-5 animate-spin"/>Đang gửi...</> : <><Send className="size-5"/>Gửi yêu cầu</>}</Button></form></article>
      <div><h2 className="mb-4 font-display text-2xl font-bold text-emerald-950">Lịch sử yêu cầu</h2>{requests.isLoading ? <Loading/> : !requests.data?.data.length ? <div className="rounded-3xl border border-dashed border-slate-300 bg-white py-14 text-center"><FileCog className="mx-auto size-12 text-slate-300"/><p className="mt-4 font-bold text-slate-700">Bạn chưa có yêu cầu nào.</p></div> : <div className="space-y-4">{requests.data.data.map(request => {
        const status = statuses[request.status] || { label: request.status, className: "bg-slate-100 text-slate-700" }
        return <article className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6" key={request._id}><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div><div className="flex flex-wrap items-center gap-2"><span className="text-xs font-black uppercase tracking-wider text-orange-700">{request.code}</span><span className={`rounded-full px-3 py-1 text-xs font-black ${status.className}`}>{status.label}</span>{request.latestQuotation?.status === "sent" && <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-black text-orange-800">Có báo giá mới</span>}</div><h3 className="mt-3 font-display text-xl font-bold text-emerald-950">{request.title}</h3><p className="mt-1 text-sm text-slate-500">{typeNames[request.requestType]} · {dateTime(request.createdAt)}</p></div>{['submitted', 'need_more_info'].includes(request.status) && <Button size="icon" variant="ghost" title="Hủy yêu cầu" onClick={() => { if (window.confirm(`Hủy yêu cầu ${request.code}?`)) cancel.mutate(request._id) }}><XCircle className="size-5 text-red-600"/></Button>}</div><p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-600">{request.description}</p>{request.attachments.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{request.attachments.map(attachment => <button className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-slate-100 px-3 text-sm font-bold text-slate-700 hover:bg-orange-50 hover:text-orange-800" key={attachment._id} onClick={() => void download(request, attachment)}><Download className="size-4"/>{attachment.originalName}</button>)}</div>}<details className="group mt-4 border-t border-slate-100 pt-4"><summary className="flex min-h-10 cursor-pointer list-none items-center justify-between font-bold text-emerald-950">Tiến trình xử lý<ChevronDown className="size-5 transition group-open:rotate-180"/></summary><ol className="mt-3 space-y-3">{request.timeline.map((item, index) => <li className="flex gap-3 text-sm" key={`${item.at}-${index}`}><span className="mt-1 size-2 shrink-0 rounded-full bg-orange-500"/><div><strong>{statuses[item.status]?.label || item.status}</strong><p className="mt-1 text-slate-500">{item.message}</p><time className="mt-1 block text-xs text-slate-400">{dateTime(item.at)}</time></div></li>)}</ol></details><RequestConversation requestId={request._id}/></article>
      })}{cancel.error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{cancel.error.message}</p>}</div>}</div>
    </div>
  </CustomerShell>
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) { return <label className="mb-4 block text-sm font-bold text-slate-700"><span className="mb-2 block">{label}</span>{children}{error && <span className="mt-1 block text-sm text-red-600">{error}</span>}</label> }
const dateTime = (value: string) => new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
function Loading() { return <div className="grid min-h-60 place-items-center"><LoaderCircle className="size-8 animate-spin text-orange-600"/></div> }
