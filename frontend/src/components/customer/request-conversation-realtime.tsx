import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Check, CheckCheck, ChevronDown, Download, FileUp, LoaderCircle, MessageSquareText, Paperclip, Send, Wifi, WifiOff, X } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useRequestRealtime } from "@/hooks/use-request-realtime"
import { customerClient } from "@/lib/customer-client"
import { cn, formatPrice } from "@/lib/utils"
import type { Quotation, RequestDetail, RequestMessage } from "@/types/customer"

type DetailResult = { success: boolean; data: RequestDetail; message?: string }
const quoteStatuses: Record<string, string> = { sent: "Chờ phản hồi", accepted: "Đã chấp thuận", rejected: "Chưa chấp thuận", superseded: "Đã thay thế", expired: "Hết hiệu lực" }

function mergeMessage(messages: RequestMessage[], incoming: RequestMessage) {
  const values = messages.filter(item => item._id !== incoming._id && (!incoming.clientMessageId || item.clientMessageId !== incoming.clientMessageId))
  return [...values, incoming].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
}

export function RequestConversation({ requestId }: { requestId: string }) {
  const queryClient = useQueryClient()
  const fileInput = useRef<HTMLInputElement>(null)
  const messageList = useRef<HTMLDivElement>(null)
  const typingTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const [open, setOpen] = useState(false)
  const [content, setContent] = useState("")
  const [files, setFiles] = useState<File[]>([])
  const [error, setError] = useState("")
  const [rejecting, setRejecting] = useState<string>()
  const [rejectNote, setRejectNote] = useState("")
  const [loadingOlder, setLoadingOlder] = useState(false)
  const queryKey = ["customer", "request", requestId] as const
  const detail = useQuery({ queryKey, queryFn: () => customerClient.requestDetail(requestId), enabled: open })

  const updateDetail = (updater: (value: RequestDetail) => RequestDetail) => queryClient.setQueryData<DetailResult>(queryKey, current => current ? { ...current, data: updater(current.data) } : current)
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey })
    void queryClient.invalidateQueries({ queryKey: ["customer", "requests"] })
    void queryClient.invalidateQueries({ queryKey: ["customer", "summary"] })
  }
  const realtime = useRequestRealtime(requestId, open, {
    onMessage: message => updateDetail(value => ({ ...value, messages: mergeMessage(value.messages, message as RequestMessage) })),
    onRequestUpdated: refresh,
    onRead: (role, readAt) => updateDetail(value => ({ ...value, messages: value.messages.map(message => role === "staff" && message.senderRole === "customer" ? { ...message, readByStaffAt: readAt } : message) })),
    onSync: refresh,
  })

  const send = useMutation({
    mutationFn: ({ body }: { body: FormData; clientMessageId: string }) => customerClient.sendRequestMessage(requestId, body),
    onMutate: ({ body, clientMessageId }) => {
      const optimistic: RequestMessage = {
        _id: `pending:${clientMessageId}`, clientMessageId, senderRole: "customer", visibility: "customer",
        content: String(body.get("content") || "Khách hàng đã gửi thêm tệp đính kèm."),
        attachments: files.map((file, index) => ({ _id: `pending-file:${index}`, originalName: file.name, mimeType: file.type, size: file.size })),
        createdAt: new Date().toISOString(), deliveryStatus: "sending",
      }
      updateDetail(value => ({ ...value, messages: mergeMessage(value.messages, optimistic) }))
    },
    onSuccess: (result, variables) => {
      updateDetail(value => ({ ...value, messages: mergeMessage(value.messages.filter(item => item.clientMessageId !== variables.clientMessageId), result.data) }))
      setContent(""); setFiles([]); realtime.setTyping(false)
      if (fileInput.current) fileInput.current.value = ""
      void queryClient.invalidateQueries({ queryKey: ["customer", "requests"] })
    },
    onError: (_, variables) => updateDetail(value => ({ ...value, messages: value.messages.map(item => item.clientMessageId === variables.clientMessageId ? { ...item, deliveryStatus: "failed" } : item) })),
  })
  const respond = useMutation({
    mutationFn: ({ quote, decision, note }: { quote: Quotation; decision: "accepted" | "rejected"; note?: string }) => customerClient.respondQuotation(requestId, quote._id, decision, note),
    onSuccess: () => { setRejecting(undefined); setRejectNote(""); refresh() },
  })

  const messages = detail.data?.data.messages || []
  const latestSenderRole = messages.at(-1)?.senderRole
  useEffect(() => {
    const element = messageList.current
    if (!open || !element || !messages.length) return
    const nearBottom = element.scrollHeight - element.scrollTop - element.clientHeight < 180
    if (nearBottom || latestSenderRole === "customer") element.scrollTo({ top: element.scrollHeight, behavior: "smooth" })
  }, [messages.length, latestSenderRole, open])
  useEffect(() => () => clearTimeout(typingTimer.current), [])

  const changeContent = (value: string) => {
    setContent(value); realtime.setTyping(Boolean(value.trim())); clearTimeout(typingTimer.current)
    typingTimer.current = setTimeout(() => realtime.setTyping(false), 1_500)
  }
  const submitMessage = () => {
    setError("")
    if (!content.trim() && !files.length) return setError("Nhập nội dung hoặc chọn tệp đính kèm")
    if (files.length > 3 || files.some(file => file.size > 10 * 1024 * 1024)) return setError("Tối đa 3 tệp, mỗi tệp không quá 10MB")
    const clientMessageId = crypto.randomUUID()
    const body = new FormData(); body.append("clientMessageId", clientMessageId)
    if (content.trim()) body.append("content", content.trim())
    files.forEach(file => body.append("attachments", file))
    send.mutate({ body, clientMessageId })
  }
  const loadOlder = async () => {
    const page = detail.data?.data.messagePage
    if (!page?.hasMore || loadingOlder) return
    setLoadingOlder(true)
    try {
      const result = await customerClient.requestMessages(requestId, page.nextCursor)
      updateDetail(value => ({ ...value, messages: [...result.data.items, ...value.messages].filter((item, index, all) => all.findIndex(candidate => candidate._id === item._id) === index), messagePage: { hasMore: result.data.hasMore, nextCursor: result.data.nextCursor } }))
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Không thể tải tin nhắn cũ") }
    finally { setLoadingOlder(false) }
  }
  const download = async (message: RequestMessage, attachmentId: string, name: string) => {
    if (attachmentId.startsWith("pending-")) return
    try {
      const blob = await customerClient.downloadMessageAttachment(requestId, message._id, attachmentId)
      const url = URL.createObjectURL(blob); const anchor = document.createElement("a")
      anchor.href = url; anchor.download = name; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1_000)
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Không thể tải tệp") }
  }

  return <details className="group mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50" onToggle={event => setOpen(event.currentTarget.open)}>
    <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between px-4 font-bold text-emerald-950">
      <span className="flex items-center gap-2"><MessageSquareText className="size-5 text-orange-600"/>Trao đổi & báo giá</span>
      <span className="flex items-center gap-3">{open && <span className={cn("hidden items-center gap-1 text-xs font-semibold sm:flex", realtime.connected ? "text-emerald-700" : "text-slate-400")}>{realtime.connected ? <Wifi className="size-3.5"/> : <WifiOff className="size-3.5"/>}{realtime.connected ? "Trực tuyến" : "Đang kết nối"}</span>}<ChevronDown className="size-5 transition group-open:rotate-180"/></span>
    </summary>
    {open && <div className="border-t border-slate-200 p-4 sm:p-5">
      {detail.isLoading ? <div className="grid min-h-28 place-items-center"><LoaderCircle className="size-6 animate-spin text-orange-600"/></div> : detail.error ? <ErrorText text={detail.error.message}/> : <>
        {!!detail.data?.data.quotations.length && <div className="mb-6 space-y-4"><h4 className="font-display text-lg font-bold text-emerald-950">Báo giá</h4>{detail.data.data.quotations.map(quote => <QuoteCard key={quote._id} quote={quote} busy={respond.isPending} rejecting={rejecting} rejectNote={rejectNote} onRejecting={setRejecting} onRejectNote={setRejectNote} onRespond={(decision, note) => respond.mutate({ quote, decision, note })}/>)}</div>}
        <div><h4 className="font-display text-lg font-bold text-emerald-950">Trao đổi kỹ thuật</h4>
          <div ref={messageList} className="mt-3 max-h-[32rem] space-y-3 overflow-y-auto pr-1" aria-live="polite">
            {detail.data?.data.messagePage?.hasMore && <div className="text-center"><Button size="sm" variant="ghost" disabled={loadingOlder} onClick={() => void loadOlder()}>{loadingOlder && <LoaderCircle className="size-4 animate-spin"/>}Tải tin nhắn cũ</Button></div>}
            {messages.map((message, index) => <MessageBubble key={message._id} message={message} showRead={message.senderRole === "customer" && !messages.slice(index + 1).some(item => item.senderRole === "customer")} onDownload={download}/>) }
            {!messages.length && <p className="py-8 text-center text-sm text-slate-500">Chưa có nội dung trao đổi.</p>}
          </div><div className="h-6 pt-1 text-xs font-medium text-slate-500">{realtime.typingName && `${realtime.typingName} đang nhập...`}</div>
        </div>
        {!['rejected', 'cancelled'].includes(detail.data?.data.request.status || '') && <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <label className="sr-only" htmlFor={`message-${requestId}`}>Nội dung trao đổi</label>
          <Textarea id={`message-${requestId}`} className="min-h-24 border-0 px-0 shadow-none focus-visible:ring-0" value={content} onChange={event => changeContent(event.target.value)} onBlur={() => realtime.setTyping(false)} onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); submitMessage() } }} placeholder="Bổ sung dung sai, vật liệu, tiến độ... (Enter để gửi, Shift+Enter để xuống dòng)"/>
          {!!files.length && <div className="mb-3 flex flex-wrap gap-2">{files.map((file, index) => <span key={`${file.name}-${index}`} className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600"><Paperclip className="size-3"/>{file.name}<button type="button" aria-label={`Bỏ ${file.name}`} onClick={() => setFiles(current => current.filter((_, itemIndex) => itemIndex !== index))}><X className="size-3.5"/></button></span>)}</div>}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3"><label className="flex min-h-10 cursor-pointer items-center gap-2 text-sm font-bold text-slate-600 hover:text-orange-700"><FileUp className="size-5"/><span>Đính kèm bản vẽ</span><input ref={fileInput} className="sr-only" type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.dxf,.dwg,.step,.stp,.iges,.igs,.zip" onChange={event => setFiles(Array.from(event.target.files || []))}/></label><Button disabled={send.isPending || (!content.trim() && !files.length)} onClick={submitMessage}>{send.isPending ? <LoaderCircle className="size-5 animate-spin"/> : <Send className="size-5"/>}Gửi</Button></div>
        </div>}
        {(error || send.error || respond.error) && <ErrorText text={error || send.error?.message || respond.error?.message || "Có lỗi xảy ra"}/>} 
      </>}
    </div>}
  </details>
}

