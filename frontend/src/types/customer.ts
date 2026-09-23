import type { Product } from "@/types"

export interface Address {
  _id: string
  label: string
  recipientName: string
  phone: string
  addressLine: string
  ward?: string
  district: string
  province: string
  isDefault: boolean
}

export interface CustomerProfile {
  name: string
  email: string
  phone: string
  company: string
  taxCode: string
  addresses: Address[]
}

export interface CartItem { product: Product; quantity: number; lineTotal: number }
export interface Cart { id?: string; items: CartItem[]; itemCount: number; subtotal: number }

export interface OrderItem { product: string; name: string; sku?: string; image?: string; unit?: string; price: number; quantity: number; lineTotal: number }
export interface TimelineItem { status: string; message?: string; at: string }
export type PaymentStatus = "unpaid" | "pending" | "paid" | "refund_pending" | "refunded"
export interface CustomerOrder {
  _id: string; code: string; items: OrderItem[]; subtotal: number; shippingFee: number; total: number
  paymentMethod: "cod" | "bank_transfer"; paymentStatus: PaymentStatus; status: string; customerNote?: string
  shippingAddress: Omit<Address, "_id" | "label" | "isDefault">; timeline: TimelineItem[]; createdAt: string
  paymentTimeline?: Array<{ status: PaymentStatus; message?: string; at: string }>
  shippingProvider?: string; trackingCode?: string; estimatedDeliveryAt?: string; cancellationReason?: string
}

export interface RequestAttachment { _id: string; originalName: string; mimeType?: string; size?: number }
export interface RequestMessage { _id: string; senderRole: "customer" | "staff" | "admin" | "system"; visibility: "customer"; content: string; attachments: RequestAttachment[]; createdAt: string }
export interface QuotationItem { _id: string; description: string; quantity: number; unit: string; unitPrice: number; lineTotal: number }
export interface Quotation {
  _id: string; code: string; version: number; items: QuotationItem[]; subtotal: number; taxRate: number; taxAmount: number; total: number
  currency: "VND"; leadTime?: string; paymentTerms?: string; notes?: string; validUntil: string
  status: "sent" | "accepted" | "rejected" | "superseded" | "expired"; sentAt?: string; respondedAt?: string; responseNote?: string
}
export interface CustomerRequest {
  _id: string; code: string; requestType: "machining" | "product_quote" | "consulting"; title: string; description: string
  material?: string; quantity?: number; dimensions?: string; desiredDate?: string; budget?: string
  productSnapshot?: { name?: string; sku?: string; unit?: string }; attachments: RequestAttachment[]
  status: string; timeline: TimelineItem[]; createdAt: string; latestQuotation?: Quotation | null
}
export interface RequestDetail { request: CustomerRequest; messages: RequestMessage[]; quotations: Quotation[] }

export interface CustomerSummary { orders: number; openOrders: number; requests: number; openRequests: number; cartItems: number }
