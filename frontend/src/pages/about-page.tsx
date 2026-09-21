import { ArrowRight, BadgeCheck, DraftingCompass, Handshake, HeartHandshake, Lightbulb, ShieldCheck, TrendingUp, Users } from "lucide-react"
import { Link } from "react-router-dom"
import { FadeContent } from "@/components/react-bits/fade-content"
import { Button } from "@/components/ui/button"

const services = [
  { icon: DraftingCompass, title: "Tư vấn & thiết kế", text: "Khảo sát, phân tích yêu cầu và thiết kế giải pháp kỹ thuật phù hợp với từng công trình." },
  { icon: Users, title: "Đội ngũ chuyên môn", text: "Kỹ sư và kỹ thuật viên giàu kinh nghiệm đồng hành xuyên suốt từ ý tưởng đến bàn giao." },
  { icon: Handshake, title: "Thi công đồng bộ", text: "Tổ chức gia công, lắp đặt và nghiệm thu theo một quy trình rõ ràng, nhất quán." },
  { icon: ShieldCheck, title: "Cam kết chất lượng", text: "Kiểm soát chất lượng, tiến độ và an toàn để mỗi hạng mục vận hành bền bỉ." },
]

const values = [
  { icon: HeartHandshake, title: "Tận tâm", text: "Lắng nghe nhu cầu và chủ động chịu trách nhiệm đến cùng." },
  { icon: BadgeCheck, title: "Minh bạch", text: "Thông tin, tiến độ và chi phí được trao đổi rõ ràng." },
  { icon: TrendingUp, title: "Phát triển", text: "Không ngừng cải tiến để tạo ra giá trị lâu dài." },
]

const ceoImage = import.meta.env.VITE_CLOUDINARY_CEO_IMAGE_URL

