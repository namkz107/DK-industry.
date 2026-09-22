/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { authClient } from "@/lib/auth-client"
import type { AuthUser } from "@/types/auth"

interface AuthContextValue {
  user: AuthUser | null
  ready: boolean
  login: (payload: { identifier: string; password: string }) => Promise<AuthUser>
  register: (payload: { name: string; email: string; phone: string; password: string }) => Promise<AuthUser>
  logout: () => Promise<void>
  updateUser: (values: Partial<AuthUser>) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let active = true
    authClient.refresh().then(value => { if (active) setUser(value) }).catch(() => {}).finally(() => { if (active) setReady(true) })
    return () => { active = false }
  }, [])

  const value = useMemo<AuthContextValue>(() => ({
    user,
    ready,
    login: async payload => { const next = await authClient.login(payload); queryClient.removeQueries({ queryKey: ["customer"] }); setUser(next); return next },
    register: async payload => { const next = await authClient.register(payload); queryClient.removeQueries({ queryKey: ["customer"] }); setUser(next); return next },
    logout: async () => { try { await authClient.logout() } finally { queryClient.removeQueries({ queryKey: ["customer"] }); setUser(null) } },
    updateUser: values => setUser(current => current ? { ...current, ...values } : current),
  }), [user, ready, queryClient])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth phải nằm trong AuthProvider")
  return context
}
