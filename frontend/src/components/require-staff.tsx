import { Navigate, Outlet } from "react-router-dom"
import { useAuth } from "@/contexts/auth-context"

export function RequireStaff() {
  const { user } = useAuth()
  return user && ["staff", "admin"].includes(user.role) ? <Outlet/> : <Navigate to="/tai-khoan" replace/>
}
