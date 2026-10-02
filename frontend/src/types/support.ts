export interface SupportMessage {
  _id: string
  conversation: string
  sender?: { _id: string; name: string; role: string }
  senderRole: "guest" | "customer" | "staff" | "admin" | "system"
  clientMessageId?: string
  content: string
  readAt?: string
  createdAt: string
  deliveryStatus?: "sending" | "failed"
}

export interface SupportConversation {
  _id: string
  customer?: { _id: string; name: string; email: string; phone?: string; company?: string }
  contact: { name?: string; phone?: string; email?: string }
  assignedTo?: { _id: string; name: string; email: string }
  status: "open" | "closed"
  lastMessageAt: string
  lastMessagePreview?: string
  unreadByCustomer: number
  unreadByStaff: number
  createdAt: string
}

export interface SupportSession {
  conversation: SupportConversation
  messages: SupportMessage[]
  page: { hasMore: boolean; nextCursor: string | null }
  socketToken?: string
}
