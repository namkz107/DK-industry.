import { Clock3, Mail, MapPin, Navigation, Phone } from "lucide-react"
import { CompanyMap } from "@/components/company-map"
import { PageHero } from "@/components/page-hero"
import { company, companyMapUrl } from "@/config/company"
import { usePageMeta } from "@/hooks/use-page-meta"

export function ContactPage() {
  usePageMeta("Liên hệ", "Thông tin liên hệ, địa chỉ nhà xưởng và chỉ đường đến Cơ khí Đăng Khoa.")
  return <>
    <PageHero eyebrow="Kết nối với chúng tôi" title="Liên hệ Cơ khí Đăng Khoa" description="Trao đổi trực tiếp với đội ngũ kỹ thuật hoặc đến nhà xưởng để khảo sát năng lực sản xuất."/>
    <section className="section-space bg-stone-50"><div className="container-page grid gap-7 lg:grid-cols-[.8fr_1.2fr]">
      <div className="space-y-4">
        <ContactItem icon={Phone} title="Hotline"><a className="font-bold text-emerald-800 hover:text-orange-700" href={`tel:${company.phone}`}>{company.phoneLabel}</a></ContactItem>
        <ContactItem icon={Mail} title="Email"><a className="break-all font-bold text-emerald-800 hover:text-orange-700" href={`mailto:${company.email}`}>{company.email}</a></ContactItem>
        <ContactItem icon={MapPin} title="Trụ sở & nhà xưởng"><address className="not-italic leading-7 text-slate-600">{company.address}</address><a className="mt-3 inline-flex items-center gap-2 font-bold text-orange-700" href={companyMapUrl} target="_blank" rel="noreferrer"><Navigation className="size-4"/>Mở chỉ đường</a></ContactItem>
        <ContactItem icon={Clock3} title="Hẹn lịch làm việc"><p className="leading-7 text-slate-600">Vui lòng liên hệ trước khi đến để đội ngũ kỹ thuật sắp xếp tiếp đón tại nhà xưởng.</p></ContactItem>
      </div>
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-900/5"><CompanyMap/></div>
    </div></section>
  </>
}

function ContactItem({ icon: Icon, title, children }: { icon: typeof Phone; title: string; children: React.ReactNode }) {
  return <article className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-5"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-orange-50 text-orange-700"><Icon className="size-5"/></span><div><h2 className="font-display text-lg font-bold text-emerald-950">{title}</h2><div className="mt-1">{children}</div></div></article>
}
