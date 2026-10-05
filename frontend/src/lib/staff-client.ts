import { authClient } from "@/lib/auth-client"
import type { LeadStatus, Paged, Priority, RequestStatus, StaffDashboard, StaffLead, StaffMember, StaffMessage, StaffOrder, StaffQuotation, StaffRequest, StaffRequestDetail, StaffWorkOrder, WorkOrderStatus } from "@/types/staff"

type Result<T> = { success: boolean; data: T; message?: string }
const json = (method: string, body?: unknown): RequestInit => ({ method, body: body === undefined ? undefined : JSON.stringify(body) })
const query = (values: Record<string, string | number | undefined>) => new URLSearchParams(Object.entries(values).filter(([, value]) => value !== undefined && value !== "").map(([key, value]) => [key, String(value)])).toString()

export const staffClient = {
  dashboard: () => authClient.authenticated<Result<StaffDashboard>>("/staff/dashboard"),
  members: () => authClient.authenticated<Result<StaffMember[]>>("/staff/members"),
  leads: (filters: { q?: string; status?: string; priority?: string; assigned?: string; page?: number } = {}) => authClient.authenticated<Result<Paged<StaffLead>>>(`/staff/leads?${query(filters)}`),
  lead: (id: string) => authClient.authenticated<Result<StaffLead>>(`/staff/leads/${id}`),
  updateLead: (id: string, body: { status?: LeadStatus; priority?: Priority; assignedTo?: string; nextFollowUpAt?: string; message?: string; lostReason?: string }) => authClient.authenticated<Result<StaffLead>>(`/staff/leads/${id}`, json("PATCH", body)),
  addLeadNote: (id: string, content: string) => authClient.authenticated<Result<unknown>>(`/staff/leads/${id}/notes`, json("POST", { content })),
  convertLead: (id: string) => authClient.authenticated<Result<{ leadId: string; requestId: string; requestCode: string; customerId: string }>>(`/staff/leads/${id}/convert`, { method: "POST" }),
  requests: (filters: { q?: string; status?: string; priority?: string; assigned?: string; page?: number } = {}) => authClient.authenticated<Result<Paged<StaffRequest>>>(`/staff/requests?${query(filters)}`),
  request: (id: string) => authClient.authenticated<Result<StaffRequestDetail>>(`/staff/requests/${id}`),
  requestMessages: (id: string, before?: string | null) => authClient.authenticated<Result<{ items: StaffMessage[]; hasMore: boolean; nextCursor: string | null }>>(`/staff/requests/${id}/messages?limit=50${before ? `&before=${encodeURIComponent(before)}` : ""}`),
  updateRequest: (id: string, body: { status?: RequestStatus; priority?: Priority; assignedTo?: string; internalSummary?: string; message?: string; visibility?: "customer" | "internal" }) => authClient.authenticated<Result<StaffRequest>>(`/staff/requests/${id}`, json("PATCH", body)),
  sendMessage: (id: string, content: string, visibility: "customer" | "internal", clientMessageId: string) => authClient.authenticated<Result<StaffMessage>>(`/staff/requests/${id}/messages`, json("POST", { content, visibility, clientMessageId })),
  createQuotation: (id: string, body: { items: Array<{ description: string; quantity: number; unit: string; unitPrice: number }>; taxRate: number; validUntil: string; leadTime: string; paymentTerms: string; notes: string; status: "draft" | "sent" }) => authClient.authenticated<Result<StaffQuotation>>(`/staff/requests/${id}/quotations`, json("POST", body)),
  sendQuotation: (requestId: string, quotationId: string) => authClient.authenticated<Result<StaffQuotation>>(`/staff/requests/${requestId}/quotations/${quotationId}/send`, { method: "PATCH" }),
  downloadAttachment: (requestId: string, attachmentId: string) => authClient.download(`/staff/requests/${requestId}/attachments/${attachmentId}`),
  downloadMessageAttachment: (requestId: string, messageId: string, attachmentId: string) => authClient.download(`/staff/requests/${requestId}/messages/${messageId}/attachments/${attachmentId}`),
  workOrders: (filters: { q?: string; status?: string; assigned?: string; page?: number } = {}) => authClient.authenticated<Result<Paged<StaffWorkOrder>>>(`/staff/work-orders?${query(filters)}`),
  workOrder: (id: string) => authClient.authenticated<Result<StaffWorkOrder>>(`/staff/work-orders/${id}`),
  updateWorkOrder: (id: string, body: { status?: WorkOrderStatus; assignedTo?: string; contractReference?: string; purchaseOrderReference?: string; depositRequired?: number; depositPaid?: number; plannedStartAt?: string; plannedDeliveryAt?: string; message?: string }) => authClient.authenticated<Result<StaffWorkOrder>>(`/staff/work-orders/${id}`, json("PATCH", body)),
  orders: (filters: { q?: string; status?: string; paymentStatus?: string; assigned?: string; page?: number } = {}) => authClient.authenticated<Result<Paged<StaffOrder>>>(`/staff/orders?${query(filters)}`),
  order: (id: string) => authClient.authenticated<Result<StaffOrder>>(`/staff/orders/${id}`),
  updateOrder: (id: string, body: { status?: StaffOrder["status"]; paymentStatus?: StaffOrder["paymentStatus"]; assignedTo?: string; internalNote?: string; message?: string; paymentMessage?: string; amountPaid?: number; paymentReference?: string; shippingFee?: number; shippingProvider?: string; trackingCode?: string; estimatedDeliveryAt?: string }) => authClient.authenticated<Result<StaffOrder>>(`/staff/orders/${id}`, json("PATCH", body)),
  updateAfterSales: (orderId: string, requestId: string, body: { status: string; resolution?: string }) => authClient.authenticated<Result<StaffOrder>>(`/staff/orders/${orderId}/after-sales/${requestId}`, json("PATCH", body)),
}
