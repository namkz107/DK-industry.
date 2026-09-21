import * as Dialog from "@radix-ui/react-dialog"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation } from "@tanstack/react-query"
import { CheckCircle2, LoaderCircle, Send, X } from "lucide-react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

const quoteSchema = z.object({
  name: z.string().trim().min(2, "Vui lòng nhập họ và tên"),
  phone: z.string().trim().regex(/^[0-9+\s]{9,15}$/, "Số điện thoại chưa đúng"),
  email: z.string().trim().email("Email chưa đúng").or(z.literal("")),
  serviceType: z.string().min(1, "Vui lòng chọn nhu cầu"),
  budget: z.string(),
  message: z.string().trim().max(2000, "Nội dung tối đa 2.000 ký tự"),
})
type QuoteData = z.infer<typeof quoteSchema>

export function QuoteDialog({ open, onOpenChange, product }: { open: boolean; onOpenChange: (value: boolean) => void; product?: string }) {
  const form = useForm<QuoteData>({ resolver: zodResolver(quoteSchema), defaultValues: { name: "", phone: "", email: "", serviceType: product ? "Cung ứng thiết bị" : "", budget: "Chưa xác định", message: product ? `Tôi cần báo giá: ${product}` : "" } })
  const mutation = useMutation({ mutationFn: api.createLead, onSuccess: () => form.reset() })
  const submit = form.handleSubmit(data => mutation.mutate(data))

  return <Dialog.Root open={open} onOpenChange={onOpenChange}>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-50 bg-emerald-950/75 backdrop-blur-sm data-[state=open]:animate-in" />
      <Dialog.Content className="fixed left-1/2 top-1/2 z-50 grid max-h-[94vh] w-[min(960px,calc(100%-24px))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl bg-white shadow-2xl outline-none lg:grid-cols-[.8fr_1.2fr]">
        <div className="hidden bg-emerald-950 p-10 text-white lg:block">
          <p className="mb-5 text-xs font-bold uppercase tracking-[.2em] text-orange-400">Yêu cầu tư vấn</p>
          <Dialog.Title className="font-display text-4xl font-semibold leading-tight">Cho chúng tôi biết bài toán của bạn.</Dialog.Title>
          <Dialog.Description className="mt-5 text-base leading-7 text-emerald-50/70">Kỹ sư DK Industry sẽ phân tích yêu cầu và phản hồi trong vòng 2 giờ làm việc.</Dialog.Description>
          <ul className="mt-9 space-y-4 text-sm font-semibold">{["Tư vấn hoàn toàn miễn phí", "Bảo mật thông tin dự án", "Giải pháp đúng nhu cầu"].map(item => <li className="flex items-center gap-3" key={item}><CheckCircle2 className="size-5 text-orange-400" />{item}</li>)}</ul>
        </div>
        <form className="p-6 sm:p-10" onSubmit={submit} noValidate>
          <div className="mb-7 pr-8 lg:hidden"><Dialog.Title className="font-display text-2xl font-bold text-emerald-950">Yêu cầu tư vấn</Dialog.Title><Dialog.Description className="mt-2 text-sm leading-6 text-slate-600">Điền thông tin, chúng tôi sẽ gọi lại trong vòng 2 giờ làm việc.</Dialog.Description></div>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Họ và tên" error={form.formState.errors.name?.message}><Input autoFocus autoComplete="name" placeholder="Nguyễn Văn A" {...form.register("name")} /></Field>
            <Field label="Số điện thoại" error={form.formState.errors.phone?.message}><Input inputMode="tel" autoComplete="tel" placeholder="0912 345 678" {...form.register("phone")} /></Field>
          </div>
          <Field label="Email (không bắt buộc)" error={form.formState.errors.email?.message}><Input type="email" autoComplete="email" placeholder="email@congty.vn" {...form.register("email")} /></Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Bạn cần hỗ trợ gì?" error={form.formState.errors.serviceType?.message}><select className="field-select" {...form.register("serviceType")}><option value="">Chọn dịch vụ</option><option>Tư vấn kỹ thuật</option><option>Gia công cơ khí</option><option>Thi công công nghiệp</option><option>Cung ứng thiết bị</option></select></Field>
            <Field label="Ngân sách dự kiến"><select className="field-select" {...form.register("budget")}><option>Chưa xác định</option><option>Dưới 100 triệu</option><option>100 - 500 triệu</option><option>500 triệu - 2 tỷ</option><option>Trên 2 tỷ</option></select></Field>
          </div>
          <Field label="Mô tả yêu cầu" error={form.formState.errors.message?.message}><Textarea placeholder="Loại công trình, thông số, số lượng, tiến độ mong muốn..." {...form.register("message")} /></Field>
          <Button className="mt-2 w-full" size="lg" disabled={mutation.isPending}>{mutation.isPending ? <><LoaderCircle className="size-5 animate-spin" />Đang gửi...</> : <>Gửi yêu cầu <Send className="size-5" /></>}</Button>
          {mutation.isSuccess && <p role="status" className="mt-4 rounded-xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">Yêu cầu đã được gửi. Chúng tôi sẽ liên hệ với bạn sớm nhất.</p>}
          {mutation.isError && <p role="alert" className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">Không thể kết nối backend. Vui lòng gọi 0912 345 678 hoặc thử lại sau.</p>}
        </form>
        <Dialog.Close className="absolute right-4 top-4 grid size-11 place-items-center rounded-full bg-slate-100 text-slate-700 transition hover:bg-orange-100 hover:text-orange-700" aria-label="Đóng"><X className="size-5" /></Dialog.Close>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return <label className="mb-5 block text-sm font-bold text-slate-700"><span className="mb-2 block">{label}</span>{children}{error && <span className="mt-1.5 block text-sm font-medium text-red-600">{error}</span>}</label>
}
