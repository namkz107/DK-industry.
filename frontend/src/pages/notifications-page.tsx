import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Bell, CheckCheck } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { usePageMeta } from "@/hooks/use-page-meta"
import { notificationClient, type NotificationItem } from "@/lib/notification-client"
import { cn } from "@/lib/utils"

export function NotificationsPage() {
  usePageMeta("Thông báo", "Cập nhật đơn hàng, báo giá và tiến độ công việc của bạn.")
  const navigate = useNavigate()
  const client = useQueryClient()
  const query = useQuery({ queryKey: ["notifications"], queryFn: notificationClient.list, refetchInterval: 60_000 })
  const refresh = () => void client.invalidateQueries({ queryKey: ["notifications"] })
  const read = useMutation({ mutationFn: (item: NotificationItem) => notificationClient.read(item._id), onSuccess: (_, item) => { refresh(); if (item.link) navigate(item.link) } })
  const readAll = useMutation({ mutationFn: notificationClient.readAll, onSuccess: refresh })

  return <main className="section-space bg-stone-50"><div className="container-page max-w-4xl">
    <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-sm font-black uppercase tracking-widest text-orange-700">Trung tâm cập nhật</p><h1 className="mt-2 font-display text-4xl font-bold text-emerald-950">Thông báo</h1></div><Button variant="outline" disabled={!query.data?.data.unread || readAll.isPending} onClick={() => readAll.mutate()}><CheckCheck className="size-5"/>Đánh dấu tất cả đã đọc</Button></div>
    <div className="mt-8 space-y-3">{query.data?.data.items.map(item => <button key={item._id} onClick={() => read.mutate(item)} className={cn("w-full rounded-2xl border p-5 text-left transition hover:border-orange-300", item.readAt ? "bg-white text-slate-600" : "border-emerald-200 bg-emerald-50/70 text-slate-900 shadow-sm")}><div className="flex gap-4"><span className={cn("mt-1 grid size-10 shrink-0 place-items-center rounded-xl", item.readAt ? "bg-slate-100 text-slate-500" : "bg-emerald-900 text-white")}><Bell className="size-5"/></span><span><strong className="block text-emerald-950">{item.title}</strong><span className="mt-1 block text-sm leading-6">{item.message}</span><time className="mt-2 block text-xs text-slate-400">{new Date(item.createdAt).toLocaleString("vi-VN")}</time></span></div></button>)}
      {query.isLoading && <p className="rounded-2xl border bg-white p-6">Đang tải thông báo...</p>}
      {!query.isLoading && !query.data?.data.items.length && <div className="rounded-3xl border border-dashed bg-white py-16 text-center"><Bell className="mx-auto size-12 text-slate-300"/><p className="mt-4 font-bold text-slate-600">Bạn chưa có thông báo nào.</p></div>}
      {query.error && <p role="alert" className="rounded-xl bg-red-50 p-4 font-semibold text-red-700">{query.error.message}</p>}
    </div>
  </div></main>
}
