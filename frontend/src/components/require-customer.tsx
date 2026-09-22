import { Navigate, Outlet } from "react-router-dom"
import { useAuth } from "@/contexts/auth-context"

export function RequireCustomer() {
  const { user } = useAuth()
  return user?.role === "customer" ? <Outlet/> : <Navigate to="/tai-khoan" replace/>
}
