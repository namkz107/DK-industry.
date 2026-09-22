/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react"
import { authClient } from "@/lib/auth-client"
import type { AuthUser } from "@/types/auth"

interface AuthContextValue {
  user: AuthUser | null
  ready: boolean
  login: (payload: { identifier: string; password: string }) => Promise<AuthUser>
  register: (payload: { name: string; email: string; phone: string; password: string }) => Promise<AuthUser>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: PropsWithChildren) {
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
    login: async payload => { const next = await authClient.login(payload); setUser(next); return next },
    register: async payload => { const next = await authClient.register(payload); setUser(next); return next },
    logout: async () => { await authClient.logout(); setUser(null) },
  }), [user, ready])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth phải nằm trong AuthProvider")
  return context
}
