import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { KeyRound, Search, ShieldCheck, UserPlus } from "lucide-react"
import { useState, type ReactNode } from "react"
import { useForm } from "react-hook-form"
import { useSearchParams } from "react-router-dom"
import { z } from "zod"
import { AdminShell } from "@/components/admin/admin-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/contexts/auth-context"
import { usePageMeta } from "@/hooks/use-page-meta"
import { adminClient } from "@/lib/admin-client"
import { cn } from "@/lib/utils"
import type { AdminUser } from "@/types/admin"

const permissionOptions = [
  ["leads.manage", "Quản lý Lead"], ["requests.manage", "Yêu cầu dịch vụ"], ["orders.manage", "Đơn hàng"], ["content.manage", "Nội dung"], ["reports.view", "Xem báo cáo"],
] as const
const createSchema = z.object({
  name: z.string().trim().min(2, "Tên phải có ít nhất 2 ký tự"),
  email: z.email("Email không hợp lệ"),
  phone: z.string().regex(/^(?:\+84|0)[0-9]{9,10}$/, "Số điện thoại không hợp lệ"),
  password: z.string().min(8, "Mật khẩu tối thiểu 8 ký tự").max(128),
  role: z.enum(["staff", "admin"]),
  permissions: z.array(z.string()),
})
type CreateValues = z.infer<typeof createSchema>

