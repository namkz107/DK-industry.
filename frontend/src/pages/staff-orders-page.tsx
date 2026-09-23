import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Banknote, CalendarClock, CheckCircle2, History, MapPin, PackageCheck, Phone, Search, Truck, UserCheck } from "lucide-react"
import { useEffect, useState, type FormEvent, type ReactNode } from "react"
import { useSearchParams } from "react-router-dom"
import { StaffShell } from "@/components/staff/staff-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { usePageMeta } from "@/hooks/use-page-meta"
import { staffClient } from "@/lib/staff-client"
import { cn } from "@/lib/utils"
import type { OrderStatus, PaymentStatus, StaffOrder } from "@/types/staff"

const statusNames: Record<OrderStatus, string> = { pending: "Chờ xác nhận", confirmed: "Đã xác nhận", preparing: "Đang chuẩn bị", shipping: "Đang giao", delivered: "Đã giao", cancelled: "Đã hủy" }
const paymentNames: Record<PaymentStatus, string> = { unpaid: "Chưa thanh toán", pending: "Chờ đối soát", paid: "Đã thanh toán", refund_pending: "Chờ hoàn tiền", refunded: "Đã hoàn tiền" }
const nextStatuses: Record<OrderStatus, OrderStatus[]> = { pending: ["confirmed", "cancelled"], confirmed: ["preparing", "cancelled"], preparing: ["shipping", "cancelled"], shipping: ["delivered"], delivered: [], cancelled: [] }
const paymentTransitions: Record<PaymentStatus, PaymentStatus[]> = { unpaid: ["pending", "paid"], pending: ["unpaid", "paid"], paid: ["refund_pending"], refund_pending: ["refunded"], refunded: [] }
const money = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" })

export function StaffOrdersPage() {
  usePageMeta("Quản lý đơn hàng", "Xác nhận kho, thanh toán, đóng gói và điều phối giao hàng.")
  const [params] = useSearchParams()
  const client = useQueryClient()
  const [filters, setFilters] = useState({ q: "", status: params.get("status") || "", paymentStatus: "", assigned: params.get("assigned") || "" })
  const [selected, setSelected] = useState("")
  const list = useQuery({ queryKey: ["staff", "orders", filters], queryFn: () => staffClient.orders(filters) })
  const detail = useQuery({ queryKey: ["staff", "order", selected], queryFn: () => staffClient.order(selected), enabled: Boolean(selected) })
  useEffect(() => { if (!selected && list.data?.data.items[0]) setSelected(list.data.data.items[0]._id) }, [list.data, selected])
  const refresh = () => {
    void client.invalidateQueries({ queryKey: ["staff", "orders"] })
    void client.invalidateQueries({ queryKey: ["staff", "order", selected] })
    void client.invalidateQueries({ queryKey: ["staff", "dashboard"] })
  }
  const update = useMutation({ mutationFn: (body: Parameters<typeof staffClient.updateOrder>[1]) => staffClient.updateOrder(selected, body), onSuccess: refresh })

  return <StaffShell title="Đơn hàng thương mại" description="Xử lý tuần tự từ xác nhận tồn kho đến giao hàng và đối soát thanh toán.">
    <div className="mb-5 grid gap-3 rounded-2xl border bg-white p-4 md:grid-cols-[1fr_180px_180px_170px]">
      <label className="relative"><Search className="absolute left-3 top-3.5 size-5 text-slate-400"/><Input className="pl-10" value={filters.q} onChange={event => setFilters({ ...filters, q: event.target.value })} placeholder="Mã đơn, người nhận, điện thoại..."/></label>
      <Filter value={filters.status} onChange={status => setFilters({ ...filters, status })} first="Mọi trạng thái" options={Object.entries(statusNames)}/>
      <Filter value={filters.paymentStatus} onChange={paymentStatus => setFilters({ ...filters, paymentStatus })} first="Mọi thanh toán" options={Object.entries(paymentNames)}/>
      <Filter value={filters.assigned} onChange={assigned => setFilters({ ...filters, assigned })} first="Tất cả phụ trách" options={[["mine", "Của tôi"], ["unassigned", "Chưa phân công"]]}/>
    </div>
    <div className="grid gap-5 xl:grid-cols-[390px_1fr]">
      <div className="space-y-3">{list.data?.data.items.map(item => <button key={item._id} onClick={() => setSelected(item._id)} className={cn("w-full rounded-2xl border bg-white p-5 text-left shadow-sm transition hover:border-orange-300", selected === item._id && "border-orange-500 ring-2 ring-orange-100")}><div className="flex justify-between gap-3"><strong className="text-lg text-emerald-950">{item.code}</strong><span className="text-sm font-black text-orange-700">{money.format(item.total)}</span></div><p className="mt-2 text-slate-700">{item.shippingAddress.recipientName}</p><div className="mt-3 flex justify-between gap-2 text-sm"><span className="font-bold text-emerald-700">{statusNames[item.status]}</span><span className="text-slate-500">{new Date(item.createdAt).toLocaleDateString("vi-VN")}</span></div><p className="mt-2 text-xs font-semibold text-slate-500">{paymentNames[item.paymentStatus]}</p></button>)}{list.isLoading && <p className="rounded-2xl bg-white p-5">Đang tải đơn hàng...</p>}{!list.isLoading && !list.data?.data.items.length && <p className="rounded-2xl bg-white p-6 text-center text-slate-500">Không có đơn phù hợp.</p>}</div>
      {detail.data?.data ? <OrderDetail order={detail.data.data} busy={update.isPending} success={update.isSuccess} error={update.error as Error | null} onUpdate={body => update.mutate(body)}/> : <div className="rounded-3xl border bg-white p-10 text-center text-slate-500">Chọn một đơn hàng để xử lý.</div>}
    </div>
  </StaffShell>
}

