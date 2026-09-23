import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Archive, Boxes, FolderKanban, Pencil, Plus, Search, Wrench } from "lucide-react"
import { useEffect, useState, type ReactNode } from "react"
import { useForm, type UseFormRegisterReturn } from "react-hook-form"
import { useSearchParams } from "react-router-dom"
import { z } from "zod"
import { AdminShell } from "@/components/admin/admin-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { usePageMeta } from "@/hooks/use-page-meta"
import { adminClient } from "@/lib/admin-client"
import { cn, formatPrice } from "@/lib/utils"
import type { AdminProduct, AdminProject, AdminService } from "@/types/admin"

type Kind = "products" | "services" | "projects"
type ContentItem = AdminProduct | AdminService | AdminProject
const schema = z.object({
  name: z.string().trim().min(2, "Tên phải có ít nhất 2 ký tự"), slug: z.string(), category: z.string(), summary: z.string(), description: z.string(), sku: z.string(), price: z.string(), stock: z.string(), unit: z.string(), client: z.string(), location: z.string(), year: z.string(), image: z.string(), featured: z.boolean(), visible: z.boolean(), priceOnRequest: z.boolean(),
})
type Values = z.infer<typeof schema>
const defaults: Values = { name: "", slug: "", category: "", summary: "", description: "", sku: "", price: "0", stock: "0", unit: "sản phẩm", client: "", location: "", year: String(new Date().getFullYear()), image: "", featured: false, visible: true, priceOnRequest: false }
const tabs: Array<{ key: Kind; label: string; icon: typeof Boxes }> = [{ key: "products", label: "Sản phẩm", icon: Boxes }, { key: "services", label: "Dịch vụ", icon: Wrench }, { key: "projects", label: "Dự án", icon: FolderKanban }]

