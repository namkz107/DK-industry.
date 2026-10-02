import { AnimatePresence, motion, useInView, useReducedMotion } from "motion/react"
import { ArrowRight, BadgeCheck, Factory, Headphones, Ruler, Wrench, type LucideIcon } from "lucide-react"
import { useRef, useState, type KeyboardEvent } from "react"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"

interface Capability {
  label: string
  eyebrow: string
  title: string
  description: string
  points: string[]
  image: string
  alt: string
  icon: LucideIcon
}

const capabilities: Capability[] = [
  {
    label: "Tư vấn",
    eyebrow: "Hiểu đúng bài toán",
    title: "Khảo sát kỹ. Đề xuất đúng.",
    description: "Đội ngũ kỹ thuật đi từ hiện trạng sản xuất, mục tiêu vận hành và ngân sách để xây dựng phương án khả thi ngay từ đầu.",
    points: ["Khảo sát trực tiếp", "Phương án rõ ràng", "Dự toán minh bạch"],
    image: "/images/heroes/about-hero.jpg",
    alt: "Kỹ sư Đăng Khoa khảo sát và tư vấn kỹ thuật",
    icon: Ruler,
  },
  {
    label: "Chế tạo",
    eyebrow: "Biến thiết kế thành sản phẩm",
    title: "Gia công chính xác. Kiểm soát từng bước.",
    description: "Từ cắt, chấn, hàn đến tiện CNC, mỗi chi tiết đều được sản xuất theo bản vẽ và kiểm tra trước khi chuyển sang công đoạn tiếp theo.",
    points: ["Thiết bị hiện đại", "Vật tư rõ nguồn gốc", "Kiểm soát chất lượng"],
    image: "/images/heroes/services-hero.jpg",
    alt: "Xưởng chế tạo và gia công cơ khí Đăng Khoa",
    icon: Factory,
  },
  {
    label: "Thi công",
    eyebrow: "Đưa giải pháp vào vận hành",
    title: "Lắp đặt đồng bộ. Bám sát tiến độ.",
    description: "Đội thi công phối hợp chặt chẽ tại công trường, quản lý an toàn và nghiệm thu theo từng hạng mục để hạn chế gián đoạn sản xuất.",
    points: ["Kế hoạch theo mốc", "An toàn công trường", "Nghiệm thu đầy đủ"],
    image: "/images/heroes/projects-hero.jpg",
    alt: "Đội ngũ Đăng Khoa thi công công trình công nghiệp",
    icon: Wrench,
  },
  {
    label: "Bảo trì",
    eyebrow: "Đồng hành sau bàn giao",
    title: "Phản hồi nhanh. Vận hành bền vững.",
    description: "Sau nghiệm thu, Đăng Khoa tiếp tục hỗ trợ kiểm tra, bảo trì và xử lý phát sinh để hệ thống duy trì hiệu suất ổn định.",
    points: ["Hỗ trợ kỹ thuật", "Lịch bảo trì chủ động", "Bảo hành rõ ràng"],
    image: "/images/heroes/contact-hero.jpg",
    alt: "Kỹ thuật viên Đăng Khoa bảo trì hệ thống",
    icon: Headphones,
  },
]

