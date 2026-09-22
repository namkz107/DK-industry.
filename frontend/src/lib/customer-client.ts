import { authClient } from "@/lib/auth-client"
import type { Address, Cart, CustomerOrder, CustomerProfile, CustomerRequest, CustomerSummary, Quotation, RequestDetail } from "@/types/customer"

type Result<T> = { success: boolean; data: T; message?: string }
const json = (method: string, body?: unknown): RequestInit => ({ method, body: body === undefined ? undefined : JSON.stringify(body) })

export const customerClient = {
  summary: () => authClient.authenticated<Result<CustomerSummary>>("/customer/summary"),
  profile: () => authClient.authenticated<Result<CustomerProfile>>("/customer/profile"),
  updateProfile: (body: Pick<CustomerProfile, "name" | "phone" | "company" | "taxCode">) => authClient.authenticated<Result<CustomerProfile>>("/customer/profile", json("PATCH", body)),
  addAddress: (body: Omit<Address, "_id">) => authClient.authenticated<Result<Address[]>>("/customer/addresses", json("POST", body)),
  updateAddress: (id: string, body: Omit<Address, "_id">) => authClient.authenticated<Result<Address[]>>(`/customer/addresses/${id}`, json("PATCH", body)),
  deleteAddress: (id: string) => authClient.authenticated<Result<Address[]>>(`/customer/addresses/${id}`, { method: "DELETE" }),
  cart: () => authClient.authenticated<Result<Cart>>("/customer/cart"),
  addCartItem: (productId: string, quantity = 1) => authClient.authenticated<Result<Cart>>("/customer/cart/items", json("POST", { productId, quantity })),
  updateCartItem: (productId: string, quantity: number) => authClient.authenticated<Result<Cart>>(`/customer/cart/items/${productId}`, json("PATCH", { quantity })),
  removeCartItem: (productId: string) => authClient.authenticated<Result<Cart>>(`/customer/cart/items/${productId}`, { method: "DELETE" }),
  orders: () => authClient.authenticated<Result<CustomerOrder[]>>("/customer/orders"),
  createOrder: (body: { addressId: string; paymentMethod: "cod" | "bank_transfer"; customerNote?: string }) => authClient.authenticated<Result<CustomerOrder>>("/customer/orders", json("POST", body)),
  cancelOrder: (id: string, reason?: string) => authClient.authenticated<Result<CustomerOrder>>(`/customer/orders/${id}/cancel`, json("PATCH", { reason })),
  requests: () => authClient.authenticated<Result<CustomerRequest[]>>("/customer/requests"),
  requestDetail: (id: string) => authClient.authenticated<Result<RequestDetail>>(`/customer/requests/${id}`),
  createRequest: (body: FormData) => authClient.authenticated<Result<{ id: string; code: string; status: string }>>("/customer/requests", { method: "POST", body }),
  sendRequestMessage: (id: string, body: FormData) => authClient.authenticated<Result<{ id: string; createdAt: string }>>(`/customer/requests/${id}/messages`, { method: "POST", body }),
  cancelRequest: (id: string) => authClient.authenticated<Result<CustomerRequest>>(`/customer/requests/${id}/cancel`, { method: "PATCH" }),
  respondQuotation: (requestId: string, quotationId: string, decision: "accepted" | "rejected", note = "") => authClient.authenticated<Result<Quotation>>(`/customer/requests/${requestId}/quotations/${quotationId}/respond`, json("PATCH", { decision, note })),
  downloadAttachment: (requestId: string, attachmentId: string) => authClient.download(`/customer/requests/${requestId}/attachments/${attachmentId}`),
  downloadMessageAttachment: (requestId: string, messageId: string, attachmentId: string) => authClient.download(`/customer/requests/${requestId}/messages/${messageId}/attachments/${attachmentId}`),
}
