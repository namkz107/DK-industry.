import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { CheckCircle2, LoaderCircle, MapPin, Pencil, Plus, Star, Trash2, UserRound } from "lucide-react"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { CustomerShell } from "@/components/customer/customer-shell"
import { PasswordCard } from "@/components/customer/password-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/contexts/auth-context"
import { usePageMeta } from "@/hooks/use-page-meta"
import { customerClient } from "@/lib/customer-client"
import type { Address } from "@/types/customer"

const profileSchema = z.object({ name: z.string().trim().min(2, "Nhập họ tên"), phone: z.string().trim().regex(/^(?:\+84|0)[0-9\s.-]{9,13}$/, "Số điện thoại chưa đúng"), company: z.string().trim().max(200), taxCode: z.string().trim().max(30) })
const addressSchema = z.object({ label: z.string().trim().min(2, "Nhập tên gợi nhớ"), recipientName: z.string().trim().min(2, "Nhập người nhận"), phone: z.string().trim().regex(/^(?:\+84|0)[0-9\s.-]{9,13}$/, "Số điện thoại chưa đúng"), addressLine: z.string().trim().min(5, "Nhập số nhà, tên đường/thôn"), ward: z.string().trim(), district: z.string().trim().min(2, "Nhập quận/huyện"), province: z.string().trim().min(2, "Nhập tỉnh/thành phố"), isDefault: z.boolean() })
type ProfileData = z.infer<typeof profileSchema>
type AddressData = z.infer<typeof addressSchema>
const emptyAddress: AddressData = { label: "Địa chỉ giao hàng", recipientName: "", phone: "", addressLine: "", ward: "", district: "", province: "", isDefault: false }

