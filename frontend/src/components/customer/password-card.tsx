import { zodResolver } from "@hookform/resolvers/zod"
import { KeyRound, LoaderCircle } from "lucide-react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { useNavigate } from "react-router-dom"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/contexts/auth-context"
import { authClient } from "@/lib/auth-client"

const schema = z.object({ currentPassword: z.string().min(1, "Nhập mật khẩu hiện tại"), newPassword: z.string().regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,72}$/, "Cần ít nhất 8 ký tự, gồm chữ hoa, chữ thường và số"), confirmPassword: z.string() }).refine(data => data.newPassword === data.confirmPassword, { message: "Mật khẩu xác nhận không khớp", path: ["confirmPassword"] })
type PasswordData = z.infer<typeof schema>

export function PasswordCard() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const form = useForm<PasswordData>({ resolver: zodResolver(schema), defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" } })
  const submit = form.handleSubmit(async ({ confirmPassword: _, ...data }) => {
    void _; setError(""); setMessage("")
    try {
      const result = await authClient.changePassword(data)
      setMessage(result.message)
      form.reset()
      setTimeout(async () => { try { await logout() } finally { navigate("/dang-nhap", { replace: true }) } }, 1200)
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Không thể đổi mật khẩu") }
  })
  return <article className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8"><div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-xl bg-orange-50 text-orange-700"><KeyRound className="size-5"/></span><div><h2 className="font-display text-xl font-bold text-emerald-950">Đổi mật khẩu</h2><p className="text-sm text-slate-500">Tất cả phiên đăng nhập sẽ được thu hồi.</p></div></div><form className="mt-6" onSubmit={submit}>{[["Mật khẩu hiện tại", "currentPassword", "current-password"], ["Mật khẩu mới", "newPassword", "new-password"], ["Nhập lại mật khẩu mới", "confirmPassword", "new-password"]].map(([label, name, complete]) => <label className="mb-4 block text-sm font-bold text-slate-700" key={name}><span className="mb-2 block">{label}</span><Input type="password" autoComplete={complete} {...form.register(name as keyof PasswordData)}/>{form.formState.errors[name as keyof PasswordData]?.message && <span className="mt-1.5 block text-sm text-red-600">{form.formState.errors[name as keyof PasswordData]?.message}</span>}</label>)}{error && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}{message && <p role="status" className="mb-4 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">{message}</p>}<Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting && <LoaderCircle className="size-5 animate-spin"/>}Cập nhật mật khẩu</Button></form></article>
}
