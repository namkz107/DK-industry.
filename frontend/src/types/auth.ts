export type UserRole = "customer" | "staff" | "admin"

export interface AuthUser {
  id: string
  name: string
  email: string
  phone: string
  role: UserRole
  permissions: string[]
  company: string
  status: "active" | "blocked"
  emailVerified?: boolean
}

export interface AuthPayload {
  user: AuthUser
  accessToken: string
}
