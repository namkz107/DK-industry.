import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { CheckCheck, Clock3, Mail, MessageCircleMore, Phone, Search, Send, UserCheck, XCircle } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react"
import { StaffShell } from "@/components/staff/staff-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { usePageMeta } from "@/hooks/use-page-meta"
import { supportClient } from "@/lib/support-client"
import { acquireSupportSocket, releaseSupportSocket } from "@/lib/support-socket"
import { cn } from "@/lib/utils"
import type { SupportMessage, SupportSession } from "@/types/support"

type DetailResult = { success: boolean; data: SupportSession }
function merge(messages: SupportMessage[], incoming: SupportMessage) {
  const values = messages.filter(item => item._id !== incoming._id && (!incoming.clientMessageId || item.clientMessageId !== incoming.clientMessageId))
  return [...values, incoming].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
}

export function StaffSupportPage() {
  usePageMeta("Hỗ trợ khách hàng", "Tiếp nhận và phản hồi các cuộc trò chuyện từ website.")
  const client = useQueryClient()
  const [selected, setSelected] = useState("")
  const [search, setSearch] = useState("")
  const [loadingOlder, setLoadingOlder] = useState(false)
  const conversations = useQuery({ queryKey: ["staff", "support"], queryFn: supportClient.conversations, refetchInterval: 60_000 })
  const detailKey = useMemo(() => ["staff", "support", selected] as const, [selected])
  const detail = useQuery({ queryKey: detailKey, queryFn: () => supportClient.conversation(selected), enabled: Boolean(selected) })
  const updateDetail = useCallback((updater: (value: SupportSession) => SupportSession) => client.setQueryData<DetailResult>(detailKey, current => current ? { ...current, data: updater(current.data) } : current), [client, detailKey])
  useEffect(() => { if (!selected && conversations.data?.data[0]) setSelected(conversations.data.data[0]._id) }, [conversations.data, selected])

  useEffect(() => {
    const socket = acquireSupportSocket()
    const join = () => { if (selected) socket.emit("support:join", selected, (result: { ok: boolean }) => { if (result.ok) socket.emit("support:read", selected) }) }
    const onMessage = (payload: { conversationId: string; message: SupportMessage }) => {
      void client.invalidateQueries({ queryKey: ["staff", "support"] })
      if (payload.conversationId === selected) { updateDetail(value => ({ ...value, messages: merge(value.messages, payload.message) })); socket.emit("support:read", selected) }
    }
    const onInbox = () => void client.invalidateQueries({ queryKey: ["staff", "support"] })
    const onUpdated = (payload: { conversationId: string }) => { onInbox(); if (payload.conversationId === selected) void client.invalidateQueries({ queryKey: detailKey }) }
    const onRead = (payload: { conversationId: string; reader: string; readAt: string }) => {
      if (payload.conversationId === selected && payload.reader === 'customer') updateDetail(value => ({ ...value, messages: value.messages.map(message => ['staff', 'admin'].includes(message.senderRole) ? { ...message, readAt: payload.readAt } : message) }))
    }
    socket.on("connect", join); socket.on("support:message", onMessage); socket.on("support:inbox", onInbox); socket.on("support:updated", onUpdated); socket.on("support:read", onRead)
    if (socket.connected) join()
    return () => { socket.off("connect", join); socket.off("support:message", onMessage); socket.off("support:inbox", onInbox); socket.off("support:updated", onUpdated); socket.off("support:read", onRead); releaseSupportSocket() }
  }, [client, detailKey, selected, updateDetail])

  const send = useMutation({
    mutationFn: ({ content, clientMessageId }: { content: string; clientMessageId: string }) => supportClient.staffSend(selected, content, clientMessageId),
    onMutate: variables => updateDetail(value => ({ ...value, messages: merge(value.messages, { _id: `pending:${variables.clientMessageId}`, conversation: selected, senderRole: 'staff', clientMessageId: variables.clientMessageId, content: variables.content, createdAt: new Date().toISOString(), deliveryStatus: 'sending' }) })),
    onSuccess: (result, variables) => updateDetail(value => ({ ...value, messages: merge(value.messages.filter(item => item.clientMessageId !== variables.clientMessageId), result.data) })),
    onError: (_, variables) => updateDetail(value => ({ ...value, messages: value.messages.map(item => item.clientMessageId === variables.clientMessageId ? { ...item, deliveryStatus: 'failed' } : item) })),
  })
  const update = useMutation({ mutationFn: (body: { assignedTo?: "me"; status?: "open" | "closed" }) => supportClient.update(selected, body), onSuccess: () => { void client.invalidateQueries({ queryKey: ["staff", "support"] }); void client.invalidateQueries({ queryKey: detailKey }) } })
  const loadOlder = async () => {
    const page = detail.data?.data.page
    if (!selected || !page?.hasMore || loadingOlder) return
    setLoadingOlder(true)
    try {
      const result = await supportClient.staffMessages(selected, page.nextCursor)
      updateDetail(value => ({ ...value, messages: [...result.data.items, ...value.messages].filter((item, index, all) => all.findIndex(candidate => candidate._id === item._id) === index), page: { hasMore: result.data.hasMore, nextCursor: result.data.nextCursor } }))
    } finally { setLoadingOlder(false) }
  }
  const items = (conversations.data?.data || []).filter(item => `${item.contact.name} ${item.contact.phone} ${item.contact.email} ${item.customer?.name}`.toLowerCase().includes(search.toLowerCase()))

  if (conversations.error || detail.error) return <StaffShell title="Hỗ trợ khách hàng" description="Không thể tải hộp thư hỗ trợ."><p role="alert" className="rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-700">{(conversations.error || detail.error)?.message}</p></StaffShell>

  return <StaffShell title="Hỗ trợ khách hàng" description="Hộp thư tư vấn chung từ widget trên website.">
    <div className="mb-4 rounded-2xl border bg-white p-3"><label className="relative block"><Search className="absolute left-3 top-3.5 size-5 text-slate-400"/><Input className="pl-10" value={search} onChange={event => setSearch(event.target.value)} placeholder="Tìm tên, email hoặc số điện thoại..."/></label></div>
    <div className="grid overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm xl:h-[min(720px,calc(100vh-12rem))] xl:min-h-[620px] xl:grid-cols-[320px_1fr_280px]">
      <aside className="max-h-[720px] overflow-y-auto border-b border-slate-200 xl:border-b-0 xl:border-r"><div className="border-b p-4 text-sm font-black uppercase tracking-wider text-slate-500">Hội thoại ({items.length})</div>{items.map(item => <button key={item._id} onClick={() => setSelected(item._id)} className={cn("w-full border-b border-slate-100 p-4 text-left hover:bg-slate-50", selected === item._id && "bg-blue-50")}><div className="flex items-start justify-between gap-2"><strong className="truncate text-emerald-950">{item.customer?.name || item.contact.name || "Khách truy cập"}</strong>{item.unreadByStaff > 0 && <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs font-black text-white">{item.unreadByStaff}</span>}</div><p className="mt-1 truncate text-sm text-slate-500">{item.lastMessagePreview || "Chưa có tin nhắn"}</p><p className="mt-2 text-xs text-slate-400">{new Date(item.lastMessageAt).toLocaleString("vi-VN")}</p></button>)}{!items.length && <p className="p-8 text-center text-sm text-slate-500">Chưa có hội thoại.</p>}</aside>
      <main className="flex min-h-[560px] flex-col border-b border-slate-200 xl:min-h-0 xl:border-b-0 xl:border-r">{detail.data?.data ? <ChatPanel session={detail.data.data} busy={send.isPending} loadingOlder={loadingOlder} onLoadOlder={() => void loadOlder()} onSend={(content, clientMessageId) => send.mutate({ content, clientMessageId })}/> : <div className="grid flex-1 place-items-center p-8 text-center text-slate-500"><div><MessageCircleMore className="mx-auto mb-3 size-10"/>Chọn một hội thoại để phản hồi.</div></div>}</main>
      <aside className="p-5">{detail.data?.data && <ContactPanel session={detail.data.data} busy={update.isPending} onUpdate={body => update.mutate(body)}/>}</aside>
    </div>
  </StaffShell>
}

function ChatPanel({ session, busy, loadingOlder, onLoadOlder, onSend }: { session: SupportSession; busy: boolean; loadingOlder: boolean; onLoadOlder: () => void; onSend: (content: string, clientMessageId: string) => void }) {
  const [content, setContent] = useState("")
  const listRef = useRef<HTMLDivElement>(null)
  useEffect(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" }) }, [session.conversation._id, session.messages.length])
  const submit = (event: FormEvent) => { event.preventDefault(); if (!content.trim()) return; onSend(content.trim(), crypto.randomUUID()); setContent("") }
  return <><header className="border-b px-5 py-4"><strong className="text-emerald-950">{session.conversation.customer?.name || session.conversation.contact.name || "Khách truy cập"}</strong><p className="text-xs text-slate-500">{session.conversation.status === 'open' ? 'Đang hỗ trợ' : 'Đã đóng'}</p></header><div ref={listRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-slate-50 p-5">{session.page.hasMore && <div className="text-center"><Button type="button" size="sm" variant="ghost" disabled={loadingOlder} onClick={onLoadOlder}>{loadingOlder ? "Đang tải..." : "Tải tin nhắn cũ"}</Button></div>}{session.messages.map(message => { const mine = ['staff', 'admin'].includes(message.senderRole); return <div key={message._id} className={cn("max-w-[85%] rounded-2xl px-4 py-3 text-sm", mine ? "ml-auto rounded-br-md bg-emerald-950 text-white" : "rounded-bl-md border bg-white text-slate-700")}><p className="whitespace-pre-wrap leading-6">{message.content}</p><div className="mt-1 flex justify-end gap-1 text-[10px] opacity-60">{new Date(message.createdAt).toLocaleString("vi-VN")}{mine && message.readAt && <CheckCheck className="size-3"/>}{message.deliveryStatus && ` · ${message.deliveryStatus === 'sending' ? 'Đang gửi' : 'Gửi lỗi'}`}</div></div>})}</div><form className="border-t p-4" onSubmit={submit}><Textarea value={content} onChange={event => setContent(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit() } }} placeholder="Nhập câu trả lời..."/><Button className="mt-3 w-full" disabled={busy || !content.trim() || session.conversation.status === 'closed'}><Send className="size-4"/>Gửi phản hồi</Button></form></>
}

function ContactPanel({ session, busy, onUpdate }: { session: SupportSession; busy: boolean; onUpdate: (body: { assignedTo?: "me"; status?: "open" | "closed" }) => void }) {
  const { conversation } = session; const contact = conversation.customer || conversation.contact
  return <div><h2 className="font-display text-xl font-bold text-emerald-950">Thông tin khách hàng</h2><div className="mt-5 space-y-3 text-sm"><p className="font-bold text-slate-800">{contact.name || "Khách truy cập"}</p>{contact.phone && <a className="flex items-center gap-2 text-emerald-800" href={`tel:${contact.phone}`}><Phone className="size-4"/>{contact.phone}</a>}{contact.email && <a className="flex items-center gap-2 text-emerald-800" href={`mailto:${contact.email}`}><Mail className="size-4"/>{contact.email}</a>}<p className="flex items-center gap-2 text-slate-500"><Clock3 className="size-4"/>Bắt đầu {new Date(conversation.createdAt).toLocaleString("vi-VN")}</p></div><div className="mt-6 space-y-2"><Button className="w-full" variant="outline" disabled={busy || Boolean(conversation.assignedTo)} onClick={() => onUpdate({ assignedTo: 'me' })}><UserCheck className="size-4"/>{conversation.assignedTo ? `Phụ trách: ${conversation.assignedTo.name}` : 'Nhận xử lý'}</Button>{conversation.status === 'open' ? <Button className="w-full" variant="destructive" disabled={busy} onClick={() => onUpdate({ status: 'closed' })}><XCircle className="size-4"/>Kết thúc hội thoại</Button> : <Button className="w-full" disabled={busy} onClick={() => onUpdate({ status: 'open' })}>Mở lại hội thoại</Button>}</div></div>
}
