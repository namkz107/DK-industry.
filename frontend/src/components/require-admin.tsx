import { Navigate, Outlet } from "react-router-dom"
import { useAuth } from "@/contexts/auth-context"

export function RequireAdmin() {
  const { user } = useAuth()
  if (user?.role === "admin") return <Outlet/>
  return <Navigate to={user?.role === "staff" ? "/staff" : "/tai-khoan"} replace/>
}
