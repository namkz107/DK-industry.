import { zodResolver } from "@hookform/resolvers/zod"
import { Eye, EyeOff, LoaderCircle, LockKeyhole, LogIn, ShieldCheck } from "lucide-react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/contexts/auth-context"
import { usePageMeta } from "@/hooks/use-page-meta"

const schema = z.object({ identifier: z.string().trim().min(5, "Nhập email hoặc số điện thoại"), password: z.string().min(1, "Nhập mật khẩu") })
type LoginData = z.infer<typeof schema>

export function LoginPage() {
  usePageMeta("Đăng nhập", "Đăng nhập tài khoản khách hàng Cơ khí Đăng Khoa.")
  const { user, ready, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [showPassword, setShowPassword] = useState(false)
  const [serverError, setServerError] = useState("")
  const form = useForm<LoginData>({ resolver: zodResolver(schema), defaultValues: { identifier: "", password: "" } })
  if (ready && user) return <Navigate to="/tai-khoan" replace/>
  const submit = form.handleSubmit(async data => {
    setServerError("")
    try { await login(data); navigate((location.state as { from?: string } | null)?.from || "/tai-khoan", { replace: true }) }
    catch (error) { setServerError(error instanceof Error ? error.message : "Không thể đăng nhập") }
  })

  return <AuthShell title="Chào mừng bạn trở lại" description="Đăng nhập để theo dõi đơn hàng, yêu cầu gia công và báo giá của bạn.">
    <form onSubmit={submit} noValidate>
      <Field label="Email hoặc số điện thoại" error={form.formState.errors.identifier?.message}><Input autoFocus autoComplete="username" placeholder="email@congty.vn hoặc 096..." {...form.register("identifier")}/></Field>
      <Field label="Mật khẩu" error={form.formState.errors.password?.message}><div className="relative"><Input className="pr-12" type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="Nhập mật khẩu" {...form.register("password")}/><button type="button" className="absolute right-1 top-1 grid size-10 place-items-center rounded-lg text-slate-500 hover:bg-slate-100" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}>{showPassword ? <EyeOff className="size-5"/> : <Eye className="size-5"/>}</button></div></Field>
      {serverError && <p role="alert" className="mb-5 rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-700">{serverError}</p>}
      <Button className="w-full" size="lg" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? <><LoaderCircle className="size-5 animate-spin"/>Đang đăng nhập...</> : <><LogIn className="size-5"/>Đăng nhập</>}</Button>
      <p className="mt-6 text-center text-sm text-slate-600">Chưa có tài khoản? <Link className="font-bold text-orange-700 hover:underline" to="/dang-ky">Đăng ký Customer</Link></p>
    </form>
  </AuthShell>
}

export function AuthShell({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return <section className="bg-stone-100 px-4 py-12 sm:py-20"><div className="mx-auto grid max-w-5xl overflow-hidden rounded-3xl bg-white shadow-2xl shadow-emerald-950/10 lg:grid-cols-[.85fr_1.15fr]"><div className="hidden bg-emerald-950 p-12 text-white lg:flex lg:flex-col lg:justify-between"><div><span className="grid size-14 place-items-center rounded-2xl bg-orange-600"><LockKeyhole className="size-7"/></span><h2 className="mt-8 font-display text-4xl font-bold leading-tight">Thông tin của bạn được bảo vệ.</h2><p className="mt-5 leading-7 text-emerald-50/65">Mật khẩu được mã hóa và phiên đăng nhập được quản lý bằng cookie HttpOnly an toàn.</p></div><div className="flex items-center gap-3 text-sm font-bold text-emerald-100"><ShieldCheck className="size-5 text-orange-400"/>Chỉ xem dữ liệu thuộc tài khoản của bạn</div></div><div className="p-6 sm:p-10 lg:p-12"><h1 className="font-display text-3xl font-bold text-emerald-950 sm:text-4xl">{title}</h1><p className="mb-8 mt-3 text-base leading-7 text-slate-600">{description}</p>{children}</div></div></section>
}

export function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return <label className="mb-5 block text-sm font-bold text-slate-700"><span className="mb-2 block">{label}</span>{children}{error && <span className="mt-1.5 block text-sm font-semibold text-red-600">{error}</span>}</label>
}
