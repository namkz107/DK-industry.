import { LoaderCircle } from "lucide-react"
import { Navigate, Outlet, useLocation } from "react-router-dom"
import { useAuth } from "@/contexts/auth-context"

export function RequireAuth() {
  const { user, ready } = useAuth()
  const location = useLocation()
  if (!ready) return <div className="grid min-h-[60vh] place-items-center"><LoaderCircle className="size-8 animate-spin text-orange-600" aria-label="Đang kiểm tra đăng nhập"/></div>
  return user ? <Outlet/> : <Navigate to="/dang-nhap" replace state={{ from: location.pathname }}/>
}