function MessageBubble({ message, showRead, onDownload }: { message: RequestMessage; showRead: boolean; onDownload: (message: RequestMessage, attachmentId: string, name: string) => void }) {
  const mine = message.senderRole === "customer"
  return <article className={cn("max-w-[92%] rounded-2xl px-4 py-3 text-sm", mine ? "ml-auto rounded-br-md bg-emerald-950 text-white" : "rounded-bl-md border border-slate-200 bg-white text-slate-700 shadow-sm", message.deliveryStatus === "failed" && "ring-2 ring-red-300")}>
    <p className="mb-1 text-[11px] font-black uppercase tracking-wider opacity-60">{mine ? "Bạn" : message.senderRole === "system" ? "Hệ thống" : "Cơ khí Đăng Khoa"}</p><p className="whitespace-pre-wrap leading-6">{message.content}</p>
    {!!message.attachments?.length && <div className="mt-3 flex flex-wrap gap-2">{message.attachments.map(file => <button className={cn("inline-flex min-h-9 items-center gap-2 rounded-lg px-3 text-xs font-bold", mine ? "bg-white/15" : "bg-slate-100 text-orange-700")} key={file._id} onClick={() => onDownload(message, file._id, file.originalName)}><Download className="size-4"/>{file.originalName}</button>)}</div>}
    <div className="mt-2 flex items-center justify-end gap-1 text-[11px] opacity-60"><time>{dateTime(message.createdAt)}</time>{message.deliveryStatus === "sending" && <span>· Đang gửi</span>}{message.deliveryStatus === "failed" && <span className="text-red-200">· Gửi lỗi</span>}{showRead && !message.deliveryStatus && (message.readByStaffAt ? <CheckCheck className="size-3.5" aria-label="Đã xem"/> : <Check className="size-3.5" aria-label="Đã gửi"/>)}</div>
  </article>
}

