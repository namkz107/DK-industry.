import type { AuthPayload, AuthUser } from "@/types/auth"

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api"
let accessToken = ""
let refreshRequest: Promise<AuthUser> | null = null

type ApiResponse<T> = { success: boolean; data: T; message?: string }

async function parse<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.message || "Không thể kết nối hệ thống")
  return body
}

async function publicPost<T>(path: string, payload?: unknown) {
  const response = await fetch(`${API_URL}${path}`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: payload ? JSON.stringify(payload) : undefined })
  return parse<T>(response)
}

function refreshSession() {
  if (!refreshRequest) {
    refreshRequest = publicPost<ApiResponse<AuthPayload>>("/auth/refresh")
      .then(result => {
        accessToken = result.data.accessToken
        return result.data.user
      })
      .finally(() => { refreshRequest = null })
  }
  return refreshRequest
}

export const authClient = {
  async register(payload: { name: string; email: string; phone: string; password: string }) {
    const result = await publicPost<ApiResponse<AuthPayload>>("/auth/register", payload)
    accessToken = result.data.accessToken
    return result.data.user
  },
  async login(payload: { identifier: string; password: string }) {
    const result = await publicPost<ApiResponse<AuthPayload>>("/auth/login", payload)
    accessToken = result.data.accessToken
    return result.data.user
  },
  async refresh() {
    return refreshSession()
  },
  async logout() {
    try { await publicPost("/auth/logout") } finally { accessToken = "" }
  },
  async authenticated<T>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
    const response = await fetch(`${API_URL}${path}`, { ...options, credentials: "include", headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}`, ...options.headers } })
    if (response.status === 401 && retry) {
      try { await this.refresh(); return this.authenticated<T>(path, options, false) } catch { accessToken = "" }
    }
    return parse<T>(response)
  },
  me() { return this.authenticated<ApiResponse<{ user: AuthUser }>>("/auth/me") },
  changePassword(payload: { currentPassword: string; newPassword: string }) {
    return this.authenticated<{ success: boolean; message: string }>("/auth/change-password", { method: "POST", body: JSON.stringify(payload) })
  },
}
