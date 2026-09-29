import { Navigate, Outlet } from "react-router-dom"
import { useAuth } from "@/contexts/auth-context"

export function RequireStaff() {
  const { user } = useAuth()
  if (user?.role === "staff" || user?.role === "admin") return <Outlet/>
  return <Navigate to="/tai-khoan" replace/>
}