function QuoteCard({ quote, busy, rejecting, rejectNote, onRejecting, onRejectNote, onRespond }: { quote: Quotation; busy: boolean; rejecting?: string; rejectNote: string; onRejecting: (value?: string) => void; onRejectNote: (value: string) => void; onRespond: (decision: "accepted" | "rejected", note?: string) => void }) {
  return <article className="overflow-hidden rounded-2xl border border-orange-200 bg-white"><div className="flex flex-wrap items-center justify-between gap-3 bg-orange-50 px-4 py-3"><div><strong className="text-emerald-950">{quote.code} · Lần {quote.version}</strong><p className="mt-1 text-xs text-slate-500">Hiệu lực đến {date(quote.validUntil)}</p></div><span className="rounded-full bg-white px-3 py-1 text-xs font-black text-orange-800">{quoteStatuses[quote.status] || quote.status}</span></div><div className="p-4">
    <div className="overflow-x-auto"><table className="w-full min-w-[520px] text-left text-sm"><thead className="text-slate-500"><tr><th className="pb-2">Hạng mục</th><th className="pb-2 text-right">SL</th><th className="pb-2 text-right">Đơn giá</th><th className="pb-2 text-right">Thành tiền</th></tr></thead><tbody>{quote.items.map(item => <tr className="border-t border-slate-100" key={item._id}><td className="py-3 font-semibold text-slate-800">{item.description}</td><td className="py-3 text-right">{item.quantity} {item.unit}</td><td className="py-3 text-right">{formatPrice(item.unitPrice)}</td><td className="py-3 text-right font-bold">{formatPrice(item.lineTotal)}</td></tr>)}</tbody></table></div>
    <div className="ml-auto mt-4 max-w-sm space-y-2 border-t border-slate-200 pt-3 text-sm"><p className="flex justify-between"><span>Tạm tính</span><strong>{formatPrice(quote.subtotal)}</strong></p><p className="flex justify-between"><span>VAT ({quote.taxRate}%)</span><strong>{formatPrice(quote.taxAmount)}</strong></p><p className="flex justify-between text-lg text-orange-700"><span className="font-bold">Tổng cộng</span><strong>{formatPrice(quote.total)}</strong></p></div>
    {quote.leadTime && <p className="mt-4 text-sm text-slate-600"><strong>Tiến độ:</strong> {quote.leadTime}</p>}{quote.paymentTerms && <p className="mt-2 text-sm text-slate-600"><strong>Thanh toán:</strong> {quote.paymentTerms}</p>}{quote.notes && <p className="mt-2 text-sm text-slate-600"><strong>Ghi chú:</strong> {quote.notes}</p>}
    {quote.status === "sent" && <div className="mt-5 border-t border-slate-100 pt-4">{rejecting === quote._id ? <div><Textarea value={rejectNote} onChange={event => onRejectNote(event.target.value)} placeholder="Điểm cần điều chỉnh về giá, tiến độ hoặc phạm vi..."/><div className="mt-3 flex flex-wrap gap-2"><Button disabled={!rejectNote.trim() || busy} onClick={() => onRespond("rejected", rejectNote)}><Send className="size-4"/>Gửi phản hồi</Button><Button variant="ghost" onClick={() => onRejecting(undefined)}>Quay lại</Button></div></div> : <div className="flex flex-wrap gap-2"><Button disabled={busy} onClick={() => { if (window.confirm(`Chấp thuận báo giá ${quote.code}?`)) onRespond("accepted") }}><Check className="size-5"/>Chấp thuận báo giá</Button><Button variant="outline" disabled={busy} onClick={() => onRejecting(quote._id)}><X className="size-5"/>Yêu cầu điều chỉnh</Button></div>}</div>}
  </div></article>
}

const date = (value: string) => new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(new Date(value))
const dateTime = (value: string) => new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(new Date(value))
function ErrorText({ text }: { text: string }) { return <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{text}</p> }
