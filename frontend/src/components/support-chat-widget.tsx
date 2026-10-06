import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Bot, CheckCheck, Headphones, LoaderCircle, MessageCircleMore, Minus, Send, X } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react"
import { useAuth } from "@/contexts/auth-context"
import { supportClient } from "@/lib/support-client"
import { acquireSupportSocket, releaseSupportSocket, storeSupportSocketToken, supportSocket } from "@/lib/support-socket"
import { cn } from "@/lib/utils"
import type { SupportMessage, SupportSession } from "@/types/support"

type SessionResult = { success: boolean; data: SupportSession | null; message?: string }
type SendVariables = { content: string; clientMessageId: string }

function merge(messages: SupportMessage[], incoming: SupportMessage) {
  const values = messages.filter(item => item._id !== incoming._id && (!incoming.clientMessageId || item.clientMessageId !== incoming.clientMessageId))
  return [...values, incoming].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
}

export function SupportChatWidget() {
  const { user, ready } = useAuth()
  const client = useQueryClient()
  const listRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [content, setContent] = useState("")
  const [liveUnread, setLiveUnread] = useState(0)
  const [aiStatus, setAiStatus] = useState<"idle" | "thinking" | "handoff">("idle")
  const [guestMessages, setGuestMessages] = useState<SupportMessage[]>([])
  const [loadingOlder, setLoadingOlder] = useState(false)
  const session = useQuery({ queryKey: ["support", "session", user?.id || "guest"], queryFn: supportClient.session, enabled: ready && user?.role === 'customer', staleTime: 30_000, meta: { suppressGlobalLoading: true } })
  const queryKey = useMemo(() => ["support", "session", user?.id || "guest"] as const, [user?.id])
  const conversationId = session.data?.data?.conversation._id
  const messages = user?.role === 'customer' ? (session.data?.data?.messages || []) : guestMessages
  const unread = open ? 0 : Math.max(liveUnread, session.data?.data?.conversation.unreadByCustomer || 0)

  const updateSession = useCallback((updater: (value: SupportSession) => SupportSession) => client.setQueryData<SessionResult>(queryKey, current => current?.data ? { ...current, data: updater(current.data) } : current), [client, queryKey])

  useEffect(() => { setGuestMessages([]); setAiStatus('idle') }, [user?.id])
  useEffect(() => {
    if (ready && !user) void supportClient.clearGuestSession().catch(() => undefined)
  }, [ready, user])
  useEffect(() => { storeSupportSocketToken(session.data?.data?.socketToken) }, [session.data?.data?.socketToken])
  useEffect(() => {
    if (!conversationId) return
    const socket = acquireSupportSocket()
    const join = () => socket.emit("support:join", conversationId, (result: { ok: boolean }) => { if (result.ok && open) socket.emit("support:read", conversationId) })
    const onMessage = (payload: { conversationId: string; message: SupportMessage }) => {
      if (payload.conversationId !== conversationId) return
      updateSession(value => ({ ...value, messages: merge(value.messages, payload.message) }))
      if (payload.message.senderRole === 'system' && payload.message.ai) setAiStatus(payload.message.ai.needsHuman ? 'handoff' : 'idle')
      const fromStaff = ['staff', 'admin', 'system'].includes(payload.message.senderRole)
      if (fromStaff && !open) setLiveUnread(value => value + 1)
      if (open) socket.emit("support:read", conversationId)
    }
    const onRead = (payload: { conversationId: string; reader: string; readAt: string }) => {
      if (payload.conversationId !== conversationId || payload.reader !== 'staff') return
      updateSession(value => ({ ...value, messages: value.messages.map(message => ['guest', 'customer'].includes(message.senderRole) ? { ...message, readAt: payload.readAt } : message) }))
    }
    const onAiStatus = (payload: { conversationId: string; status: "idle" | "thinking" | "handoff" }) => {
      if (payload.conversationId === conversationId) setAiStatus(payload.status)
    }
    socket.on("connect", join); socket.on("support:message", onMessage); socket.on("support:read", onRead); socket.on("support:ai-status", onAiStatus)
    if (socket.connected) join()
    return () => { socket.off("connect", join); socket.off("support:message", onMessage); socket.off("support:read", onRead); socket.off("support:ai-status", onAiStatus); releaseSupportSocket() }
  }, [conversationId, open, updateSession])

  useEffect(() => {
    if (!open) return
    setLiveUnread(0)
    updateSession(value => ({ ...value, conversation: { ...value.conversation, unreadByCustomer: 0 } }))
    if (conversationId) supportSocket.emit("support:read", conversationId)
    const timer = setTimeout(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" }), 50)
    return () => clearTimeout(timer)
  }, [open, conversationId, messages.length, updateSession])

  const send = useMutation({
    mutationKey: ['support', 'send'],
    meta: { suppressGlobalLoading: true },
    mutationFn: async (variables: SendVariables) => {
      if (!user) {
        const result = await supportClient.guestAi({ content: variables.content, history: guestMessages.map(({ senderRole, content: messageContent }) => ({ senderRole, content: messageContent })) })
        return { mode: 'guest' as const, result }
      }
      return { mode: 'customer' as const, result: await supportClient.send(variables) }
    },
    onMutate: variables => {
      setContent("")
      if (!user) {
        setGuestMessages(value => merge(value, { _id: `pending:${variables.clientMessageId}`, conversation: 'guest-session', senderRole: 'guest', clientMessageId: variables.clientMessageId, content: variables.content, createdAt: new Date().toISOString() }))
        setAiStatus('thinking')
        return
      }
      if (!conversationId) return
      updateSession(value => ({ ...value, messages: merge(value.messages, { _id: `pending:${variables.clientMessageId}`, conversation: conversationId, senderRole: "customer", clientMessageId: variables.clientMessageId, content: variables.content, createdAt: new Date().toISOString(), deliveryStatus: "sending" }) }))
    },
    onSuccess: (response, variables) => {
      if (response.mode === 'guest') {
        const now = new Date().toISOString()
        const sent: SupportMessage = { _id: `guest:${variables.clientMessageId}`, conversation: 'guest-session', senderRole: 'guest', clientMessageId: variables.clientMessageId, content: variables.content, createdAt: now }
        const ai: SupportMessage = { _id: `ai:${variables.clientMessageId}`, conversation: 'guest-session', senderRole: 'system', content: response.result.data.answer, createdAt: new Date().toISOString(), ai: { provider: response.result.data.fallback ? 'fallback' : 'groq', needsHuman: response.result.data.needsHuman, reason: response.result.data.reason } }
        setGuestMessages(value => merge(merge(value.filter(item => item.clientMessageId !== variables.clientMessageId), sent), ai))
        setAiStatus(response.result.data.needsHuman ? 'handoff' : 'idle')
        return
      }
      const result = response.result
      storeSupportSocketToken(result.data.socketToken)
      const current = client.getQueryData<SessionResult>(queryKey)?.data
      client.setQueryData<SessionResult>(queryKey, { success: true, data: { conversation: result.data.conversation, messages: merge((current?.messages || []).filter(item => item.clientMessageId !== variables.clientMessageId), result.data.message), page: current?.page || { hasMore: false, nextCursor: null }, socketToken: result.data.socketToken || current?.socketToken } })
      setAiStatus("thinking")
      window.setTimeout(async () => {
        await client.invalidateQueries({ queryKey })
        const refreshed = client.getQueryData<SessionResult>(queryKey)?.data
        const latest = refreshed?.messages.at(-1)
        if (latest?.senderRole === 'system' && latest.ai) setAiStatus(latest.ai.needsHuman ? 'handoff' : 'idle')
      }, 2500)
    },
    onError: (_, variables) => {
      if (!user) {
        setGuestMessages(value => value.map(item => item.clientMessageId === variables.clientMessageId ? { ...item, deliveryStatus: "failed" } : item))
        setContent(current => current || variables.content)
        setAiStatus('idle')
        return
      }
      updateSession(value => ({ ...value, messages: value.messages.map(item => item.clientMessageId === variables.clientMessageId ? { ...item, deliveryStatus: "failed" } : item) }))
      setContent(current => current || variables.content)
    },
  })

  if (!ready || ['staff', 'admin'].includes(user?.role || '')) return null
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!content.trim()) return
    send.mutate({ content: content.trim(), clientMessageId: crypto.randomUUID() })
  }
  const loadOlder = async () => {
    const page = session.data?.data?.page
    if (!page?.hasMore || loadingOlder) return
    setLoadingOlder(true)
    try {
      const result = await supportClient.messages(page.nextCursor)
      updateSession(value => ({ ...value, messages: [...result.data.items, ...value.messages].filter((item, index, all) => all.findIndex(candidate => candidate._id === item._id) === index), page: { hasMore: result.data.hasMore, nextCursor: result.data.nextCursor } }))
    } finally { setLoadingOlder(false) }
  }

  return <div className="fixed bottom-4 right-3 z-[60] sm:bottom-6 sm:right-6">
    {open && <section role="dialog" aria-label="Hỗ trợ khách hàng" className="mb-3 flex h-[min(620px,calc(100vh-7rem))] w-[min(390px,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-950/25">
      <header className="flex items-center justify-between bg-[#16466f] px-4 py-3.5 text-white">
        <div className="flex min-w-0 items-center gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-full bg-white/15"><Headphones className="size-5"/></span><div className="min-w-0"><strong className="block truncate">Chăm sóc khách hàng</strong><span className="block text-xs text-blue-100">Tư vấn sản phẩm & gia công</span></div></div>
        <div className="flex"><button className="grid size-9 place-items-center rounded-full hover:bg-white/10" onClick={() => setOpen(false)} aria-label="Thu nhỏ"><Minus className="size-5"/></button><button className="grid size-9 place-items-center rounded-full hover:bg-white/10" onClick={() => setOpen(false)} aria-label="Đóng"><X className="size-4"/></button></div>
      </header>
      <div ref={listRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4" aria-live="polite">
        <div className="w-fit max-w-[88%] rounded-2xl rounded-bl-md border border-slate-200 bg-white px-3 py-2.5 text-sm leading-5 text-slate-700 shadow-sm">Xin chào! CTY CPTV ĐẦU TƯ XD TM ĐĂNG KHOA có thể hỗ trợ gì cho bạn?</div>
        {user?.role === 'customer' && session.data?.data?.page.hasMore && <button className="mx-auto block rounded-lg px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-50" disabled={loadingOlder} onClick={() => void loadOlder()}>{loadingOlder ? "Đang tải..." : "Tải tin nhắn cũ"}</button>}
        {messages.map(message => <SupportBubble key={message._id} message={message}/>) }
        {aiStatus === "thinking" && <div className="flex w-fit max-w-[88%] items-center gap-2 rounded-2xl rounded-bl-md border border-blue-100 bg-white px-3 py-2 text-xs font-semibold text-blue-700 shadow-sm"><LoaderCircle className="size-4 animate-spin"/>Trợ lý AI đang soạn câu trả lời...</div>}
        {aiStatus === "handoff" && <p className="px-2 text-center text-xs text-amber-700">{user ? 'Yêu cầu cần xác nhận thêm và đã được chuyển tới nhân viên.' : 'Nội dung này cần nhân viên xác nhận. Bạn có thể đăng nhập hoặc liên hệ hotline để được hỗ trợ.'}</p>}
        {user?.role === 'customer' && session.isLoading && <div className="grid place-items-center py-8"><LoaderCircle className="size-6 animate-spin text-blue-600"/></div>}
      </div>
      <form className="border-t border-slate-200 bg-white p-3" onSubmit={submit}>
        {user?.role === 'customer' && session.error && <p className="mb-2 rounded-lg bg-red-50 p-2 text-xs font-semibold text-red-700">{session.error.message}</p>}
        {send.error && <p className="mb-2 rounded-lg bg-red-50 p-2 text-xs font-semibold text-red-700">{send.error.message}</p>}
        <div className="flex items-end gap-2"><textarea className="max-h-28 min-h-11 flex-1 resize-none rounded-2xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" value={content} onChange={event => setContent(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit() } }} placeholder="Nhập tin nhắn..." rows={1}/><button className="grid size-11 shrink-0 place-items-center rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 disabled:opacity-50" disabled={send.isPending || !content.trim()} aria-label="Gửi tin nhắn">{send.isPending ? <LoaderCircle className="size-5 animate-spin"/> : <Send className="size-5"/>}</button></div>
        <p className="mt-2 text-center text-[10px] text-slate-400">{user ? 'Hội thoại được lưu trong tài khoản của bạn.' : 'Phiên Guest chỉ tồn tại trên trang này và sẽ mất khi tải lại.'}</p>
      </form>
    </section>}
    <button onClick={() => setOpen(value => !value)} className={cn("ml-auto flex min-h-14 items-center gap-2 rounded-full bg-blue-600 px-5 font-bold text-white shadow-xl shadow-blue-950/25 transition hover:-translate-y-0.5 hover:bg-blue-700", open && "px-4")} aria-expanded={open} aria-label="Mở hỗ trợ khách hàng">
      <span className="relative grid size-8 place-items-center rounded-full bg-white text-blue-600"><Headphones className="size-5"/>{unread > 0 && <span className="absolute -right-2 -top-2 grid min-h-5 min-w-5 place-items-center rounded-full bg-red-600 px-1 text-[10px] text-white">{Math.min(unread, 99)}</span>}</span>{!open && <span>Chăm sóc khách hàng</span>}{open && <MessageCircleMore className="size-5"/>}
    </button>
  </div>
}

function SupportBubble({ message }: { message: SupportMessage }) {
  const mine = ['guest', 'customer'].includes(message.senderRole)
  const fromAi = message.senderRole === 'system' && Boolean(message.ai)
  return <div className={cn("w-fit min-w-0 max-w-[82%] rounded-2xl px-3 py-2 text-sm leading-5 shadow-sm [overflow-wrap:anywhere]", mine ? "ml-auto rounded-br-md bg-blue-600 text-white" : "rounded-bl-md border border-slate-200 bg-white text-slate-700", message.deliveryStatus === 'failed' && "ring-2 ring-red-300")}>
    {fromAi && <p className="mb-1 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-blue-700"><Bot className="size-3.5"/>Trợ lý AI</p>}
    <p className="whitespace-pre-wrap">{message.content}</p><div className="mt-1 flex items-center justify-end gap-1 text-[10px] opacity-65"><span>{new Date(message.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</span>{message.deliveryStatus === 'sending' && <span>· Đang gửi</span>}{message.deliveryStatus === 'failed' && <span>· Gửi lỗi</span>}{mine && message.readAt && <CheckCheck className="size-3"/>}</div></div>
}
