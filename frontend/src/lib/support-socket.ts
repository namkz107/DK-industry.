import { io } from "socket.io-client"
import { authClient } from "@/lib/auth-client"
import { supportClient } from "@/lib/support-client"

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api"
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || API_URL.replace(/\/api\/?$/, "")
const SUPPORT_TOKEN_KEY = "dk_support_socket"
let consumers = 0
let refreshing = false

export const supportSocket = io(`${SOCKET_URL}/support`, {
  autoConnect: false,
  withCredentials: true,
  auth: callback => callback({ token: authClient.accessToken(), supportToken: sessionStorage.getItem(SUPPORT_TOKEN_KEY) || undefined }),
  reconnectionDelay: 800,
  reconnectionDelayMax: 5_000,
})

export function storeSupportSocketToken(token?: string) {
  if (token) sessionStorage.setItem(SUPPORT_TOKEN_KEY, token)
}

supportSocket.on("auth:expired", async () => {
  if (refreshing) return
  refreshing = true
  try {
    if (authClient.accessToken()) {
      await authClient.refresh()
    } else {
      const result = await supportClient.session()
      storeSupportSocketToken(result.data?.socketToken)
    }
    supportSocket.connect()
  } catch { supportSocket.disconnect() }
  finally { refreshing = false }
})

export function acquireSupportSocket() {
  consumers += 1
  if (!supportSocket.connected) supportSocket.connect()
  return supportSocket
}

export function releaseSupportSocket() {
  consumers = Math.max(0, consumers - 1)
  if (!consumers) supportSocket.disconnect()
}
