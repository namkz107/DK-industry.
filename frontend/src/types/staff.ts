export type Priority = "low" | "normal" | "high" | "urgent"
export type LeadStatus = "new" | "qualified" | "contacted" | "needs_analysis" | "quoted" | "won" | "lost" | "spam"
export type RequestStatus = "submitted" | "reviewing" | "need_more_info" | "quoted" | "accepted" | "rejected" | "cancelled"
export type OrderStatus = "pending" | "confirmed" | "preparing" | "shipping" | "delivered" | "cancelled"
export type PaymentStatus = "unpaid" | "pending" | "paid" | "refund_pending" | "refunded"

export interface StaffMember { _id: string; name: string; email: string; role: "staff" | "admin" }
export interface StaffDashboard { newLeads: number; myLeads: number; openRequests: number; myRequests: number; unreadCustomers: number; urgent: number; pendingOrders: number; myOrders: number }
export interface StaffLead {
  _id: string; code: string; name: string; phone: string; email?: string; company?: string; serviceType?: string; budget?: string; message?: string
  source: string; priority: Priority; status: LeadStatus; assignedTo?: StaffMember | null; nextFollowUpAt?: string; lostReason?: string; createdAt: string
  convertedCustomer?: string; convertedRequest?: string
  notes?: Array<{ _id: string; content: string; author?: StaffMember; createdAt: string }>
  timeline?: Array<{ _id: string; action: string; fromStatus?: string; toStatus?: string; message?: string; actor?: StaffMember; at: string }>
}
export interface StaffRequest {
  _id: string; code: string; title: string; description: string; requestType: string; material?: string; quantity?: number; dimensions?: string; budget?: string
  priority: Priority; status: RequestStatus; assignedTo?: StaffMember | null; customer: { _id: string; name: string; email: string; phone?: string; company?: string }
  contact: { name?: string; phone?: string; email?: string; company?: string }; internalSummary?: string; createdAt: string
  attachments: Array<{ _id: string; originalName: string; mimeType?: string; size?: number }>
}
export interface StaffMessage { _id: string; sender?: StaffMember; senderRole: string; visibility: "customer" | "internal"; content: string; createdAt: string; attachments: Array<{ _id: string; originalName: string }> }
export interface StaffQuotation { _id: string; code: string; version: number; status: string; subtotal: number; taxRate: number; taxAmount: number; total: number; validUntil: string; createdAt: string; items: Array<{ description: string; quantity: number; unit: string; unitPrice: number; lineTotal: number }> }
export interface StaffRequestDetail { request: StaffRequest; messages: StaffMessage[]; quotations: StaffQuotation[] }
export interface Paged<T> { items: T[]; total: number; page: number; pages: number }
export interface StaffOrder {
  _id: string; code: string; status: OrderStatus; paymentStatus: PaymentStatus; paymentMethod: "cod" | "bank_transfer"
  customer: { _id: string; name: string; email: string; phone?: string; company?: string }; assignedTo?: StaffMember | null; internalNote?: string; customerNote?: string
  items: Array<{ _id: string; name: string; sku?: string; unit?: string; price: number; quantity: number; lineTotal: number }>; subtotal: number; shippingFee: number; total: number; amountPaid?: number; paymentReference?: string; paymentLockedAt?: string
  shippingAddress: { recipientName: string; phone: string; addressLine: string; ward?: string; district: string; province: string; formattedAddress?: string; placeId?: string; latitude?: number; longitude?: number; accuracyMeters?: number; locationConfirmed?: boolean }
  timeline: Array<{ _id: string; status: string; message?: string; at: string; actor?: StaffMember }>; createdAt: string
  paymentTimeline: Array<{ _id: string; status: PaymentStatus; message?: string; at: string; actor?: StaffMember }>
  shippingProvider?: string; trackingCode?: string; estimatedDeliveryAt?: string; cancellationReason?: string
  afterSalesRequests?: Array<{ _id: string; type: "return" | "warranty" | "complaint"; reason: string; status: "submitted" | "reviewing" | "approved" | "rejected" | "received" | "resolved"; resolution?: string; submittedAt: string }>
  confirmedAt?: string; preparingAt?: string; shippedAt?: string; deliveredAt?: string; cancelledAt?: string; paidAt?: string; refundedAt?: string
}
export type WorkOrderStatus = "awaiting_contract" | "awaiting_deposit" | "scheduled" | "in_progress" | "quality_check" | "ready_for_delivery" | "completed" | "cancelled"
export interface StaffWorkOrder {
  _id: string; code: string; status: WorkOrderStatus; agreedTotal: number; depositRequired: number; depositPaid: number
  contractReference?: string; purchaseOrderReference?: string; plannedStartAt?: string; plannedDeliveryAt?: string; createdAt: string
  customer: { _id: string; name: string; email: string; phone?: string; company?: string }; assignedTo?: StaffMember | null
  request: { _id: string; code: string; title: string }; quotation: { _id: string; code: string; total: number }
  timeline: Array<{ status: string; message?: string; at: string }>
}
