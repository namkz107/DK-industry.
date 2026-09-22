import type { ApiList, Product, Project, Service } from "@/types"

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api"

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  })
  if (!response.ok) throw new Error("Không thể kết nối máy chủ")
  return response.json() as Promise<T>
}

export const api = {
  products: () => request<ApiList<Product>>("/products?featured=true"),
  projects: () => request<ApiList<Project>>("/projects?featured=true"),
  services: () => request<ApiList<Service>>("/services"),
  createLead: (payload: unknown) => request<{ success: boolean; message: string }>("/leads", {
    method: "POST",
    body: JSON.stringify(payload),
  }),
}
