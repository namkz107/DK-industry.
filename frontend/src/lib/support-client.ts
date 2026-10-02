import { authClient } from "@/lib/auth-client"
import type { SupportConversation, SupportMessage, SupportSession } from "@/types/support"

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api"
type Result<T> = { success: boolean; data: T; message?: string }

async function request<T>(path: string, options: RequestInit = {}) {
  if (authClient.accessToken()) return authClient.authenticated<T>(`/support${path}`, options)
  const headers = new Headers(options.headers)
  headers.set("Content-Type", "application/json")
  const response = await fetch(`${API_URL}/support${path}`, { ...options, credentials: "include", headers })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.message || "Không thể kết nối bộ phận hỗ trợ")
  return body as T
}

const json = (method: string, body?: unknown): RequestInit => ({ method, body: body === undefined ? undefined : JSON.stringify(body) })

export const supportClient = {
  session: () => request<Result<SupportSession | null>>("/session"),
  messages: (before?: string | null) => request<Result<{ items: SupportMessage[]; hasMore: boolean; nextCursor: string | null }>>(`/messages?limit=40${before ? `&before=${encodeURIComponent(before)}` : ""}`),
  send: (body: { content: string; clientMessageId: string; name?: string; phone?: string; email?: string }) => request<Result<{ conversation: SupportConversation; message: SupportMessage; socketToken?: string }>>("/messages", json("POST", body)),
  conversations: () => request<Result<SupportConversation[]>>("/conversations"),
  conversation: (id: string) => request<Result<SupportSession>>(`/conversations/${id}`),
  staffSend: (id: string, content: string, clientMessageId: string) => request<Result<SupportMessage>>(`/conversations/${id}/messages`, json("POST", { content, clientMessageId })),
  update: (id: string, body: { assignedTo?: "me"; status?: "open" | "closed" }) => request<Result<SupportConversation>>(`/conversations/${id}`, json("PATCH", body)),
}