export function AdminContentPage() {
  usePageMeta("Sản phẩm và nội dung", "Quản lý dữ liệu hiển thị trên website.")
  const [params, setParams] = useSearchParams(); const queryClient = useQueryClient()
  const kind = (tabs.some(item => item.key === params.get("tab")) ? params.get("tab") : "products") as Kind
  const [filters, setFilters] = useState({ q: "", state: "" }); const [editing, setEditing] = useState<ContentItem | null>(null); const [showForm, setShowForm] = useState(false)
  const products = useQuery({ queryKey: ["admin", "products", filters], queryFn: () => adminClient.products(filters), enabled: kind === "products" })
  const services = useQuery({ queryKey: ["admin", "services", filters], queryFn: () => adminClient.services(filters), enabled: kind === "services" })
  const projects = useQuery({ queryKey: ["admin", "projects", filters], queryFn: () => adminClient.projects(filters), enabled: kind === "projects" })
  const current = kind === "products" ? products : kind === "services" ? services : projects
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: defaults })
  const refresh = () => { void queryClient.invalidateQueries({ queryKey: ["admin", kind] }); void queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] }) }
  const save = useMutation<unknown, Error, { id?: string; body: Record<string, unknown> }>({ mutationFn: ({ id, body }) => {
    if (kind === "products") return id ? adminClient.updateProduct(id, body) : adminClient.createProduct(body)
    if (kind === "services") return id ? adminClient.updateService(id, body) : adminClient.createService(body)
    return id ? adminClient.updateProject(id, body) : adminClient.createProject(body)
  }, onSuccess: () => { refresh(); closeForm() } })
  const hide = useMutation<unknown, Error, string>({ mutationFn: (id) => kind === "products" ? adminClient.hideProduct(id) : kind === "services" ? adminClient.hideService(id) : adminClient.hideProject(id), onSuccess: refresh })

  useEffect(() => { setEditing(null); setShowForm(false); form.reset(defaults) }, [kind, form])
  const closeForm = () => { setEditing(null); setShowForm(false); form.reset(defaults) }
  const openCreate = () => { setEditing(null); form.reset(defaults); setShowForm(true) }
  const openEdit = (item: ContentItem) => {
    setEditing(item); setShowForm(true)
    if ("stock" in item) form.reset({ ...defaults, name: item.name, slug: item.slug, category: item.category, description: item.description || "", sku: item.sku || "", price: String(item.price || 0), stock: String(item.stock), unit: item.unit, image: item.image || "", featured: item.featured, visible: item.active, priceOnRequest: item.priceOnRequest })
    else if ("summary" in item) form.reset({ ...defaults, name: item.name, slug: item.slug, summary: item.summary, description: item.description || "", image: item.image || "", featured: item.featured, visible: item.published })
    else form.reset({ ...defaults, name: item.title, slug: item.slug, category: item.category, client: item.client || "", location: item.location || "", year: item.year || "", description: item.description || "", image: item.image || "", featured: item.featured, visible: item.published })
  }
  const submit = (values: Values) => {
    const common = { slug: values.slug, description: values.description, image: values.image, featured: values.featured }
    const body = kind === "products" ? { ...common, name: values.name, category: values.category, sku: values.sku, price: Number(values.price), stock: Number(values.stock), unit: values.unit, priceOnRequest: values.priceOnRequest, active: values.visible }
      : kind === "services" ? { ...common, name: values.name, summary: values.summary, published: values.visible }
      : { ...common, title: values.name, category: values.category, client: values.client, location: values.location, year: values.year, published: values.visible }
    save.mutate({ id: editing?._id, body })
  }

  return <AdminShell title="Sản phẩm và nội dung" description="Cập nhật dữ liệu hiển thị ngoài website; thao tác ẩn vẫn giữ lịch sử và liên kết cũ." action={<Button onClick={openCreate}><Plus className="size-5"/>Thêm mới</Button>}>
    <div className="flex gap-2 overflow-x-auto rounded-2xl border bg-white p-2">{tabs.map(({ key, label, icon: Icon }) => <button key={key} onClick={() => setParams({ tab: key })} className={cn("flex min-h-12 shrink-0 items-center gap-2 rounded-xl px-5 font-bold", kind === key ? "bg-orange-600 text-white" : "text-slate-600 hover:bg-slate-100")}><Icon className="size-5"/>{label}</button>)}</div>
    {showForm && <section className="mt-5 rounded-3xl border border-orange-200 bg-white p-6 shadow-sm"><div className="flex justify-between gap-3"><div><h2 className="font-display text-2xl font-bold text-emerald-950">{editing ? "Chỉnh sửa" : "Thêm mới"} {tabName(kind).toLowerCase()}</h2><p className="text-sm text-slate-500">Các trường quan trọng được giữ gọn để đội ngũ dễ cập nhật.</p></div><Button variant="ghost" onClick={closeForm}>Đóng</Button></div><form className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3" onSubmit={form.handleSubmit(submit)}>
      <Field label={kind === "projects" ? "Tên dự án" : "Tên"} error={form.formState.errors.name?.message}><Input {...form.register("name")}/></Field>{kind !== "services" && <Field label="Danh mục"><Input {...form.register("category")} placeholder="Gia công CNC"/></Field>}
      {kind === "products" && <><Field label="Mã SKU"><Input {...form.register("sku")}/></Field><Field label="Giá bán"><Input type="number" min="0" {...form.register("price")}/></Field><Field label="Tồn kho"><Input type="number" min="0" {...form.register("stock")}/></Field><Field label="Đơn vị"><Input {...form.register("unit")}/></Field></>}
      {kind === "services" && <Field label="Mô tả ngắn"><Input {...form.register("summary")}/></Field>}
      {kind === "projects" && <><Field label="Khách hàng"><Input {...form.register("client")}/></Field><Field label="Địa điểm"><Input {...form.register("location")}/></Field><Field label="Năm"><Input {...form.register("year")}/></Field></>}
      <Field label="Ảnh đại diện (URL)"><Input {...form.register("image")}/></Field><label className="md:col-span-2 xl:col-span-3 text-sm font-bold text-slate-700">Mô tả<Textarea className="mt-2 min-h-28" {...form.register("description")}/></label>
      <div className="flex flex-wrap items-center gap-5 md:col-span-2 xl:col-span-3"><Check register={form.register("featured")} label="Nổi bật"/><Check register={form.register("visible")} label={kind === "products" ? "Đang bán" : "Đang công khai"}/>{kind === "products" && <Check register={form.register("priceOnRequest")} label="Giá liên hệ"/>}<Button disabled={save.isPending}>{save.isPending ? "Đang lưu..." : "Lưu nội dung"}</Button></div>
    </form>{save.error && <ErrorText error={save.error as Error}/>}</section>}
    <div className="mt-5 grid gap-3 rounded-2xl border bg-white p-4 sm:grid-cols-[1fr_190px]"><label className="relative"><Search className="absolute left-3 top-3.5 size-5 text-slate-400"/><Input className="pl-10" value={filters.q} onChange={event => setFilters({ ...filters, q: event.target.value })} placeholder={`Tìm ${tabName(kind).toLowerCase()}...`}/></label><select className="field-select" value={filters.state} onChange={event => setFilters({ ...filters, state: event.target.value })}><option value="">Tất cả trạng thái</option><option value="published">Đang hiển thị</option><option value="hidden">Đã ẩn</option></select></div>
    <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{current.data?.data.items.map(item => <ContentCard key={item._id} item={item} onEdit={() => openEdit(item)} onHide={() => { if (window.confirm("Ẩn nội dung này khỏi website?")) hide.mutate(item._id) }}/>)}</div>{current.isLoading && <p className="mt-4 rounded-2xl bg-white p-8 text-center">Đang tải nội dung...</p>}{!current.isLoading && !current.data?.data.items.length && <p className="mt-4 rounded-2xl bg-white p-10 text-center text-slate-500">Chưa có dữ liệu phù hợp.</p>}
  </AdminShell>
}

