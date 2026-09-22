import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { CheckCircle2, ChevronDown, Clock3, LoaderCircle, PackageOpen, Truck, XCircle } from "lucide-react"
import { Link, useLocation } from "react-router-dom"
import { CustomerShell } from "@/components/customer/customer-shell"
import { Button } from "@/components/ui/button"
import { usePageMeta } from "@/hooks/use-page-meta"
import { customerClient } from "@/lib/customer-client"
import { formatPrice } from "@/lib/utils"

const statuses: Record<string, { label: string; className: string }> = {
  pending: { label: "Chờ xác nhận", className: "bg-amber-50 text-amber-800" }, confirmed: { label: "Đã xác nhận", className: "bg-blue-50 text-blue-800" },
  preparing: { label: "Đang chuẩn bị hàng", className: "bg-violet-50 text-violet-800" }, shipping: { label: "Đang giao", className: "bg-cyan-50 text-cyan-800" },
  delivered: { label: "Đã giao", className: "bg-emerald-50 text-emerald-800" }, cancelled: { label: "Đã hủy", className: "bg-red-50 text-red-700" }
}

export function OrdersPage() {
  usePageMeta("Đơn hàng của tôi", "Theo dõi các đơn hàng thương mại đã đặt.")
  const queryClient = useQueryClient()
  const location = useLocation()
  const orders = useQuery({ queryKey: ["customer", "orders"], queryFn: customerClient.orders })
  const cancel = useMutation({ mutationFn: (id: string) => customerClient.cancelOrder(id), onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ["customer", "orders"] }); void queryClient.invalidateQueries({ queryKey: ["customer", "summary"] }) } })
  const createdCode = (location.state as { createdCode?: string } | null)?.createdCode
  return <CustomerShell title="Đơn hàng của tôi" description="Trạng thái được cập nhật từ lúc tiếp nhận đến khi giao hàng hoàn tất.">
    {createdCode && <p role="status" className="mb-5 flex items-center gap-3 rounded-2xl bg-emerald-50 p-4 font-semibold text-emerald-800"><CheckCircle2 className="size-5"/>Đã tạo đơn {createdCode}. Nhân viên sẽ sớm xác nhận tồn kho.</p>}
    {orders.isLoading ? <Loading/> : orders.error ? <ErrorText error={orders.error}/> : !orders.data?.data.length ? <div className="rounded-3xl border border-dashed border-slate-300 bg-white py-16 text-center"><PackageOpen className="mx-auto size-14 text-slate-300"/><h2 className="mt-4 font-display text-2xl font-bold text-emerald-950">Chưa có đơn hàng</h2><p className="mt-2 text-slate-600">Các sản phẩm có giá niêm yết có thể đặt trực tiếp.</p><Button asChild className="mt-6"><Link to="/san-pham">Xem sản phẩm</Link></Button></div> : <div className="space-y-5">{orders.data.data.map(order => {
      const status = statuses[order.status] || { label: order.status, className: "bg-slate-100 text-slate-700" }
      return <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white" key={order._id}><div className="flex flex-col justify-between gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:p-6"><div><div className="flex flex-wrap items-center gap-3"><h2 className="font-display text-xl font-bold text-emerald-950">{order.code}</h2><span className={`rounded-full px-3 py-1 text-xs font-black ${status.className}`}>{status.label}</span></div><p className="mt-2 flex items-center gap-2 text-sm text-slate-500"><Clock3 className="size-4"/>{dateTime(order.createdAt)}</p></div><div className="sm:text-right"><p className="text-sm text-slate-500">Tạm tính</p><strong className="text-xl text-orange-700">{formatPrice(order.total)}</strong></div></div><div className="p-5 sm:p-6"><div className="space-y-4">{order.items.map(item => <div className="flex items-center gap-4" key={`${order._id}-${item.product}`}><img className="size-16 rounded-xl object-cover" src={item.image} alt={item.name}/><div className="min-w-0 flex-1"><h3 className="font-bold text-emerald-950">{item.name}</h3><p className="text-sm text-slate-500">{item.quantity} {item.unit} × {formatPrice(item.price)}</p></div><strong className="text-sm text-slate-800">{formatPrice(item.lineTotal)}</strong></div>)}</div><details className="group mt-5 rounded-2xl bg-slate-50 p-4"><summary className="flex min-h-10 cursor-pointer list-none items-center justify-between font-bold text-emerald-950">Chi tiết giao nhận & tiến trình<ChevronDown className="size-5 transition group-open:rotate-180"/></summary><div className="mt-4 grid gap-6 border-t border-slate-200 pt-4 md:grid-cols-2"><div><h3 className="text-sm font-bold text-slate-700">Giao đến</h3><p className="mt-2 text-sm leading-6 text-slate-600">{order.shippingAddress.recipientName} · {order.shippingAddress.phone}<br/>{[order.shippingAddress.addressLine, order.shippingAddress.ward, order.shippingAddress.district, order.shippingAddress.province].filter(Boolean).join(", ")}</p><p className="mt-3 text-sm text-slate-500">Thanh toán: {order.paymentMethod === "cod" ? "Khi nhận hàng" : "Chuyển khoản sau xác nhận"}</p></div><ol className="space-y-3">{order.timeline.map((item, index) => <li className="flex gap-3 text-sm" key={`${item.at}-${index}`}><span className="mt-1 size-2 shrink-0 rounded-full bg-orange-500"/><div><strong className="text-slate-800">{statuses[item.status]?.label || item.status}</strong><p className="mt-1 leading-5 text-slate-500">{item.message}</p><time className="mt-1 block text-xs text-slate-400">{dateTime(item.at)}</time></div></li>)}</ol></div></details>{order.status === "pending" && <Button className="mt-4" variant="ghost" disabled={cancel.isPending} onClick={() => { if (window.confirm(`Hủy đơn ${order.code}?`)) cancel.mutate(order._id) }}><XCircle className="size-5 text-red-600"/>Hủy đơn đang chờ</Button>}</div></article>
    })}{cancel.error && <ErrorText error={cancel.error}/>}</div>}
    <div className="mt-6 flex items-start gap-3 rounded-2xl bg-blue-50 p-4 text-sm leading-6 text-blue-900"><Truck className="mt-0.5 size-5 shrink-0"/><p>Phí vận chuyển và ngày giao chính thức sẽ được nhân viên xác nhận theo kích thước, khối lượng và địa điểm nhận hàng.</p></div>
  </CustomerShell>
}

const dateTime = (value: string) => new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
function Loading() { return <div className="grid min-h-60 place-items-center"><LoaderCircle className="size-8 animate-spin text-orange-600"/></div> }
function ErrorText({ error }: { error: Error }) { return <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-700">{error.message}</p> }