export function AdminUsersPage() {
  usePageMeta("Quản lý nhân sự", "Tạo tài khoản, cấp quyền và kiểm soát trạng thái truy cập.")
  const [params] = useSearchParams(); const queryClient = useQueryClient(); const { user: currentUser } = useAuth()
  const [filters, setFilters] = useState({ q: "", role: params.get("role") || "", status: "" })
  const [selected, setSelected] = useState<AdminUser | null>(null)
  const [password, setPassword] = useState("")
  const users = useQuery({ queryKey: ["admin", "users", filters], queryFn: () => adminClient.users(filters) })
  const refresh = () => { void queryClient.invalidateQueries({ queryKey: ["admin", "users"] }); void queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] }) }
  const create = useMutation({ mutationFn: adminClient.createUser, onSuccess: () => { refresh(); form.reset() } })
  const update = useMutation({ mutationFn: ({ id, body }: { id: string; body: Parameters<typeof adminClient.updateUser>[1] }) => adminClient.updateUser(id, body), onSuccess: result => { refresh(); setSelected(result.data) } })
  const resetPassword = useMutation({ mutationFn: ({ id, value }: { id: string; value: string }) => adminClient.resetPassword(id, value), onSuccess: () => setPassword("") })
  const form = useForm<CreateValues>({ resolver: zodResolver(createSchema), defaultValues: { name: "", email: "", phone: "", password: "", role: "staff", permissions: ["leads.manage", "requests.manage", "orders.manage"] } })

  return <AdminShell title="Tài khoản và phân quyền" description="Quản lý quyền truy cập theo đúng trách nhiệm; tài khoản bị khóa sẽ mất hiệu lực phiên đăng nhập.">
    <section className="rounded-3xl border bg-white p-6 shadow-sm"><div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-2xl bg-orange-50 text-orange-700"><UserPlus className="size-6"/></span><div><h2 className="font-display text-2xl font-bold text-emerald-950">Thêm nhân sự</h2><p className="text-sm text-slate-500">Mật khẩu tạm thời cần được chuyển riêng cho nhân viên.</p></div></div>
      <form className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5" onSubmit={form.handleSubmit(values => create.mutate(values))}>
        <Field label="Họ tên" error={form.formState.errors.name?.message}><Input {...form.register("name")} placeholder="Nguyễn Văn A"/></Field>
        <Field label="Email" error={form.formState.errors.email?.message}><Input {...form.register("email")} type="email" placeholder="nhanvien@congty.vn"/></Field>
        <Field label="Số điện thoại" error={form.formState.errors.phone?.message}><Input {...form.register("phone")} placeholder="09xxxxxxxx"/></Field>
        <Field label="Mật khẩu tạm" error={form.formState.errors.password?.message}><Input {...form.register("password")} type="password"/></Field>
        <Field label="Vai trò"><select className="field-select" {...form.register("role")}><option value="staff">Nhân viên</option><option value="admin">Quản trị viên</option></select></Field>
        <div className="md:col-span-2 xl:col-span-4"><span className="text-sm font-bold text-slate-700">Quyền nghiệp vụ</span><div className="mt-2 flex flex-wrap gap-3">{permissionOptions.map(([value, label]) => <label key={value} className="flex min-h-11 items-center gap-2 rounded-xl border px-3 text-sm font-semibold"><input type="checkbox" value={value} {...form.register("permissions")}/>{label}</label>)}</div></div>
        <Button className="self-end" disabled={create.isPending}><UserPlus className="size-5"/>{create.isPending ? "Đang tạo..." : "Tạo tài khoản"}</Button>
      </form>{create.error && <ErrorText error={create.error}/>}</section>

    <div className="mt-6 grid gap-5 xl:grid-cols-[1fr_390px]">
      <section><div className="grid gap-3 rounded-2xl border bg-white p-4 sm:grid-cols-[1fr_180px_180px]"><label className="relative"><Search className="absolute left-3 top-3.5 size-5 text-slate-400"/><Input className="pl-10" value={filters.q} onChange={event => setFilters({ ...filters, q: event.target.value })} placeholder="Tên, email, số điện thoại..."/></label><Filter value={filters.role} onChange={role => setFilters({ ...filters, role })} first="Mọi vai trò" options={[["customer", "Khách hàng"], ["staff", "Nhân viên"], ["admin", "Admin"]]}/><Filter value={filters.status} onChange={status => setFilters({ ...filters, status })} first="Mọi trạng thái" options={[["active", "Hoạt động"], ["blocked", "Đã khóa"]]}/></div>
        <div className="mt-4 overflow-hidden rounded-2xl border bg-white"><div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left"><thead className="bg-slate-50 text-sm text-slate-500"><tr><th className="p-4">Tài khoản</th><th>Vai trò</th><th>Trạng thái</th><th>Đăng nhập cuối</th><th className="pr-4 text-right">Thao tác</th></tr></thead><tbody className="divide-y">{users.data?.data.items.map(item => <tr key={item._id}><td className="p-4"><strong className="text-emerald-950">{item.name}</strong><span className="block text-sm text-slate-500">{item.email} · {item.phone}</span></td><td><RoleBadge role={item.role}/></td><td><span className={cn("rounded-full px-3 py-1 text-xs font-black", item.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700")}>{item.status === "active" ? "Hoạt động" : "Đã khóa"}</span></td><td className="text-sm text-slate-500">{item.lastLoginAt ? new Date(item.lastLoginAt).toLocaleString("vi-VN") : "Chưa đăng nhập"}</td><td className="pr-4 text-right"><Button size="sm" variant="outline" onClick={() => { setSelected(item); setPassword("") }}>Quản lý</Button></td></tr>)}</tbody></table></div>{users.isLoading && <p className="p-6 text-center">Đang tải tài khoản...</p>}{!users.isLoading && !users.data?.data.items.length && <p className="p-8 text-center text-slate-500">Không tìm thấy tài khoản.</p>}</div>
      </section>
      <aside className="h-fit rounded-3xl border bg-white p-6 xl:sticky xl:top-28">{selected ? <><div className="flex items-center gap-3"><ShieldCheck className="size-7 text-orange-600"/><div><h2 className="font-display text-xl font-bold text-emerald-950">{selected.name}</h2><p className="text-sm text-slate-500">{selected.email}</p></div></div><div className="mt-5 space-y-4"><Field label="Vai trò"><select className="field-select" value={selected.role} disabled={selected._id === currentUser?.id || selected.role === "customer"} onChange={event => setSelected({ ...selected, role: event.target.value as AdminUser["role"] })}><option value="customer">Khách hàng</option><option value="staff">Nhân viên</option><option value="admin">Admin</option></select></Field><Field label="Trạng thái"><select className="field-select" value={selected.status} disabled={selected._id === currentUser?.id} onChange={event => setSelected({ ...selected, status: event.target.value as AdminUser["status"] })}><option value="active">Hoạt động</option><option value="blocked">Khóa tài khoản</option></select></Field><div><span className="text-sm font-bold text-slate-700">Quyền nghiệp vụ</span><div className="mt-2 space-y-2">{permissionOptions.map(([value, label]) => <label className="flex min-h-10 items-center gap-2 text-sm" key={value}><input type="checkbox" checked={selected.permissions.includes(value)} onChange={event => setSelected({ ...selected, permissions: event.target.checked ? [...selected.permissions, value] : selected.permissions.filter(item => item !== value) })}/>{label}</label>)}</div></div><Button className="w-full" disabled={update.isPending} onClick={() => update.mutate({ id: selected._id, body: { role: selected.role, status: selected.status, permissions: selected.permissions } })}>Lưu phân quyền</Button></div>
        <div className="mt-6 border-t pt-5"><label className="text-sm font-bold text-slate-700">Đặt lại mật khẩu<Input className="mt-2" type="password" value={password} onChange={event => setPassword(event.target.value)} placeholder="Tối thiểu 8 ký tự"/></label><Button className="mt-3 w-full" variant="outline" disabled={password.length < 8 || resetPassword.isPending} onClick={() => resetPassword.mutate({ id: selected._id, value: password })}><KeyRound className="size-5"/>Đặt lại và đăng xuất phiên cũ</Button></div>{(update.error || resetPassword.error) && <ErrorText error={(update.error || resetPassword.error) as Error}/>}</> : <p className="py-10 text-center text-slate-500">Chọn một tài khoản để quản lý.</p>}</aside>
    </div>
  </AdminShell>
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) { return <label className="text-sm font-bold text-slate-700">{label}<span className="mt-2 block">{children}</span>{error && <span className="mt-1 block text-xs text-red-600">{error}</span>}</label> }
function Filter({ value, onChange, first, options }: { value: string; onChange: (value: string) => void; first: string; options: string[][] }) { return <select className="field-select" value={value} onChange={event => onChange(event.target.value)}><option value="">{first}</option>{options.map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select> }
function RoleBadge({ role }: { role: AdminUser["role"] }) { const names = { customer: "Khách hàng", staff: "Nhân viên", admin: "Admin" }; return <span className="text-sm font-bold text-slate-700">{names[role]}</span> }
function ErrorText({ error }: { error: Error }) { return <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error.message}</p> }
