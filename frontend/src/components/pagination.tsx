import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

export function Pagination({ page, pages, onChange }: { page: number; pages: number; onChange: (page: number) => void }) {
  if (pages <= 1) return null
  return <nav className="mt-4 flex items-center justify-center gap-3" aria-label="Phân trang">
    <Button type="button" size="sm" variant="outline" disabled={page <= 1} onClick={() => onChange(page - 1)}><ChevronLeft className="size-4"/>Trước</Button>
    <span className="text-sm font-bold text-slate-600">Trang {page}/{pages}</span>
    <Button type="button" size="sm" variant="outline" disabled={page >= pages} onClick={() => onChange(page + 1)}>Sau<ChevronRight className="size-4"/></Button>
  </nav>
}
