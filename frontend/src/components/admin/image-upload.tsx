import { ImagePlus, LoaderCircle, Trash2, Upload } from "lucide-react"
import { useId, useState, type ChangeEvent } from "react"
import { Button } from "@/components/ui/button"
import { adminClient } from "@/lib/admin-client"

interface ImageUploadProps {
  value: string
  onChange: (url: string) => void
  onBusyChange?: (busy: boolean) => void
}

const acceptedTypes = new Set(["image/jpeg", "image/png", "image/webp"])

export function ImageUpload({ value, onChange, onBusyChange }: ImageUploadProps) {
  const inputId = useId()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  const selectImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget
    const file = input.files?.[0]
    if (!file) return
    setError("")
    if (!acceptedTypes.has(file.type)) { setError("Chỉ chọn ảnh JPG, PNG hoặc WEBP"); input.value = ""; return }
    if (file.size > 5 * 1024 * 1024) { setError("Ảnh không được lớn hơn 5MB"); input.value = ""; return }
    setBusy(true); onBusyChange?.(true)
    try {
      const result = await adminClient.uploadImage(file)
      onChange(result.data.url)
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Không thể tải ảnh lên")
    } finally {
      setBusy(false); onBusyChange?.(false); input.value = ""
    }
  }

  return <div className="md:col-span-2 xl:col-span-3">
    <span className="text-sm font-bold text-slate-700">Ảnh đại diện</span>
    <div className="mt-2 grid gap-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 sm:grid-cols-[180px_1fr] sm:items-center">
      {value ? <img className="aspect-[4/3] w-full rounded-xl border bg-white object-cover" src={value} alt="Ảnh vừa chọn"/> : <div className="grid aspect-[4/3] w-full place-items-center rounded-xl bg-white text-slate-400"><ImagePlus className="size-10"/></div>}
      <div><p className="font-bold text-emerald-950">Chọn ảnh trực tiếp từ máy</p><p className="mt-1 text-sm leading-6 text-slate-500">JPG, PNG hoặc WEBP · tối đa 5MB. Nên dùng ảnh ngang, rõ nét.</p><div className="mt-4 flex flex-wrap gap-2"><label htmlFor={inputId} className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 text-sm font-bold text-white shadow transition hover:bg-orange-700"><input id={inputId} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={selectImage}/>{busy ? <LoaderCircle className="size-4 animate-spin"/> : <Upload className="size-4"/>}{busy ? "Đang tải ảnh..." : value ? "Chọn ảnh khác" : "Chọn ảnh"}</label>{value && <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => onChange("")}><Trash2 className="size-4"/>Bỏ ảnh</Button>}</div>{error && <p role="alert" className="mt-3 text-sm font-semibold text-red-600">{error}</p>}</div>
    </div>
  </div>
}
