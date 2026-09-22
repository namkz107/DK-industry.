import { useQuery } from "@tanstack/react-query"
import { ArrowRight, CheckCircle2, Layers3 } from "lucide-react"
import { useOutletContext } from "react-router-dom"
import type { LayoutContext } from "@/components/app-layout"
import { PageHero } from "@/components/page-hero"
import { Button } from "@/components/ui/button"
import { fallbackServices } from "@/data/fallback"
import { usePageMeta } from "@/hooks/use-page-meta"
import { api } from "@/lib/api"

export function ServicesPage() {
  usePageMeta("Dịch vụ cơ khí", "Cắt laser, chấn gấp, phay tiện CNC, chế tạo Jig và hệ thống công nghiệp theo yêu cầu.")
  const { openQuote } = useOutletContext<LayoutContext>()
  const query = useQuery({ queryKey: ["services"], queryFn: api.services, staleTime: 10 * 60_000, retry: 1 })
  const services = query.data?.data?.length ? query.data.data : fallbackServices
  return <><PageHero eyebrow="Năng lực sản xuất" title="Dịch vụ cơ khí theo yêu cầu" description="Chọn đúng công nghệ, vật liệu và quy trình cho từng bài toán — từ một chi tiết mẫu đến sản xuất hàng loạt."/>
    <nav className="sticky top-[76px] z-30 overflow-x-auto border-b border-slate-200 bg-white/95 backdrop-blur" aria-label="Danh mục dịch vụ"><div className="container-page flex min-w-max gap-2 py-3">{services.map(service => <a className="rounded-full px-4 py-2 text-sm font-bold text-slate-700 hover:bg-orange-50 hover:text-orange-700" href={`#${service.slug}`} key={service._id}>{service.name}</a>)}</div></nav>
    <section className="section-space bg-stone-50"><div className="container-page space-y-8">{services.map((service,index) => <article id={service.slug} className="scroll-mt-36 overflow-hidden rounded-3xl border border-slate-200 bg-white lg:grid lg:grid-cols-2" key={service._id}><img className={`min-h-[320px] size-full object-cover ${index%2 ? "lg:order-2" : ""}`} src={service.image} alt={service.name} loading="lazy"/><div className="p-7 sm:p-10 lg:p-12"><span className="text-xs font-black uppercase tracking-[.18em] text-orange-700">Dịch vụ {String(index+1).padStart(2,"0")}</span><h2 className="mt-3 font-display text-3xl font-bold text-emerald-950">{service.name}</h2><p className="mt-4 text-lg leading-8 text-slate-600">{service.summary}</p><div className="mt-7"><h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-emerald-950"><Layers3 className="size-5 text-orange-600"/>Năng lực thực hiện</h3><ul className="mt-4 grid gap-3 sm:grid-cols-2">{service.capabilities.map(item => <li className="flex items-center gap-2 text-sm font-semibold text-slate-700" key={item}><CheckCircle2 className="size-4 shrink-0 text-emerald-700"/>{item}</li>)}</ul></div><div className="mt-6 flex flex-wrap gap-2">{service.materials.map(item => <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700" key={item}>{item}</span>)}</div><Button className="mt-8" onClick={()=>openQuote(service.name)}>Nhận tư vấn dịch vụ <ArrowRight className="size-4"/></Button></div></article>)}</div></section>
  </>
}