export function CustomerProfilePage() {
  usePageMeta("Hồ sơ khách hàng", "Quản lý thông tin liên hệ và địa chỉ giao hàng.")
  const queryClient = useQueryClient()
  const { updateUser } = useAuth()
  const [editingId, setEditingId] = useState<string>()
  const [notice, setNotice] = useState("")
  const profile = useQuery({ queryKey: ["customer", "profile"], queryFn: customerClient.profile })
  const profileForm = useForm<ProfileData>({ resolver: zodResolver(profileSchema), defaultValues: { name: "", phone: "", company: "", taxCode: "" } })
  const addressForm = useForm<AddressData>({ resolver: zodResolver(addressSchema), defaultValues: emptyAddress })

  useEffect(() => { if (profile.data?.data) { const { name, phone, company, taxCode } = profile.data.data; profileForm.reset({ name, phone, company, taxCode }) } }, [profile.data, profileForm])

  const updateProfile = useMutation({ mutationFn: customerClient.updateProfile, onSuccess: result => { updateUser(result.data); setNotice(result.message || "Đã lưu hồ sơ"); void queryClient.invalidateQueries({ queryKey: ["customer", "profile"] }) } })
  const saveAddress = useMutation({
    mutationFn: (data: AddressData) => editingId ? customerClient.updateAddress(editingId, data) : customerClient.addAddress(data),
    onSuccess: result => { setNotice(result.message || "Đã lưu địa chỉ"); setEditingId(undefined); addressForm.reset(emptyAddress); void queryClient.invalidateQueries({ queryKey: ["customer", "profile"] }) }
  })
  const deleteAddress = useMutation({ mutationFn: customerClient.deleteAddress, onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["customer", "profile"] }) })
  const setDefault = useMutation({ mutationFn: (address: Address) => customerClient.updateAddress(address._id, { ...address, isDefault: true }), onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["customer", "profile"] }) })

  const edit = (address: Address) => { setEditingId(address._id); addressForm.reset({ label: address.label, recipientName: address.recipientName, phone: address.phone, addressLine: address.addressLine, ward: address.ward || "", district: address.district, province: address.province, isDefault: address.isDefault }); document.getElementById("address-form")?.scrollIntoView({ behavior: "smooth" }) }

  if (profile.isLoading) return <CustomerShell title="Hồ sơ & địa chỉ" description="Đang tải thông tin..."><Loading/></CustomerShell>
  return <CustomerShell title="Hồ sơ & địa chỉ" description="Thông tin chính xác giúp bộ phận kinh doanh liên hệ và giao hàng nhanh hơn.">
    {notice && <p role="status" className="mb-5 flex items-center gap-2 rounded-2xl bg-emerald-50 p-4 font-semibold text-emerald-800"><CheckCircle2 className="size-5"/>{notice}</p>}
    <div className="grid gap-6 xl:grid-cols-[1fr_.9fr]">
      <div className="space-y-6">
        <article className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8"><div className="flex items-center gap-3"><UserRound className="size-6 text-orange-600"/><h2 className="font-display text-2xl font-bold text-emerald-950">Thông tin liên hệ</h2></div><form className="mt-6" onSubmit={profileForm.handleSubmit(data => updateProfile.mutate(data))}><div className="grid gap-4 sm:grid-cols-2"><Field label="Họ và tên" error={profileForm.formState.errors.name?.message}><Input {...profileForm.register("name")}/></Field><Field label="Số điện thoại" error={profileForm.formState.errors.phone?.message}><Input inputMode="tel" {...profileForm.register("phone")}/></Field><Field label="Tên công ty (không bắt buộc)"><Input {...profileForm.register("company")}/></Field><Field label="Mã số thuế (không bắt buộc)"><Input {...profileForm.register("taxCode")}/></Field></div>{updateProfile.error && <ErrorText error={updateProfile.error}/>}<Button disabled={updateProfile.isPending}>{updateProfile.isPending && <LoaderCircle className="size-5 animate-spin"/>}Lưu hồ sơ</Button></form></article>
        <PasswordCard/>
      </div>
      <div className="space-y-6">
        <article className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8"><div className="flex items-center justify-between gap-3"><div><h2 className="font-display text-2xl font-bold text-emerald-950">Địa chỉ đã lưu</h2><p className="mt-1 text-sm text-slate-500">Tối đa 5 địa chỉ.</p></div><MapPin className="size-7 text-orange-600"/></div><div className="mt-5 space-y-3">{profile.data?.data.addresses.length ? profile.data.data.addresses.map(address => <article className="rounded-2xl border border-slate-200 p-4" key={address._id}><div className="flex items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><strong className="text-emerald-950">{address.label}</strong>{address.isDefault && <span className="rounded-full bg-orange-50 px-2 py-1 text-xs font-bold text-orange-700">Mặc định</span>}</div><p className="mt-2 text-sm font-semibold text-slate-700">{address.recipientName} · {address.phone}</p><p className="mt-1 text-sm leading-6 text-slate-500">{[address.addressLine, address.ward, address.district, address.province].filter(Boolean).join(", ")}</p></div></div><div className="mt-3 flex flex-wrap gap-2">{!address.isDefault && <Button size="icon" variant="ghost" title="Đặt làm mặc định" onClick={() => setDefault.mutate(address)}><Star className="size-5"/></Button>}<Button size="icon" variant="ghost" title="Sửa địa chỉ" onClick={() => edit(address)}><Pencil className="size-5"/></Button><Button size="icon" variant="ghost" title="Xóa địa chỉ" onClick={() => { if (window.confirm("Xóa địa chỉ này?")) deleteAddress.mutate(address._id) }}><Trash2 className="size-5 text-red-600"/></Button></div></article>) : <p className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-600">Bạn chưa lưu địa chỉ giao hàng.</p>}</div></article>
        <article id="address-form" className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8"><h2 className="flex items-center gap-2 font-display text-2xl font-bold text-emerald-950"><Plus className="size-6 text-orange-600"/>{editingId ? "Sửa địa chỉ" : "Thêm địa chỉ"}</h2><form className="mt-6" onSubmit={addressForm.handleSubmit(data => saveAddress.mutate(data))}><div className="grid gap-4 sm:grid-cols-2"><Field label="Tên gợi nhớ" error={addressForm.formState.errors.label?.message}><Input placeholder="Nhà máy, Văn phòng..." {...addressForm.register("label")}/></Field><Field label="Người nhận" error={addressForm.formState.errors.recipientName?.message}><Input {...addressForm.register("recipientName")}/></Field><Field label="Số điện thoại" error={addressForm.formState.errors.phone?.message}><Input inputMode="tel" {...addressForm.register("phone")}/></Field><Field label="Tỉnh / Thành phố" error={addressForm.formState.errors.province?.message}><Input {...addressForm.register("province")}/></Field><Field label="Quận / Huyện" error={addressForm.formState.errors.district?.message}><Input {...addressForm.register("district")}/></Field><Field label="Phường / Xã"><Input {...addressForm.register("ward")}/></Field></div><Field label="Số nhà, đường hoặc thôn" error={addressForm.formState.errors.addressLine?.message}><Input {...addressForm.register("addressLine")}/></Field><label className="mb-5 flex min-h-11 items-center gap-3 text-sm font-bold text-slate-700"><input className="size-5 accent-orange-600" type="checkbox" {...addressForm.register("isDefault")}/>Đặt làm địa chỉ mặc định</label>{saveAddress.error && <ErrorText error={saveAddress.error}/>}<div className="flex gap-3"><Button disabled={saveAddress.isPending}>{saveAddress.isPending && <LoaderCircle className="size-5 animate-spin"/>}{editingId ? "Lưu thay đổi" : "Thêm địa chỉ"}</Button>{editingId && <Button type="button" variant="ghost" onClick={() => { setEditingId(undefined); addressForm.reset(emptyAddress) }}>Hủy sửa</Button>}</div></form></article>
      </div>
    </div>
  </CustomerShell>
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) { return <label className="mb-4 block text-sm font-bold text-slate-700"><span className="mb-2 block">{label}</span>{children}{error && <span className="mt-1 block text-sm text-red-600">{error}</span>}</label> }
function ErrorText({ error }: { error: Error }) { return <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error.message}</p> }
function Loading() { return <div className="grid min-h-60 place-items-center"><LoaderCircle className="size-8 animate-spin text-orange-600"/></div> }
