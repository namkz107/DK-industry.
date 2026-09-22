import { ChevronRight, Mail, MapPin, Phone } from "lucide-react"
import { Link } from "react-router-dom"

const serviceLinks = [
  ["Cắt Fiber Laser CNC", "cat-fiber-laser-cnc"],
  ["Chấn gấp kim loại CNC", "chan-gap-kim-loai-cnc"],
  ["Gia công cơ khí chính xác", "gia-cong-co-khi-chinh-xac"],
  ["Thiết kế & chế tạo Jig", "thiet-ke-che-tao-jig"],
]
const supportItems = ["Chính sách bảo mật", "Chính sách giao hàng", "Hình thức thanh toán", "Cam kết chất lượng"]

export function SiteFooter() {
  return <footer className="relative overflow-hidden bg-[#101312] text-white">
    <div className="pointer-events-none absolute inset-0 opacity-[.045] [background-image:linear-gradient(45deg,transparent_40%,white_40%,white_41%,transparent_41%),linear-gradient(-45deg,transparent_40%,white_40%,white_41%,transparent_41%)] [background-size:90px_90px]" />
    <div className="container-page relative grid gap-x-12 gap-y-12 py-16 sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1.2fr] lg:py-20">
      <section><h2 className="footer-title">Về cơ khí Đăng Khoa</h2><p className="mt-8 font-display text-base font-bold uppercase tracking-wide text-slate-300">CTY CPTV ĐẦU TƯ XD TM ĐĂNG KHOA</p><address className="mt-5 not-italic text-[15px] leading-8 text-slate-400"><strong className="font-semibold text-slate-300">Trụ sở & nhà xưởng:</strong><br/>Cụm 3, thôn Duyên Trường,<br/>Xã Duyên Thái (Hồng Vân cũ),<br/>Huyện Thường Tín, Thành phố Hà Nội, Việt Nam.</address></section>
      <section><h2 className="footer-title">Dịch vụ nổi bật</h2><ul className="mt-7 space-y-4">{serviceLinks.map(([item,slug]) => <li key={item}><Link className="footer-link" to={`/dich-vu#${slug}`}><ChevronRight className="size-4 shrink-0 text-orange-500"/>{item}</Link></li>)}</ul></section>
      <section><h2 className="footer-title">Hỗ trợ khách hàng</h2><ul className="mt-7 space-y-4">{supportItems.map(item => <li className="footer-link" key={item}><ChevronRight className="size-4 shrink-0 text-orange-500"/>{item}</li>)}</ul></section>
      <section><h2 className="footer-title">Liên hệ</h2><div className="mt-7 space-y-5 text-[15px] leading-7 text-slate-400"><a className="footer-contact" href="tel:0965243386"><Phone className="size-5 shrink-0 text-orange-500"/><span><strong>Hotline</strong><br/>096 5243 386</span></a><a className="footer-contact" href="mailto:namkz107@gmail.com"><Mail className="size-5 shrink-0 text-orange-500"/><span><strong>Email</strong><br/>namkz107@gmail.com</span></a><div className="footer-contact"><MapPin className="size-5 shrink-0 text-orange-500"/><span><strong>Khu vực phục vụ</strong><br/>Hà Nội và các tỉnh miền Bắc</span></div></div></section>
    </div>
    <div className="relative border-t border-white/10"><div className="container-page flex flex-col gap-2 py-5 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between"><span>© 2026 DK Industry. Bảo lưu mọi quyền.</span><span>Thiết kế cho ngành công nghiệp Việt Nam.</span></div></div>
  </footer>
}
