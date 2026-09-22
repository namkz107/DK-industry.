import type { ApiList, Product, Project, Service } from "@/types"

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api"

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.message || "Không thể kết nối máy chủ")
  return body as T
}

export const api = {
  products: () => request<ApiList<Product>>("/products?limit=100"),
  projects: () => request<ApiList<Project>>("/projects?featured=true"),
  services: () => request<ApiList<Service>>("/services"),
  createLead: (payload: unknown) => request<{ success: boolean; message: string; data: { id: string; code: string; status: string; duplicate: boolean } }>("/leads", {
    method: "POST",
    body: JSON.stringify(payload),
  }),
}
