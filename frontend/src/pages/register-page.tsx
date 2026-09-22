import { zodResolver } from "@hookform/resolvers/zod"
import { Eye, EyeOff, LoaderCircle, UserPlus } from "lucide-react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { Link, Navigate, useNavigate } from "react-router-dom"
import { z } from "zod"
import { AuthShell, Field } from "@/pages/login-page"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/contexts/auth-context"
import { usePageMeta } from "@/hooks/use-page-meta"

const schema = z.object({
  name: z.string().trim().min(2, "Họ tên cần ít nhất 2 ký tự").max(100),
  email: z.string().trim().email("Email không hợp lệ"),
  phone: z.string().trim().regex(/^(?:\+84|0)[0-9\s.-]{9,13}$/, "Số điện thoại không hợp lệ"),
  password: z.string().regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,72}$/, "Cần ít nhất 8 ký tự, gồm chữ hoa, chữ thường và số"),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, { message: "Mật khẩu xác nhận không khớp", path: ["confirmPassword"] })
type RegisterData = z.infer<typeof schema>

export function RegisterPage() {
  usePageMeta("Đăng ký", "Tạo tài khoản khách hàng Cơ khí Đăng Khoa.")
  const { user, ready, register } = useAuth()
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [serverError, setServerError] = useState("")
  const form = useForm<RegisterData>({ resolver: zodResolver(schema), defaultValues: { name: "", email: "", phone: "", password: "", confirmPassword: "" } })
  if (ready && user) return <Navigate to="/tai-khoan" replace/>
  const submit = form.handleSubmit(async ({ confirmPassword: _, ...data }) => {
    void _
    setServerError("")
    try { await register(data); navigate("/tai-khoan", { replace: true }) }
    catch (error) { setServerError(error instanceof Error ? error.message : "Không thể đăng ký") }
  })

  return <AuthShell title="Tạo tài khoản khách hàng" description="Theo dõi yêu cầu, báo giá và đơn hàng tại một nơi duy nhất.">
    <form onSubmit={submit} noValidate>
      <Field label="Họ và tên" error={form.formState.errors.name?.message}><Input autoFocus autoComplete="name" placeholder="Nguyễn Văn A" {...form.register("name")}/></Field>
      <div className="grid gap-x-4 sm:grid-cols-2"><Field label="Email" error={form.formState.errors.email?.message}><Input type="email" autoComplete="email" placeholder="email@congty.vn" {...form.register("email")}/></Field><Field label="Số điện thoại" error={form.formState.errors.phone?.message}><Input inputMode="tel" autoComplete="tel" placeholder="096 5243 386" {...form.register("phone")}/></Field></div>
      <Field label="Mật khẩu" error={form.formState.errors.password?.message}><div className="relative"><Input className="pr-12" type={showPassword ? "text" : "password"} autoComplete="new-password" placeholder="Tối thiểu 8 ký tự" {...form.register("password")}/><button type="button" className="absolute right-1 top-1 grid size-10 place-items-center rounded-lg text-slate-500 hover:bg-slate-100" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}>{showPassword ? <EyeOff className="size-5"/> : <Eye className="size-5"/>}</button></div></Field>
      <Field label="Nhập lại mật khẩu" error={form.formState.errors.confirmPassword?.message}><Input type={showPassword ? "text" : "password"} autoComplete="new-password" placeholder="Nhập lại mật khẩu" {...form.register("confirmPassword")}/></Field>
      {serverError && <p role="alert" className="mb-5 rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-700">{serverError}</p>}
      <Button className="w-full" size="lg" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? <><LoaderCircle className="size-5 animate-spin"/>Đang tạo tài khoản...</> : <><UserPlus className="size-5"/>Tạo tài khoản</>}</Button>
      <p className="mt-4 text-center text-xs leading-5 text-slate-500">Bằng việc đăng ký, bạn đồng ý cung cấp thông tin để Cơ khí Đăng Khoa xử lý yêu cầu và đơn hàng.</p>
      <p className="mt-4 text-center text-sm text-slate-600">Đã có tài khoản? <Link className="font-bold text-orange-700 hover:underline" to="/dang-nhap">Đăng nhập</Link></p>
    </form>
  </AuthShell>
}
