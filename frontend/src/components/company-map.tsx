import { ExternalLink, MapPinned } from "lucide-react"
import { useState } from "react"
import { company, companyMapUrl } from "@/config/company"
import { Button } from "@/components/ui/button"

const embedKey = import.meta.env.VITE_GOOGLE_MAPS_EMBED_KEY

export function CompanyMap() {
  const [loadMap, setLoadMap] = useState(false)
  const embedUrl = embedKey
    ? `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(embedKey)}&q=${encodeURIComponent(company.address)}&language=vi`
    : ""

  if (loadMap && embedUrl) {
    return <iframe
      className="min-h-[420px] w-full border-0"
      title="Bản đồ vị trí Cơ khí Đăng Khoa"
      src={embedUrl}
      loading="lazy"
      allowFullScreen
      referrerPolicy="no-referrer-when-downgrade"
    />
  }

  return <div className="grid min-h-[420px] place-items-center bg-[radial-gradient(circle_at_top_right,_#fed7aa,_transparent_36%),linear-gradient(135deg,#ecfdf5,#f8fafc)] p-7 text-center">
    <div className="max-w-md">
      <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-emerald-950 text-white shadow-lg"><MapPinned className="size-8"/></span>
      <h2 className="mt-6 font-display text-2xl font-bold text-emerald-950">Trụ sở & nhà xưởng</h2>
      <p className="mt-3 leading-7 text-slate-600">{company.address}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        {embedKey && <Button type="button" onClick={() => setLoadMap(true)}>Xem bản đồ tại đây</Button>}
        <Button asChild variant={embedKey ? "outline" : "default"}><a href={companyMapUrl} target="_blank" rel="noreferrer">Chỉ đường Google Maps <ExternalLink className="size-4"/></a></Button>
      </div>
      {!embedKey && <p className="mt-4 text-xs leading-5 text-slate-500">Bản đồ tương tác được mở trên Google Maps để trang không phải tải tài nguyên bên thứ ba.</p>}
    </div>
  </div>
}

