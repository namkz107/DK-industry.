import { useQuery } from "@tanstack/react-query"
import { MapPin } from "lucide-react"
import { PageHero } from "@/components/page-hero"
import { api } from "@/lib/api"
import { usePageMeta } from "@/hooks/use-page-meta"

export function ProjectsPage() {
  usePageMeta("Dự án", "Hồ sơ năng lực và công trình cơ khí, kết cấu thép, băng tải và hệ thống công nghiệp của Cơ khí Đăng Khoa.")
  const query = useQuery({ queryKey: ["projects"], queryFn: api.projects, staleTime: 5 * 60_000, retry: 1 })
  const projects = query.data?.data || []
  return <><PageHero variant="projects" eyebrow="Hồ sơ năng lực" title="Công trình thực tế" description="Những dự án là minh chứng rõ nhất cho năng lực tổ chức, kỹ thuật và cam kết của Cơ khí Đăng Khoa."/><section className="section-space bg-white"><div className="container-page">{query.isLoading ? <p className="rounded-2xl border p-8 text-center">Đang tải dự án...</p> : query.error ? <p role="alert" className="rounded-2xl bg-red-50 p-6 text-center font-semibold text-red-700">Không thể tải dự án. Vui lòng thử lại sau.</p> : projects.length ? <div className="reveal-grid grid gap-7 md:grid-cols-2">{projects.map(project => <article className="motion-card group overflow-hidden rounded-3xl border border-slate-200" key={project._id}><div className="aspect-[16/10] overflow-hidden"><img className="size-full object-cover" src={project.image} alt={project.title}/></div><div className="p-7"><span className="text-xs font-extrabold uppercase tracking-wider text-orange-700">{project.category}</span><h2 className="mt-3 font-display text-2xl font-bold text-emerald-950">{project.title}</h2><p className="mt-3 flex items-center gap-2 text-sm text-slate-600"><MapPin className="size-4 text-orange-600"/>{project.location} · {project.year}</p>{project.description && <p className="mt-4 line-clamp-3 leading-7 text-slate-600">{project.description}</p>}</div></article>)}</div> : <p className="rounded-2xl border border-dashed p-10 text-center text-slate-500">Chưa có dự án được công bố.</p>}</div></section></>
}
