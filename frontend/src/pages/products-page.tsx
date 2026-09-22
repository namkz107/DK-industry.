import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ArrowRight, CheckCircle2, LoaderCircle, PackageSearch, Search, ShoppingCart } from "lucide-react"
import { useMemo, useState } from "react"
import { useNavigate, useOutletContext } from "react-router-dom"
import type { LayoutContext } from "@/components/app-layout"
import { PageHero } from "@/components/page-hero"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/contexts/auth-context"
import { fallbackProducts } from "@/data/fallback"
import { usePageMeta } from "@/hooks/use-page-meta"
import { api } from "@/lib/api"
import { customerClient } from "@/lib/customer-client"
import { formatPrice } from "@/lib/utils"
import type { Product } from "@/types"

export function ProductsPage() {
  usePageMeta("Sản phẩm công nghiệp", "Băng tải, bàn thao tác, giá kệ, tủ công nghiệp, thiết bị phòng sạch và sản phẩm inox theo yêu cầu.")
  const { openQuote } = useOutletContext<LayoutContext>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("Tất cả")
  const [notice, setNotice] = useState("")
  const query = useQuery({ queryKey: ["products"], queryFn: api.products, staleTime: 5 * 60_000, retry: 1 })
  const products = query.data?.data?.length ? query.data.data : fallbackProducts
  const categories = useMemo(() => ["Tất cả", ...new Set(products.map(item => item.category))], [products])
  const filtered = useMemo(() => products.filter(item => (category === "Tất cả" || item.category === category) && `${item.name} ${item.category}`.toLowerCase().includes(search.toLowerCase())), [products, search, category])
  const add = useMutation({ mutationFn: (product: Product) => customerClient.addCartItem(product._id), onSuccess: (_, product) => { setNotice(`Đã thêm “${product.name}” vào giỏ hàng.`); void queryClient.invalidateQueries({ queryKey: ["customer", "cart"] }); void queryClient.invalidateQueries({ queryKey: ["customer", "summary"] }) } })

  const addToCart = (product: Product) => {
    if (!user) { navigate("/dang-nhap", { state: { from: "/san-pham" } }); return }
    if (user.role !== "customer") { openQuote(product.name); return }
    add.mutate(product)
  }
  const requestQuote = (product: Product) => {
    if (user?.role === "customer" && /^[a-f\d]{24}$/i.test(product._id)) navigate(`/tai-khoan/yeu-cau?productId=${product._id}&product=${encodeURIComponent(product.name)}`)
    else openQuote(product.name)
  }

  return <>
    <PageHero eyebrow="Thiết bị & vật tư" title="Sản phẩm công nghiệp" description="Sản phẩm có giá được đặt trực tiếp; hàng chế tạo hoặc số lượng dự án sẽ chuyển sang yêu cầu báo giá."/>
    <section className="section-space bg-stone-50"><div className="container-page">
      {notice && <p role="status" className="mx-auto mb-5 flex max-w-2xl items-center gap-2 rounded-2xl bg-emerald-50 p-4 font-semibold text-emerald-800"><CheckCircle2 className="size-5"/>{notice}</p>}
      {add.error && <p role="alert" className="mx-auto mb-5 max-w-2xl rounded-2xl bg-red-50 p-4 font-semibold text-red-700">{add.error.message}</p>}
      <label className="relative mx-auto block max-w-2xl"><span className="sr-only">Tìm sản phẩm</span><Search className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400"/><Input className="min-h-14 pl-12" value={search} onChange={event => setSearch(event.target.value)} placeholder="Nhập tên sản phẩm hoặc nhóm thiết bị..."/></label>
      <div className="my-8 flex flex-wrap justify-center gap-2" aria-label="Lọc theo danh mục">{categories.map(item => <button className={`min-h-11 rounded-full border px-4 text-sm font-bold transition ${category===item ? "border-emerald-950 bg-emerald-950 text-white" : "border-slate-300 bg-white text-slate-700 hover:border-orange-500"}`} onClick={()=>setCategory(item)} key={item}>{item}</button>)}</div>
      <p className="mb-6 text-sm font-semibold text-slate-500">Hiển thị {filtered.length} sản phẩm</p>
      {filtered.length ? <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{filtered.map(product => {
        const orderable = Boolean(product.price && !product.priceOnRequest && product.stock && product.stock > 0 && /^[a-f\d]{24}$/i.test(product._id))
        const addingThisProduct = add.isPending && add.variables?._id === product._id
        return <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl" key={product._id}><img loading="lazy" className="aspect-[4/3] w-full object-cover" src={product.image} alt={product.name}/><div className="p-6"><span className="text-xs font-bold uppercase tracking-wider text-orange-700">{product.category}</span><h2 className="mt-2 font-display text-xl font-bold text-emerald-950">{product.name}</h2><p className="mt-3 font-bold text-orange-700">{formatPrice(product.price)} {product.price ? `/ ${product.unit}` : ""}</p>{orderable && <p className="mt-1 text-xs text-slate-500">Còn {product.stock} {product.unit}</p>}{orderable ? <Button className="mt-6 w-full" disabled={add.isPending} onClick={() => addToCart(product)}>{addingThisProduct ? <LoaderCircle className="size-4 animate-spin"/> : <ShoppingCart className="size-4"/>}{addingThisProduct ? "Đang thêm..." : "Thêm vào giỏ"}</Button> : <Button className="mt-6 w-full" onClick={() => requestQuote(product)}>Yêu cầu báo giá <ArrowRight className="size-4"/></Button>}</div></article>
      })}</div> : <div className="rounded-3xl border border-dashed border-slate-300 bg-white py-20 text-center"><PackageSearch className="mx-auto size-12 text-slate-300"/><h2 className="mt-4 text-xl font-bold">Không tìm thấy sản phẩm</h2><p className="mt-2 text-slate-600">Thử một từ khóa ngắn hơn hoặc chọn “Tất cả”.</p></div>}
    </div></section>
  </>
}
