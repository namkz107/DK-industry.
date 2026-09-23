import { Navigate, Outlet } from "react-router-dom"
import { useAuth } from "@/contexts/auth-context"

export function RequireStaff() {
  const { user } = useAuth()
  if (user?.role === "staff") return <Outlet/>
  return <Navigate to={user?.role === "admin" ? "/admin" : "/tai-khoan"} replace/>
}
