import { authClient } from "@/lib/auth-client"

export interface NotificationItem {
  _id: string
  type: string
  title: string
  message: string
  link?: string
  readAt?: string
  createdAt: string
}

type Result<T> = { success: boolean; data: T; message?: string }

export const notificationClient = {
  list: () => authClient.authenticated<Result<{ items: NotificationItem[]; unread: number }>>("/notifications"),
  read: (id: string) => authClient.authenticated<Result<NotificationItem>>(`/notifications/${id}/read`, { method: "PATCH" }),
  readAll: () => authClient.authenticated<{ success: boolean; message: string }>("/notifications/read-all", { method: "PATCH" }),
}
