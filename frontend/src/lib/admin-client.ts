import { authClient } from "@/lib/auth-client"
import type { AdminDashboard, AdminPaged, AdminProduct, AdminProject, AdminService, AdminUser, AuditLog } from "@/types/admin"

type Result<T> = { success: boolean; data: T; message?: string }
const json = (method: string, body?: unknown): RequestInit => ({ method, body: body === undefined ? undefined : JSON.stringify(body) })
const query = (values: Record<string, string | undefined>) => new URLSearchParams(Object.entries(values).filter((entry): entry is [string, string] => Boolean(entry[1]))).toString()

export const adminClient = {
  dashboard: () => authClient.authenticated<Result<AdminDashboard>>("/admin/dashboard"),
  uploadImage: (file: File) => { const body = new FormData(); body.append("image", file); return authClient.authenticated<Result<{ url: string; filename: string }>>("/admin/uploads/images", { method: "POST", body }) },
  users: (filters: { q?: string; role?: string; status?: string } = {}) => authClient.authenticated<Result<AdminPaged<AdminUser>>>(`/admin/users?${query(filters)}`),
  createUser: (body: { name: string; email: string; phone: string; password: string; role: "staff" | "admin" }) => authClient.authenticated<Result<AdminUser>>("/admin/users", json("POST", body)),
  updateUser: (id: string, body: Partial<Pick<AdminUser, "name" | "email" | "phone" | "role" | "status">>) => authClient.authenticated<Result<AdminUser>>(`/admin/users/${id}`, json("PATCH", body)),
  resetPassword: (id: string, password: string) => authClient.authenticated<{ success: boolean; message: string }>(`/admin/users/${id}/reset-password`, json("POST", { password })),
  products: (filters: { q?: string; state?: string } = {}) => authClient.authenticated<Result<AdminPaged<AdminProduct>>>(`/admin/products?${query(filters)}`),
  createProduct: (body: Record<string, unknown>) => authClient.authenticated<Result<AdminProduct>>("/admin/products", json("POST", body)),
  updateProduct: (id: string, body: Record<string, unknown>) => authClient.authenticated<Result<AdminProduct>>(`/admin/products/${id}`, json("PATCH", body)),
  hideProduct: (id: string) => authClient.authenticated<Result<AdminProduct>>(`/admin/products/${id}`, { method: "DELETE" }),
  services: (filters: { q?: string; state?: string } = {}) => authClient.authenticated<Result<AdminPaged<AdminService>>>(`/admin/services?${query(filters)}`),
  createService: (body: Record<string, unknown>) => authClient.authenticated<Result<AdminService>>("/admin/services", json("POST", body)),
  updateService: (id: string, body: Record<string, unknown>) => authClient.authenticated<Result<AdminService>>(`/admin/services/${id}`, json("PATCH", body)),
  hideService: (id: string) => authClient.authenticated<Result<AdminService>>(`/admin/services/${id}`, { method: "DELETE" }),
  projects: (filters: { q?: string; state?: string } = {}) => authClient.authenticated<Result<AdminPaged<AdminProject>>>(`/admin/projects?${query(filters)}`),
  createProject: (body: Record<string, unknown>) => authClient.authenticated<Result<AdminProject>>("/admin/projects", json("POST", body)),
  updateProject: (id: string, body: Record<string, unknown>) => authClient.authenticated<Result<AdminProject>>(`/admin/projects/${id}`, json("PATCH", body)),
  hideProject: (id: string) => authClient.authenticated<Result<AdminProject>>(`/admin/projects/${id}`, { method: "DELETE" }),
  auditLogs: (entity = "") => authClient.authenticated<Result<AdminPaged<AuditLog>>>(`/admin/audit-logs?${query({ entity })}`),
}
