import { zodResolver } from "@hookform/resolvers/zod"
import { KeyRound, LoaderCircle, LogOut, Mail, Phone, ShieldCheck, UserRound } from "lucide-react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { useNavigate } from "react-router-dom"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/contexts/auth-context"
import { usePageMeta } from "@/hooks/use-page-meta"
import { authClient } from "@/lib/auth-client"

const schema = z.object({ currentPassword: z.string().min(1, "Nhập mật khẩu hiện tại"), newPassword: z.string().regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,72}$/, "Cần ít nhất 8 ký tự, gồm chữ hoa, chữ thường và số"), confirmPassword: z.string() }).refine(data => data.newPassword === data.confirmPassword, { message: "Mật khẩu xác nhận không khớp", path: ["confirmPassword"] })
type PasswordData = z.infer<typeof schema>
const roleNames = { customer: "Khách hàng", staff: "Nhân viên", admin: "Quản trị viên" }

export function AccountPage() {
  usePageMeta("Tài khoản", "Quản lý tài khoản Cơ khí Đăng Khoa.")
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const form = useForm<PasswordData>({ resolver: zodResolver(schema), defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" } })
  if (!user) return null
  const handleLogout = async () => { await logout(); navigate("/", { replace: true }) }
  const changePassword = form.handleSubmit(async ({ confirmPassword: _, ...data }) => {
    void _; setError(""); setMessage("")
    try { const result = await authClient.changePassword(data); setMessage(result.message); form.reset(); setTimeout(() => void handleLogout(), 1200) }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Không thể đổi mật khẩu") }
  })

  return <section className="section-space bg-stone-100"><div className="container-page"><div className="mb-9 flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="text-xs font-black uppercase tracking-[.2em] text-orange-700">Tài khoản của tôi</p><h1 className="mt-3 font-display text-4xl font-bold text-emerald-950">Xin chào, {user.name}</h1></div><Button variant="outline" onClick={handleLogout}><LogOut className="size-5"/>Đăng xuất</Button></div><div className="grid gap-6 lg:grid-cols-[.8fr_1.2fr]"><article className="rounded-3xl bg-emerald-950 p-7 text-white sm:p-9"><span className="grid size-14 place-items-center rounded-2xl bg-orange-600"><UserRound className="size-7"/></span><div className="mt-7 flex items-center gap-2"><span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-orange-300">{roleNames[user.role]}</span>{user.status === "active" && <span className="flex items-center gap-1 text-xs font-bold text-emerald-300"><ShieldCheck className="size-4"/>Đang hoạt động</span>}</div><h2 className="mt-5 font-display text-2xl font-bold">{user.name}</h2><div className="mt-6 space-y-4 text-sm text-emerald-50/70"><p className="flex items-center gap-3"><Mail className="size-5 text-orange-400"/>{user.email}</p><p className="flex items-center gap-3"><Phone className="size-5 text-orange-400"/>{user.phone}</p></div>{user.role === "customer" && <p className="mt-8 rounded-2xl bg-white/5 p-4 text-sm leading-6 text-emerald-50/65">Ở giai đoạn tiếp theo, đơn hàng, yêu cầu gia công và báo giá của bạn sẽ hiển thị tại đây.</p>}</article><article className="rounded-3xl border border-slate-200 bg-white p-7 sm:p-9"><div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-xl bg-orange-50 text-orange-700"><KeyRound className="size-5"/></span><div><h2 className="font-display text-xl font-bold text-emerald-950">Đổi mật khẩu</h2><p className="text-sm text-slate-500">Tất cả phiên đăng nhập sẽ được thu hồi.</p></div></div><form className="mt-7" onSubmit={changePassword}><PasswordField label="Mật khẩu hiện tại" error={form.formState.errors.currentPassword?.message}><Input type="password" autoComplete="current-password" {...form.register("currentPassword")}/></PasswordField><PasswordField label="Mật khẩu mới" error={form.formState.errors.newPassword?.message}><Input type="password" autoComplete="new-password" {...form.register("newPassword")}/></PasswordField><PasswordField label="Nhập lại mật khẩu mới" error={form.formState.errors.confirmPassword?.message}><Input type="password" autoComplete="new-password" {...form.register("confirmPassword")}/></PasswordField>{error && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}{message && <p role="status" className="mb-4 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">{message}</p>}<Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting && <LoaderCircle className="size-5 animate-spin"/>}Cập nhật mật khẩu</Button></form></article></div></div></section>
}

function PasswordField({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) { return <label className="mb-5 block text-sm font-bold text-slate-700"><span className="mb-2 block">{label}</span>{children}{error && <span className="mt-1.5 block text-sm text-red-600">{error}</span>}</label> }
