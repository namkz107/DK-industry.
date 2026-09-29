import { useState, type FormEvent } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { usePageMeta } from "@/hooks/use-page-meta"
import { authClient } from "@/lib/auth-client"
import { AuthShell, Field } from "@/pages/login-page"

export function ForgotPasswordPage() {
  usePageMeta("Quên mật khẩu", "Nhận liên kết đặt lại mật khẩu tài khoản.")
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const submit = async (event: FormEvent) => { event.preventDefault(); setBusy(true); setError(""); try { setMessage((await authClient.forgotPassword(email)).message) } catch (reason) { setError(reason instanceof Error ? reason.message : "Không thể gửi yêu cầu") } finally { setBusy(false) } }
  return <AuthShell title="Quên mật khẩu" description="Nhập email đăng ký; hệ thống sẽ gửi liên kết dùng một lần có hiệu lực 30 phút."><form onSubmit={submit}><Field label="Email"><Input required type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="email@congty.vn"/></Field>{message && <p role="status" className="mb-5 rounded-xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">{message}</p>}{error && <p role="alert" className="mb-5 rounded-xl bg-red-50 p-4 text-red-700">{error}</p>}<Button className="w-full" size="lg" disabled={busy || !email}>Gửi hướng dẫn</Button><p className="mt-5 text-center"><Link className="font-bold text-orange-700" to="/dang-nhap">Quay lại đăng nhập</Link></p></form></AuthShell>
}

export function ResetPasswordPage() {
  usePageMeta("Đặt lại mật khẩu", "Tạo mật khẩu mới cho tài khoản.")
  const [params] = useSearchParams()
  const token = params.get("token") || ""
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const submit = async (event: FormEvent) => { event.preventDefault(); setError(""); if (password !== confirm) { setError("Mật khẩu xác nhận không khớp"); return } setBusy(true); try { setMessage((await authClient.resetPassword(token, password)).message) } catch (reason) { setError(reason instanceof Error ? reason.message : "Không thể đổi mật khẩu") } finally { setBusy(false) } }
  return <AuthShell title="Tạo mật khẩu mới" description="Mật khẩu cần ít nhất 8 ký tự, gồm chữ hoa, chữ thường và số.">{message ? <div><p className="rounded-xl bg-emerald-50 p-4 font-semibold text-emerald-800">{message}</p><Button asChild className="mt-5 w-full"><Link to="/dang-nhap">Đăng nhập</Link></Button></div> : <form onSubmit={submit}><Field label="Mật khẩu mới"><Input required type="password" autoComplete="new-password" value={password} onChange={event => setPassword(event.target.value)}/></Field><Field label="Nhập lại mật khẩu"><Input required type="password" autoComplete="new-password" value={confirm} onChange={event => setConfirm(event.target.value)}/></Field>{!token && <p className="mb-5 rounded-xl bg-red-50 p-4 text-red-700">Liên kết không có mã xác thực.</p>}{error && <p role="alert" className="mb-5 rounded-xl bg-red-50 p-4 text-red-700">{error}</p>}<Button className="w-full" size="lg" disabled={busy || !token}>Đổi mật khẩu</Button></form>}</AuthShell>
}

export function VerifyEmailPage() {
  usePageMeta("Xác minh email", "Xác minh địa chỉ email tài khoản.")
  const [params] = useSearchParams()
  const token = params.get("token") || ""
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const verify = async () => { setBusy(true); setError(""); try { setMessage((await authClient.verifyEmail(token)).message) } catch (reason) { setError(reason instanceof Error ? reason.message : "Không thể xác minh email") } finally { setBusy(false) } }
  return <AuthShell title="Xác minh email" description="Xác nhận địa chỉ email để tăng độ tin cậy và khả năng khôi phục tài khoản."><Button className="w-full" size="lg" disabled={busy || !token || Boolean(message)} onClick={verify}>Xác minh email</Button>{message && <p className="mt-5 rounded-xl bg-emerald-50 p-4 font-semibold text-emerald-800">{message}</p>}{error && <p className="mt-5 rounded-xl bg-red-50 p-4 text-red-700">{error}</p>}<p className="mt-5 text-center"><Link className="font-bold text-orange-700" to="/dang-nhap">Đến trang đăng nhập</Link></p></AuthShell>
}