export function CapabilityShowcase() {
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)
  const sectionRef = useRef<HTMLElement>(null)
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([])
  const inView = useInView(sectionRef, { amount: .35 })
  const reduceMotion = useReducedMotion()
  const current = capabilities[active]
  const Icon = current.icon

  const selectTab = (index: number) => {
    setActive(index)
    tabRefs.current[index]?.focus()
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight" && event.key !== "Home" && event.key !== "End") return
    event.preventDefault()
    if (event.key === "Home") return selectTab(0)
    if (event.key === "End") return selectTab(capabilities.length - 1)
    const step = event.key === "ArrowRight" ? 1 : -1
    selectTab((active + step + capabilities.length) % capabilities.length)
  }

  return <section
    ref={sectionRef}
    className="section-space overflow-hidden bg-stone-100"
    aria-labelledby="capability-heading"
  >
    <div className="container-page">
      <div className="mx-auto max-w-3xl text-center">
        <p className="mb-5 flex items-center justify-center gap-3 text-xs font-extrabold uppercase tracking-[.2em] text-orange-700"><span className="h-0.5 w-8 bg-orange-500" />Năng lực cốt lõi</p>
        <h2 id="capability-heading" className="heading-section">Một quy trình liền mạch.<br/><span>Một đối tác xuyên suốt.</span></h2>
        <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-600">Từ bài toán ban đầu đến vận hành dài hạn, mỗi giai đoạn đều có đội ngũ Đăng Khoa đồng hành.</p>
      </div>

      <div
        className="mx-auto mt-9 flex w-fit max-w-full overflow-x-auto rounded-full border border-slate-200 bg-white p-1.5 shadow-lg shadow-slate-900/8"
        role="tablist"
        aria-label="Các giai đoạn năng lực"
        onKeyDown={handleKeyDown}
      >
        {capabilities.map((item, index) => <button
          ref={node => { tabRefs.current[index] = node }}
          key={item.label}
          id={`capability-tab-${index}`}
          type="button"
          role="tab"
          aria-selected={active === index}
          aria-controls="capability-panel"
          tabIndex={active === index ? 0 : -1}
          className={`relative min-h-12 shrink-0 rounded-full px-5 text-sm font-extrabold transition-colors sm:px-7 ${active === index ? "text-white" : "text-slate-700 hover:text-emerald-900"}`}
          onClick={() => setActive(index)}
        >
          {active === index && <motion.span
            layoutId="capability-active-tab"
            className="absolute inset-0 rounded-full bg-emerald-950 shadow-md"
            transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 34 }}
          />}
          <span className="relative z-10">{item.label}</span>
        </button>)}
      </div>

      <div id="capability-panel" role="tabpanel" aria-labelledby={`capability-tab-${active}`} className="mt-14 grid items-center gap-14 lg:grid-cols-[1.08fr_.92fr] lg:gap-20">
        <div className="relative min-h-[400px] sm:min-h-[460px]">
          <motion.div
            className={`capability-carousel absolute inset-0${inView && !paused && !reduceMotion ? " capability-carousel--running" : ""}`}
            initial={reduceMotion ? false : { opacity: 0, x: -30, scale: .96 }}
            whileInView={{ opacity: 1, x: 0, scale: 1 }}
            viewport={{ once: true, amount: .3 }}
            transition={{ duration: reduceMotion ? 0 : .65, ease: [.2, .75, .2, 1] }}
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onFocusCapture={() => setPaused(true)}
            onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false) }}
          >
            <div className="capability-carousel__inner">
              {capabilities.map((item, index) => {
                const CardIcon = item.icon
                return <button
                  key={item.label}
                  type="button"
                  className={`capability-carousel__card${active === index ? " capability-carousel__card--active" : ""}`}
                  style={{ transform: `rotateY(${index * 90}deg) translateZ(var(--carousel-depth))` }}
                  aria-label={`Chọn giai đoạn ${item.label}`}
                  aria-pressed={active === index}
                  onClick={() => setActive(index)}
                >
                  <span className="capability-carousel__surface">
                    <img src={item.image} alt={item.alt} />
                    <span className="capability-carousel__shade" />
                    <span className="capability-carousel__label"><CardIcon className="size-5" /><span><small>Giai đoạn 0{index + 1}</small><strong>{item.label}</strong></span></span>
                  </span>
                </button>
              })}
            </div>
          </motion.div>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`copy-${active}`}
            initial={reduceMotion ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -16 }}
            transition={{ duration: reduceMotion ? 0 : .42, ease: [.2, .75, .2, 1] }}
          >
            <span className="grid size-13 place-items-center rounded-2xl bg-emerald-950 text-white shadow-lg shadow-emerald-950/15"><Icon className="size-6" /></span>
            <p className="mt-7 text-xs font-black uppercase tracking-[.2em] text-orange-700">{current.eyebrow}</p>
            <h3 className="mt-3 font-display text-3xl font-bold leading-tight tracking-[-.035em] text-emerald-950 sm:text-4xl">{current.title}</h3>
            <p className="mt-5 text-lg leading-8 text-slate-600">{current.description}</p>
            <ul className="mt-7 grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              {current.points.map(point => <li className="flex items-center gap-2 text-sm font-bold text-slate-700" key={point}><BadgeCheck className="size-5 shrink-0 text-orange-600" />{point}</li>)}
            </ul>
            <Button asChild variant="dark" className="mt-8"><Link to="/dich-vu">Khám phá dịch vụ <ArrowRight className="size-5" /></Link></Button>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  </section>
}
