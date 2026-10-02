import { io, type Socket } from "socket.io-client"
import { authClient } from "@/lib/auth-client"

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api"
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || API_URL.replace(/\/api\/?$/, "")

let refreshPromise: Promise<unknown> | null = null
let consumers = 0

export const chatSocket: Socket = io(`${SOCKET_URL}/chat`, {
  autoConnect: false,
  withCredentials: true,
  auth: callback => callback({ token: authClient.accessToken() }),
  reconnectionDelay: 800,
  reconnectionDelayMax: 5_000,
})

async function refreshAndReconnect() {
  if (!refreshPromise) refreshPromise = authClient.refresh().finally(() => { refreshPromise = null })
  try {
    await refreshPromise
    if (!chatSocket.connected) chatSocket.connect()
  } catch {
    chatSocket.disconnect()
  }
}

chatSocket.on("auth:expired", () => { void refreshAndReconnect() })
chatSocket.on("connect_error", error => {
  if (/hết hạn|đăng nhập|xác thực|thu hồi/i.test(error.message)) void refreshAndReconnect()
})

export function connectChatSocket() {
  consumers += 1
  if (!chatSocket.connected) chatSocket.connect()
  return chatSocket
}

export function releaseChatSocket() {
  consumers = Math.max(0, consumers - 1)
  if (consumers === 0) chatSocket.disconnect()
}