function ContentCard({ item, onEdit, onHide }: { item: ContentItem; onEdit: () => void; onHide: () => void }) { const title = "title" in item ? item.title : item.name; const visible = "active" in item ? item.active : item.published; return <article className="overflow-hidden rounded-3xl border bg-white shadow-sm">{item.image ? <img className="h-40 w-full object-cover" src={item.image} alt={title}/> : <div className="grid h-32 place-items-center bg-slate-100"><Boxes className="size-10 text-slate-300"/></div>}<div className="p-5"><div className="flex items-start justify-between gap-3"><div><span className={cn("rounded-full px-3 py-1 text-xs font-black", visible ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500")}>{visible ? "Đang hiển thị" : "Đã ẩn"}</span><h2 className="mt-3 font-display text-xl font-bold text-emerald-950">{title}</h2></div>{"stock" in item && <strong className={cn("text-sm", item.stock <= 5 ? "text-red-600" : "text-slate-600")}>Kho: {item.stock}</strong>}</div>{"price" in item && <p className="mt-3 font-bold text-orange-700">{item.priceOnRequest ? "Giá liên hệ" : formatPrice(item.price || 0)}</p>}{"summary" in item && <p className="mt-3 line-clamp-2 text-sm text-slate-600">{item.summary}</p>}{"client" in item && <p className="mt-3 text-sm text-slate-600">{item.client || item.category} · {item.year}</p>}<div className="mt-5 flex gap-2"><Button size="sm" variant="outline" onClick={onEdit}><Pencil className="size-4"/>Sửa</Button>{visible && <Button size="sm" variant="ghost" onClick={onHide}><Archive className="size-4"/>Ẩn</Button>}</div></div></article> }
function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) { return <label className="text-sm font-bold text-slate-700">{label}<span className="mt-2 block">{children}</span>{error && <span className="mt-1 block text-xs text-red-600">{error}</span>}</label> }
function Check({ register, label }: { register: UseFormRegisterReturn; label: string }) { return <label className="flex min-h-11 items-center gap-2 text-sm font-bold text-slate-700"><input type="checkbox" {...register}/>{label}</label> }
function tabName(kind: Kind) { return kind === "products" ? "Sản phẩm" : kind === "services" ? "Dịch vụ" : "Dự án" }
function ErrorText({ error }: { error: Error }) { return <p role="alert" className="mt-4 rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-700">{error.message}</p> }
