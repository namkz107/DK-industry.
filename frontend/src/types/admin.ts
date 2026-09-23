import type { Paged } from "@/types/staff"

export type AdminEntity = "user" | "product" | "service" | "project"
export interface AdminUser { _id: string; name: string; email: string; phone: string; role: "customer" | "staff" | "admin"; permissions: string[]; status: "active" | "blocked"; lastLoginAt?: string; createdAt: string }
export interface AuditLog { _id: string; action: string; entity: AdminEntity; entityId: string; summary: string; metadata?: Record<string, unknown>; actor?: { _id: string; name: string; email: string }; createdAt: string }
export interface AdminOrderSummary { _id: string; code: string; total: number; status: string; paymentStatus: string; customer?: { name: string }; createdAt: string }
export interface AdminDashboard { customers: number; staff: number; blockedUsers: number; products: number; lowStock: number; services: number; projects: number; openLeads: number; openRequests: number; openOrders: number; pendingOrders: number; revenue: number; monthlyRevenue: number; recentOrders: AdminOrderSummary[]; recentActivity: AuditLog[] }
export interface AdminProduct { _id: string; name: string; slug: string; sku?: string; category: string; description?: string; price: number | null; unit: string; stock: number; priceOnRequest: boolean; image?: string; featured: boolean; active: boolean; updatedAt: string }
export interface AdminService { _id: string; name: string; slug: string; summary: string; description?: string; image?: string; order: number; featured: boolean; published: boolean; updatedAt: string }
export interface AdminProject { _id: string; title: string; slug: string; category: string; client?: string; location?: string; year?: string; description?: string; image?: string; featured: boolean; published: boolean; updatedAt: string }
export type AdminPaged<T> = Paged<T>
