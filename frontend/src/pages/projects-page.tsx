import { useQuery } from "@tanstack/react-query"
import { MapPin } from "lucide-react"
import { PageHero } from "@/components/page-hero"
import { fallbackProjects } from "@/data/fallback"
import { api } from "@/lib/api"
import { usePageMeta } from "@/hooks/use-page-meta"

export function ProjectsPage() {
  usePageMeta("Dự án", "Hồ sơ năng lực và công trình cơ khí, kết cấu thép, băng tải và hệ thống công nghiệp của Cơ khí Đăng Khoa.")
  const query = useQuery({ queryKey: ["projects"], queryFn: api.projects, staleTime: 5 * 60_000, retry: 1 })
  const projects = query.data?.data?.length ? query.data.data : fallbackProjects
  return <><PageHero eyebrow="Hồ sơ năng lực" title="Công trình thực tế" description="Những dự án là minh chứng rõ nhất cho năng lực tổ chức, kỹ thuật và cam kết của Cơ khí Đăng Khoa."/><section className="section-space bg-white"><div className="container-page grid gap-7 md:grid-cols-2">{projects.map(project => <article className="group overflow-hidden rounded-3xl border border-slate-200" key={project._id}><div className="aspect-[16/10] overflow-hidden"><img className="size-full object-cover transition duration-700 group-hover:scale-105" src={project.image} alt={project.title}/></div><div className="p-7"><span className="text-xs font-extrabold uppercase tracking-wider text-orange-700">{project.category}</span><h2 className="mt-3 font-display text-2xl font-bold text-emerald-950">{project.title}</h2><p className="mt-3 flex items-center gap-2 text-sm text-slate-600"><MapPin className="size-4 text-orange-600"/>{project.location} · {project.year}</p></div></article>)}</div></section></>
}
