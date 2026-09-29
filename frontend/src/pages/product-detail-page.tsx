import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ArrowLeft, CheckCircle2, LoaderCircle, ShoppingCart } from "lucide-react"
import { Link, useNavigate, useOutletContext, useParams } from "react-router-dom"
import type { LayoutContext } from "@/components/app-layout"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import { usePageMeta } from "@/hooks/use-page-meta"
import { api } from "@/lib/api"
import { customerClient } from "@/lib/customer-client"
import { formatPrice } from "@/lib/utils"

export function ProductDetailPage() {
  const { slug = "" } = useParams()
  const { user } = useAuth()
  const { openQuote } = useOutletContext<LayoutContext>()
  const navigate = useNavigate()
  const client = useQueryClient()
  const query = useQuery({ queryKey: ["product", slug], queryFn: () => api.product(slug), enabled: Boolean(slug), retry: 1 })
  const product = query.data?.data
  usePageMeta(product?.name || "Chi tiết sản phẩm", product?.description || "Thông tin kỹ thuật sản phẩm công nghiệp.")
  const add = useMutation({ mutationFn: () => customerClient.addCartItem(product!._id), onSuccess: () => { void client.invalidateQueries({ queryKey: ["customer", "cart"] }); navigate("/gio-hang") } })
  const orderable = Boolean(product?.price && !product.priceOnRequest && product.stock && product.stock > 0)
  const requestQuote = () => user?.role === "customer" ? navigate(`/tai-khoan/yeu-cau?productId=${product?._id}&product=${encodeURIComponent(product?.name || "")}`) : openQuote(product?.name)
  const addToCart = () => { if (!user) navigate("/dang-nhap", { state: { from: `/san-pham/${slug}` } }); else if (user.role === "customer") add.mutate(); else requestQuote() }

  if (query.isLoading) return <main className="section-space container-page"><p className="rounded-2xl border p-8 text-center">Đang tải sản phẩm...</p></main>
  if (query.error || !product) return <main className="section-space container-page"><div className="rounded-3xl border bg-white p-10 text-center"><h1 className="font-display text-3xl font-bold text-emerald-950">Không tìm thấy sản phẩm</h1><p className="mt-3 text-slate-600">Sản phẩm có thể đã ngừng kinh doanh hoặc đường dẫn không còn đúng.</p><Button asChild className="mt-6"><Link to="/san-pham"><ArrowLeft className="size-4"/>Về danh mục</Link></Button></div></main>

  const images = [product.image, ...(product.images || [])].filter(Boolean).filter((value, index, list) => list.indexOf(value) === index)
  return <main className="section-space bg-stone-50"><div className="container-page"><Link className="inline-flex items-center gap-2 font-bold text-emerald-800" to="/san-pham"><ArrowLeft className="size-4"/>Danh mục sản phẩm</Link><div className="mt-6 grid gap-10 rounded-3xl border bg-white p-6 shadow-sm lg:grid-cols-2 lg:p-10"><div><img className="aspect-[4/3] w-full rounded-2xl bg-slate-100 object-cover" src={images[0]} alt={product.name}/>{images.length > 1 && <div className="mt-3 grid grid-cols-4 gap-3">{images.slice(1, 5).map(image => <img key={image} className="aspect-square rounded-xl object-cover" src={image} alt="" loading="lazy"/>)}</div>}</div><div><span className="text-xs font-black uppercase tracking-widest text-orange-700">{product.category}</span><h1 className="mt-3 font-display text-4xl font-bold text-emerald-950">{product.name}</h1>{product.sku && <p className="mt-2 text-sm text-slate-500">Mã sản phẩm: {product.sku}</p>}<p className="mt-6 text-2xl font-black text-orange-700">{formatPrice(product.price)} {product.price ? `/ ${product.unit}` : ""}</p>{product.description && <p className="mt-5 whitespace-pre-line leading-7 text-slate-600">{product.description}</p>}{orderable ? <p className="mt-4 flex items-center gap-2 text-sm font-bold text-emerald-700"><CheckCircle2 className="size-5"/>Có thể đặt: {product.stock} {product.unit}</p> : <p className="mt-4 text-sm font-bold text-orange-700">Sản phẩm được báo giá theo cấu hình và số lượng thực tế.</p>}<div className="mt-7 flex flex-wrap gap-3">{orderable ? <Button size="lg" disabled={add.isPending} onClick={addToCart}>{add.isPending ? <LoaderCircle className="size-5 animate-spin"/> : <ShoppingCart className="size-5"/>}Thêm vào giỏ</Button> : <Button size="lg" onClick={requestQuote}>Yêu cầu báo giá</Button>}</div>{add.error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-red-700">{add.error.message}</p>}</div></div>{product.specifications && Object.keys(product.specifications).length > 0 && <section className="mt-8 rounded-3xl border bg-white p-6 lg:p-10"><h2 className="font-display text-2xl font-bold text-emerald-950">Thông số kỹ thuật</h2><dl className="mt-5 divide-y">{Object.entries(product.specifications).map(([key, value]) => <div className="grid gap-2 py-4 sm:grid-cols-[240px_1fr]" key={key}><dt className="font-bold text-slate-700">{key}</dt><dd className="text-slate-600">{value}</dd></div>)}</dl></section>}</div></main>
}