function OrderDetail({ order, busy, success, error, onUpdate }: { order: StaffOrder; busy: boolean; success: boolean; error: Error | null; onUpdate: (body: Parameters<typeof staffClient.updateOrder>[1]) => void }) {
  const [nextStatus, setNextStatus] = useState("")
  const [paymentStatus, setPaymentStatus] = useState("")
  const [message, setMessage] = useState("")
  const [internalNote, setInternalNote] = useState(order.internalNote || "")
  const [shippingFee, setShippingFee] = useState(String(order.shippingFee || 0))
  const [shippingProvider, setShippingProvider] = useState(order.shippingProvider || "")
  const [trackingCode, setTrackingCode] = useState(order.trackingCode || "")
  const [estimatedDeliveryAt, setEstimatedDeliveryAt] = useState(order.estimatedDeliveryAt?.slice(0, 16) || "")

  useEffect(() => {
    setNextStatus(""); setPaymentStatus(""); setMessage(""); setInternalNote(order.internalNote || "")
    setShippingFee(String(order.shippingFee || 0)); setShippingProvider(order.shippingProvider || ""); setTrackingCode(order.trackingCode || ""); setEstimatedDeliveryAt(order.estimatedDeliveryAt?.slice(0, 16) || "")
  }, [order])

  const allowedPayments = paymentTransitions[order.paymentStatus].filter(status => status !== "refund_pending" || order.status === "cancelled")
  const submitProgress = (event: FormEvent) => {
    event.preventDefault()
    const body: Parameters<typeof staffClient.updateOrder>[1] = { message }
    if (nextStatus) body.status = nextStatus as OrderStatus
    if (paymentStatus) body.paymentStatus = paymentStatus as PaymentStatus
    onUpdate(body)
  }

  return <article className="rounded-3xl border bg-white p-6 shadow-sm sm:p-8">
    <div className="flex flex-col justify-between gap-4 md:flex-row"><div><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-800">{statusNames[order.status]}</span><span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-black text-orange-800">{paymentNames[order.paymentStatus]}</span></div><p className="mt-3 text-sm font-black uppercase tracking-wider text-orange-700">{order.code}</p><h2 className="mt-1 font-display text-3xl font-bold text-emerald-950">{order.shippingAddress.recipientName}</h2><p className="mt-2 text-slate-600">{order.customer.name} · {order.paymentMethod === "cod" ? "Thanh toán khi nhận" : "Chuyển khoản"}</p></div><Button onClick={() => onUpdate({ assignedTo: order.assignedTo ? "unassigned" : "me" })} disabled={busy} variant={order.assignedTo ? "outline" : "default"}><UserCheck className="size-5"/>{order.assignedTo ? `Phụ trách: ${order.assignedTo.name}` : "Nhận phụ trách"}</Button></div>

    <div className="mt-6 grid gap-4 rounded-2xl bg-slate-50 p-5 md:grid-cols-2"><p className="flex gap-3"><MapPin className="mt-1 size-5 shrink-0 text-orange-600"/><span>{order.shippingAddress.addressLine}, {order.shippingAddress.ward && `${order.shippingAddress.ward}, `}{order.shippingAddress.district}, {order.shippingAddress.province}</span></p><a className="flex min-h-11 items-center gap-3 font-bold text-emerald-800" href={`tel:${order.shippingAddress.phone}`}><Phone className="size-5 text-orange-600"/>{order.shippingAddress.phone}</a></div>

    <div className="mt-6 overflow-x-auto"><table className="w-full min-w-[560px] text-left"><thead className="border-b text-sm text-slate-500"><tr><th className="py-3">Sản phẩm</th><th>SL</th><th>Đơn giá</th><th className="text-right">Thành tiền</th></tr></thead><tbody>{order.items.map(item => <tr key={item._id} className="border-b"><td className="py-4 font-bold text-emerald-950">{item.name}<span className="block text-xs font-normal text-slate-500">{item.sku}</span></td><td>{item.quantity} {item.unit}</td><td>{money.format(item.price)}</td><td className="text-right font-bold">{money.format(item.lineTotal)}</td></tr>)}</tbody></table><div className="ml-auto mt-5 max-w-sm space-y-2 text-sm"><p className="flex justify-between"><span className="text-slate-500">Tiền hàng</span><strong>{money.format(order.subtotal)}</strong></p><p className="flex justify-between"><span className="text-slate-500">Vận chuyển</span><strong>{money.format(order.shippingFee)}</strong></p><p className="flex justify-between border-t pt-2 font-display text-xl"><span>Tổng</span><strong className="text-orange-700">{money.format(order.total)}</strong></p></div></div>

    <Section icon={<Truck/>} title="Giao vận và chi phí">
      <form className="grid gap-3 md:grid-cols-2" onSubmit={event => { event.preventDefault(); const body: Parameters<typeof staffClient.updateOrder>[1] = { shippingProvider, trackingCode, estimatedDeliveryAt }; if (["pending", "confirmed", "preparing"].includes(order.status)) body.shippingFee = Number(shippingFee); onUpdate(body) }}>
        <Field label="Phí vận chuyển (VND)"><Input type="number" min="0" step="1000" disabled={["shipping", "delivered", "cancelled"].includes(order.status)} value={shippingFee} onChange={event => setShippingFee(event.target.value)}/></Field>
        <Field label="Đơn vị / hình thức vận chuyển"><Input value={shippingProvider} onChange={event => setShippingProvider(event.target.value)} placeholder="Ví dụ: Viettel Post hoặc xe công ty"/></Field>
        <Field label="Mã vận đơn"><Input value={trackingCode} onChange={event => setTrackingCode(event.target.value)} placeholder="Có thể để trống nếu giao xe công ty"/></Field>
        <Field label="Thời gian giao dự kiến"><Input type="datetime-local" value={estimatedDeliveryAt} onChange={event => setEstimatedDeliveryAt(event.target.value)}/></Field>
        <Button className="md:col-span-2 md:justify-self-start" variant="outline" disabled={busy}>Lưu thông tin giao vận</Button>
      </form>
    </Section>

    <Section icon={<PackageCheck/>} title="Bước xử lý tiếp theo">
      {!nextStatuses[order.status].length && !allowedPayments.length ? <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">Đơn hàng đã kết thúc, không còn bước xử lý tiếp theo.</p> : <form className="grid gap-3 lg:grid-cols-[210px_210px_1fr_auto]" onSubmit={submitProgress}>
        <Filter value={nextStatus} onChange={setNextStatus} first="Không đổi tiến trình" options={nextStatuses[order.status].map(status => [status, statusNames[status]])}/>
        <Filter value={paymentStatus} onChange={setPaymentStatus} first="Không đổi thanh toán" options={allowedPayments.map(status => [status, paymentNames[status]])}/>
        <Input value={message} onChange={event => setMessage(event.target.value)} placeholder={nextStatus === "cancelled" ? "Bắt buộc nhập lý do hủy" : "Nội dung khách hàng sẽ nhìn thấy"}/>
        <Button disabled={busy || (!nextStatus && !paymentStatus) || (nextStatus === "cancelled" && message.trim().length < 5)}>Cập nhật</Button>
      </form>}
      {order.paymentMethod === "bank_transfer" && order.paymentStatus !== "paid" && <p className="mt-3 flex items-center gap-2 text-sm text-amber-700"><Banknote className="size-4"/>Đơn chuyển khoản phải được xác nhận “Đã thanh toán” trước khi xuất giao.</p>}
    </Section>

    <Section icon={<History/>} title="Lịch sử xử lý">
      <div className="grid gap-6 md:grid-cols-2"><Timeline title="Tiến trình đơn hàng" entries={order.timeline.map(item => ({ label: statusNames[item.status as OrderStatus] || item.status, message: item.message, at: item.at }))}/><Timeline title="Đối soát thanh toán" entries={(order.paymentTimeline || []).map(item => ({ label: paymentNames[item.status], message: item.message, at: item.at }))}/></div>
    </Section>

    {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-4 font-semibold text-red-700">{error.message}</p>}
    {success && !busy && <p role="status" className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 p-4 font-semibold text-emerald-800"><CheckCircle2 className="size-5"/>Đã lưu thay đổi.</p>}
    <div className="mt-6"><label className="text-sm font-bold text-slate-700">Ghi chú nội bộ<Textarea className="mt-2" value={internalNote} onChange={event => setInternalNote(event.target.value)} placeholder="Thông tin kho, hóa đơn VAT, vận chuyển..."/></label><Button className="mt-3" variant="outline" disabled={busy} onClick={() => onUpdate({ internalNote })}>Lưu ghi chú</Button></div>
  </article>
}

function Section({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) { return <section className="mt-7 border-t border-slate-200 pt-6"><h3 className="mb-4 flex items-center gap-2 font-display text-xl font-bold text-emerald-950"><span className="grid size-9 place-items-center rounded-xl bg-orange-50 text-orange-700 [&>svg]:size-5">{icon}</span>{title}</h3>{children}</section> }
function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="text-sm font-bold text-slate-700">{label}<span className="mt-2 block">{children}</span></label> }
function Timeline({ title, entries }: { title: string; entries: Array<{ label: string; message?: string; at: string }> }) { return <div><h4 className="mb-3 font-bold text-slate-800">{title}</h4>{entries.length ? <ol className="space-y-3">{entries.map((item, index) => <li className="flex gap-3 text-sm" key={`${item.at}-${index}`}><span className="mt-1.5 size-2 shrink-0 rounded-full bg-orange-500"/><div><strong>{item.label}</strong>{item.message && <p className="mt-1 text-slate-500">{item.message}</p>}<time className="mt-1 flex items-center gap-1 text-xs text-slate-400"><CalendarClock className="size-3"/>{new Date(item.at).toLocaleString("vi-VN")}</time></div></li>)}</ol> : <p className="text-sm text-slate-400">Chưa có cập nhật.</p>}</div> }
function Filter({ value, onChange, first, options }: { value: string; onChange: (value: string) => void; first: string; options: string[][] }) { return <select className="field-select" value={value} onChange={event => onChange(event.target.value)}><option value="">{first}</option>{options.map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select> }
