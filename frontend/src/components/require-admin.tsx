import { Navigate, Outlet } from "react-router-dom"
import { useAuth } from "@/contexts/auth-context"

export function RequireAdmin() {
  const { user } = useAuth()
  return user?.role === "admin" ? <Outlet/> : <Navigate to="/tai-khoan" replace/>
}