export function AboutPage() {
  return <>
    <section className="relative overflow-hidden bg-emerald-950 py-20 text-white sm:py-28">
      <div className="absolute -right-24 -top-24 size-80 rounded-full border border-white/10" />
      <div className="absolute -bottom-40 right-24 size-80 rounded-full bg-orange-500/10 blur-3xl" />
      <div className="container-page relative grid items-end gap-10 lg:grid-cols-[1.2fr_.8fr]">
        <div><p className="text-xs font-bold uppercase tracking-[.22em] text-orange-400">Về DK Industry</p><h1 className="mt-5 max-w-3xl font-display text-4xl font-bold tracking-tight sm:text-6xl">Kiến tạo giải pháp.<br/><span className="text-orange-400">Đồng hành phát triển.</span></h1></div>
        <p className="max-w-xl text-lg leading-8 text-emerald-50/70">CTY CPTV ĐẦU TƯ XD  TM ĐĂNG KHOA là đối tác tư vấn, chế tạo và thi công cơ khí công nghiệp toàn diện. Chúng tôi kết nối năng lực kỹ thuật với sự tận tâm để biến yêu cầu của khách hàng thành những công trình hiệu quả và bền vững.</p>
      </div>
    </section>

    <section className="section-space bg-stone-50"><div className="container-page grid gap-6 lg:grid-cols-2">
      <FadeContent><article className="h-full rounded-3xl border border-emerald-800/20 bg-emerald-50 p-8 sm:p-10"><p className="text-xs font-extrabold uppercase tracking-[.18em] text-emerald-700">01</p><h2 className="mt-5 font-display text-3xl font-bold text-emerald-950">Sứ mệnh</h2><p className="mt-5 text-lg leading-8 text-slate-600">Cung cấp những giải pháp cơ khí và công nghiệp thiết thực, đồng bộ, giúp doanh nghiệp tối ưu vận hành, kiểm soát chi phí và an tâm về chất lượng trong suốt vòng đời dự án.</p></article></FadeContent>
      <FadeContent delay={.08}><article className="h-full rounded-3xl border border-orange-300 bg-orange-50 p-8 sm:p-10"><p className="text-xs font-extrabold uppercase tracking-[.18em] text-orange-700">02</p><h2 className="mt-5 font-display text-3xl font-bold text-emerald-950">Tầm nhìn</h2><p className="mt-5 text-lg leading-8 text-slate-600">Trở thành thương hiệu đáng tin cậy trong lĩnh vực cơ khí công nghiệp tại Việt Nam, được lựa chọn nhờ năng lực kỹ thuật, quy trình chuyên nghiệp và tinh thần đổi mới liên tục.</p></article></FadeContent>
    </div></section>

    <section className="section-space bg-white"><div className="container-page"><div className="text-center"><p className="text-xs font-bold uppercase tracking-[.2em] text-orange-600">Năng lực của chúng tôi</p><h2 className="heading-section mt-4">Một đầu mối. Trọn giải pháp.</h2><p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-600">Từ tư vấn ban đầu đến vận hành, đội ngũ CTY CPTV ĐẦU TƯ XD  TM ĐĂNG KHOA luôn bám sát mục tiêu và hiệu quả của khách hàng.</p></div><div className="mt-12 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">{services.map(({icon: Icon, title, text}, index) => <FadeContent delay={index * .06} key={title}><article className="h-full rounded-3xl border border-slate-200 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:border-orange-300 hover:shadow-xl"><span className="grid size-14 place-items-center rounded-2xl bg-emerald-950 text-white"><Icon className="size-7"/></span><h3 className="mt-7 font-display text-xl font-bold text-emerald-950">{title}</h3><p className="mt-3 leading-7 text-slate-600">{text}</p></article></FadeContent>)}</div></div></section>

    <section className="section-space bg-stone-100"><div className="container-page"><div className="text-center"><p className="text-xs font-bold uppercase tracking-[.2em] text-orange-600">Kim chỉ nam</p><h2 className="heading-section mt-4">Giá trị cốt lõi</h2></div><div className="mx-auto mt-12 grid max-w-4xl gap-6 md:grid-cols-3">{values.map(({icon: Icon, title, text}, index) => <FadeContent delay={index * .07} key={title}><article className="h-full rounded-3xl border border-slate-200 bg-white p-8 text-center"><Icon className="mx-auto size-9 text-orange-600"/><h3 className="mt-5 font-display text-xl font-bold text-emerald-950">{title}</h3><p className="mt-3 leading-7 text-slate-600">{text}</p></article></FadeContent>)}</div></div></section>

    <section className="section-space bg-white"><div className="container-page"><div className="text-center"><p className="text-xs font-bold uppercase tracking-[.2em] text-orange-600">Đội ngũ lãnh đạo</p><h2 className="heading-section mt-4">Người dẫn đường</h2></div><FadeContent><article className="mx-auto mt-12 grid max-w-4xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-900/5 md:grid-cols-[.85fr_1.15fr]">
      <div className="min-h-[380px] bg-emerald-950">{ceoImage ? <img className="h-full min-h-[380px] w-full object-cover object-top" src={ceoImage} alt="CEO & Founder của DK Industry"/> : <div className="grid h-full min-h-[380px] place-items-center p-10 text-center text-emerald-50/60"><div><Users className="mx-auto size-14"/><p className="mt-4 text-sm">Thêm URL ảnh Cloudinary vào<br/><code>VITE_CLOUDINARY_CEO_IMAGE_URL</code></p></div></div>}</div>
      <div className="flex flex-col justify-center p-8 sm:p-12"><Lightbulb className="size-10 text-orange-600"/><p className="mt-7 text-xs font-extrabold uppercase tracking-[.2em] text-orange-700">CEO & Founder</p><h3 className="mt-3 font-display text-3xl font-bold text-emerald-950">Nhà sáng lập CTY CPTV ĐẦU TƯ XD  TM ĐĂNG KHOA</h3><p className="mt-5 text-lg leading-8 text-slate-600">Dẫn dắt công ty với định hướng lấy chất lượng kỹ thuật, sự minh bạch và hiệu quả thực tế làm nền tảng cho mọi mối quan hệ hợp tác.</p></div>
    </article></FadeContent></div></section>

    <section className="bg-emerald-900 py-16 text-white"><div className="container-page flex flex-col items-start justify-between gap-7 md:flex-row md:items-center"><div><h2 className="font-display text-3xl font-bold sm:text-4xl">Cùng chúng tôi kiến tạo công trình tiếp theo.</h2><p className="mt-3 text-lg text-emerald-50/70">Chia sẻ nhu cầu để đội ngũ kỹ thuật CTY CPTV ĐẦU TƯ XD  TM ĐĂNG KHOA tư vấn giải pháp phù hợp.</p></div><Button asChild size="lg" className="shrink-0 bg-orange-600 hover:bg-orange-500"><Link to="/">Khám phá  <ArrowRight className="size-5"/></Link></Button></div></section>
  </>
}
