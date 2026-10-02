import { useCallback, useEffect, useRef, useState } from "react"
import { chatSocket, connectChatSocket, releaseChatSocket } from "@/lib/chat-socket"

export interface RealtimeMessage {
  _id: string
  request: string
  clientMessageId?: string
  sender?: { _id: string; name: string; role: string } | string
  senderRole: "customer" | "staff" | "admin" | "system"
  visibility: "customer" | "internal"
  content: string
  attachments: Array<{ _id: string; originalName: string; mimeType?: string; size?: number }>
  readByCustomerAt?: string
  readByStaffAt?: string
  createdAt: string
}

interface Handlers {
  onMessage: (message: RealtimeMessage) => void
  onRequestUpdated: () => void
  onRead: (readerRole: "customer" | "staff", readAt: string) => void
  onSync: () => void
  onInboxUpdated?: (requestId: string) => void
}

export function useRequestRealtime(requestId: string, enabled: boolean, handlers: Handlers) {
  const handlersRef = useRef(handlers)
  const [connected, setConnected] = useState(chatSocket.connected)
  const [typingName, setTypingName] = useState("")
  const typingTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const typingSent = useRef(false)
  handlersRef.current = handlers

  useEffect(() => {
    if (!enabled || !requestId) return
    const socket = connectChatSocket()
    const join = () => {
      socket.emit("request:join", requestId, (result: { ok: boolean }) => {
        if (result.ok) {
          socket.emit("message:read", requestId)
          if (!socket.recovered) handlersRef.current.onSync()
        }
      })
    }
    const onConnect = () => { setConnected(true); join() }
    const onDisconnect = () => setConnected(false)
    const onMessage = (payload: { requestId: string; message: RealtimeMessage }) => {
      if (payload.requestId !== requestId) return
      handlersRef.current.onMessage(payload.message)
      socket.emit("message:read", requestId)
    }
    const onUpdated = (payload: { requestId: string }) => {
      if (payload.requestId === requestId) handlersRef.current.onRequestUpdated()
    }
    const onRead = (payload: { requestId: string; readerRole: "customer" | "staff"; readAt: string }) => {
      if (payload.requestId === requestId) handlersRef.current.onRead(payload.readerRole, payload.readAt)
    }
    const onInboxUpdated = (payload: { requestId: string }) => handlersRef.current.onInboxUpdated?.(payload.requestId)
    const onTyping = (payload: { requestId: string; name: string }) => {
      if (payload.requestId !== requestId) return
      setTypingName(payload.name)
      clearTimeout(typingTimer.current)
      typingTimer.current = setTimeout(() => setTypingName(""), 2_500)
    }
    const onTypingStop = (payload: { requestId: string }) => {
      if (payload.requestId === requestId) setTypingName("")
    }

    socket.on("connect", onConnect)
    socket.on("disconnect", onDisconnect)
    socket.on("message:new", onMessage)
    socket.on("request:updated", onUpdated)
    socket.on("message:read", onRead)
    socket.on("inbox:updated", onInboxUpdated)
    socket.on("typing:start", onTyping)
    socket.on("typing:stop", onTypingStop)
    if (socket.connected) join()

    return () => {
      clearTimeout(typingTimer.current)
      if (typingSent.current) socket.emit("typing:stop", requestId)
      typingSent.current = false
      socket.emit("request:leave", requestId)
      socket.off("connect", onConnect)
      socket.off("disconnect", onDisconnect)
      socket.off("message:new", onMessage)
      socket.off("request:updated", onUpdated)
      socket.off("message:read", onRead)
      socket.off("inbox:updated", onInboxUpdated)
      socket.off("typing:start", onTyping)
      socket.off("typing:stop", onTypingStop)
      releaseChatSocket()
    }
  }, [enabled, requestId])

  const setTyping = useCallback((value: boolean) => {
    if (!enabled || typingSent.current === value) return
    typingSent.current = value
    if (chatSocket.connected) chatSocket.emit(value ? "typing:start" : "typing:stop", requestId)
  }, [enabled, requestId])

  return { connected, typingName, setTyping }
}
