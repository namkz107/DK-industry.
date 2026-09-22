import { useQuery } from "@tanstack/react-query"
import { ArrowRight, PackageSearch, Search } from "lucide-react"
import { useMemo, useState } from "react"
import { useOutletContext } from "react-router-dom"
import type { LayoutContext } from "@/components/app-layout"
import { PageHero } from "@/components/page-hero"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { fallbackProducts } from "@/data/fallback"
import { usePageMeta } from "@/hooks/use-page-meta"
import { api } from "@/lib/api"
import { formatPrice } from "@/lib/utils"

export function ProductsPage() {
  usePageMeta("Sản phẩm công nghiệp", "Băng tải, bàn thao tác, giá kệ, tủ công nghiệp, thiết bị phòng sạch và sản phẩm inox theo yêu cầu.")
  const { openQuote } = useOutletContext<LayoutContext>()
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("Tất cả")
  const query = useQuery({ queryKey: ["products"], queryFn: api.products, staleTime: 5 * 60_000, retry: 1 })
  const products = query.data?.data?.length ? query.data.data : fallbackProducts
  const categories = useMemo(() => ["Tất cả", ...new Set(products.map(item => item.category))], [products])
  const filtered = useMemo(() => products.filter(item => (category === "Tất cả" || item.category === category) && `${item.name} ${item.category}`.toLowerCase().includes(search.toLowerCase())), [products, search, category])

  return <>
    <PageHero eyebrow="Thiết bị & vật tư" title="Sản phẩm công nghiệp" description="Phân nhóm rõ ràng, thông tin dễ hiểu và luôn có kỹ sư hỗ trợ lựa chọn đúng sản phẩm."/>
    <section className="section-space bg-stone-50"><div className="container-page">
      <label className="relative mx-auto block max-w-2xl"><span className="sr-only">Tìm sản phẩm</span><Search className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400"/><Input className="min-h-14 pl-12" value={search} onChange={event => setSearch(event.target.value)} placeholder="Nhập tên sản phẩm hoặc nhóm thiết bị..."/></label>
      <div className="my-8 flex flex-wrap justify-center gap-2" aria-label="Lọc theo danh mục">{categories.map(item => <button className={`min-h-11 rounded-full border px-4 text-sm font-bold transition ${category===item ? "border-emerald-950 bg-emerald-950 text-white" : "border-slate-300 bg-white text-slate-700 hover:border-orange-500"}`} onClick={()=>setCategory(item)} key={item}>{item}</button>)}</div>
      <p className="mb-6 text-sm font-semibold text-slate-500">Hiển thị {filtered.length} sản phẩm</p>
      {filtered.length ? <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{filtered.map(product => <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl" key={product._id}><img loading="lazy" className="aspect-[4/3] w-full object-cover" src={product.image} alt={product.name}/><div className="p-6"><span className="text-xs font-bold uppercase tracking-wider text-orange-700">{product.category}</span><h2 className="mt-2 font-display text-xl font-bold text-emerald-950">{product.name}</h2><p className="mt-3 font-bold text-orange-700">{formatPrice(product.price)} {product.price && `/ ${product.unit}`}</p><Button className="mt-6 w-full" onClick={() => openQuote(product.name)}>Yêu cầu báo giá <ArrowRight className="size-4"/></Button></div></article>)}</div> : <div className="rounded-3xl border border-dashed border-slate-300 bg-white py-20 text-center"><PackageSearch className="mx-auto size-12 text-slate-300"/><h2 className="mt-4 text-xl font-bold">Không tìm thấy sản phẩm</h2><p className="mt-2 text-slate-600">Thử một từ khóa ngắn hơn hoặc chọn “Tất cả”.</p></div>}
    </div></section>
  </>
}
