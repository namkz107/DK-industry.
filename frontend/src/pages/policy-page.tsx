import { Link, useParams } from "react-router-dom"
import { company } from "@/config/company"
import { usePageMeta } from "@/hooks/use-page-meta"

const policies: Record<string, { title: string; intro: string; sections: Array<{ title: string; paragraphs: string[] }> }> = {
  "bao-mat": {
    title: "Chính sách bảo mật và dữ liệu cá nhân",
    intro: "Chính sách này giải thích cách Cơ khí Đăng Khoa tiếp nhận, sử dụng và bảo vệ thông tin khi khách hàng sử dụng website hoặc gửi yêu cầu.",
    sections: [
      { title: "Dữ liệu được tiếp nhận", paragraphs: ["Thông tin liên hệ, thông tin doanh nghiệp, địa chỉ giao hàng, nội dung tư vấn, đơn hàng, báo giá, bản vẽ và tệp kỹ thuật do khách hàng chủ động cung cấp; cùng dữ liệu kỹ thuật cần thiết để bảo đảm an toàn và vận hành website."] },
      { title: "Mục đích xử lý", paragraphs: ["Xác thực tài khoản; tư vấn; lập báo giá; thực hiện hợp đồng, giao hàng, thanh toán, bảo hành; hỗ trợ khách hàng; phòng chống gian lận; đáp ứng nghĩa vụ kế toán, thuế và yêu cầu hợp pháp của cơ quan có thẩm quyền."] },
      { title: "Chia sẻ và lưu trữ", paragraphs: ["Dữ liệu chỉ được chia sẻ cho nhân sự có thẩm quyền và nhà cung cấp cần thiết cho việc thanh toán, giao nhận, lưu trữ hoặc vận hành hệ thống theo phạm vi công việc. Chúng tôi lưu dữ liệu trong thời gian cần thiết cho giao dịch, bảo hành, giải quyết khiếu nại và nghĩa vụ pháp luật."] },
      { title: "Quyền của khách hàng", paragraphs: ["Khách hàng có thể yêu cầu xem, sửa, cập nhật hoặc đề nghị xử lý dữ liệu của mình qua email/hotline bên dưới. Một số dữ liệu giao dịch có thể phải tiếp tục lưu theo nghĩa vụ pháp luật."] },
    ],
  },
  "giao-hang": {
    title: "Chính sách giao hàng",
    intro: "Điều kiện giao nhận được xác nhận theo từng đơn vì sản phẩm công nghiệp có khác biệt về kích thước, khối lượng và phương tiện vận chuyển.",
    sections: [
      { title: "Phạm vi và chi phí", paragraphs: ["Phạm vi phục vụ, đơn vị vận chuyển, chi phí và thời gian dự kiến được nhân viên xác nhận trước khi xuất giao. Phí vận chuyển không được thay đổi sau khi đã ghi nhận thanh toán, trừ khi hai bên có thỏa thuận mới bằng văn bản."] },
      { title: "Kiểm tra khi nhận", paragraphs: ["Người nhận cần kiểm tra số lượng, quy cách đóng gói và dấu hiệu hư hỏng bên ngoài trước khi ký nhận. Sai lệch hoặc hư hỏng cần được ghi nhận trên biên bản giao nhận và thông báo ngay cho chúng tôi."] },
      { title: "Chậm giao", paragraphs: ["Nếu thời gian dự kiến thay đổi, nhân viên phụ trách sẽ cập nhật nguyên nhân và lịch mới. Các mốc của sản phẩm chế tạo theo yêu cầu được áp dụng theo báo giá, hợp đồng hoặc đơn đặt hàng đã xác nhận."] },
    ],
  },
  "thanh-toan": {
    title: "Chính sách thanh toán",
    intro: "Website hiện hỗ trợ thanh toán khi nhận hàng và chuyển khoản theo thông tin được xác nhận cho từng giao dịch.",
    sections: [
      { title: "Chuyển khoản", paragraphs: ["Chỉ chuyển tiền vào tài khoản được thể hiện trên báo giá, hợp đồng hoặc thông báo chính thức của công ty. Đơn chuyển khoản chỉ được xuất giao sau khi hệ thống ghi nhận đủ số tiền phải thanh toán."] },
      { title: "Thanh toán khi nhận hàng", paragraphs: ["Đơn COD được ghi nhận đã thanh toán khi giao hàng thành công và thu đủ tổng giá trị đơn."] },
      { title: "Hoàn tiền", paragraphs: ["Đơn đã thanh toán nhưng được chấp thuận hủy sẽ chuyển sang trạng thái chờ hoàn tiền. Thông tin phương thức, số tiền và thời gian hoàn tiền được nhân viên xác nhận, đồng thời lưu mã đối soát trên hệ thống."] },
    ],
  },
  "bao-hanh-doi-tra": {
    title: "Bảo hành, đổi trả và hủy đơn",
    intro: "Quyền lợi cụ thể phụ thuộc loại hàng hóa, phạm vi chế tạo và điều kiện được ghi trong báo giá hoặc hợp đồng.",
    sections: [
      { title: "Hủy đơn", paragraphs: ["Khách hàng có thể tự hủy đơn khi đơn còn chờ xác nhận. Sau khi đã xác nhận tồn kho hoặc đưa vào sản xuất, yêu cầu hủy cần được hai bên thống nhất; chi phí đã phát sinh đối với hàng đặt riêng có thể được khấu trừ theo thỏa thuận."] },
      { title: "Đổi trả", paragraphs: ["Hàng tiêu chuẩn bị giao sai, thiếu hoặc có lỗi được xác nhận sẽ được bổ sung, sửa chữa, đổi hoặc hoàn tiền tùy tình trạng thực tế. Hàng chế tạo theo bản vẽ không áp dụng đổi trả vì thay đổi nhu cầu nếu sản phẩm đúng hồ sơ đã duyệt."] },
      { title: "Bảo hành", paragraphs: ["Thời hạn, phạm vi và điều kiện bảo hành được ghi trên báo giá, hợp đồng hoặc phiếu bảo hành. Bảo hành không bao gồm hao mòn tự nhiên, sử dụng sai hướng dẫn, tự ý sửa đổi hoặc hư hỏng từ điều kiện vận hành ngoài thiết kế."] },
    ],
  },
  "dieu-khoan": {
    title: "Điều khoản sử dụng và giao dịch",
    intro: "Khi tạo tài khoản, gửi yêu cầu hoặc đặt hàng, khách hàng cam kết cung cấp thông tin chính xác và sử dụng hệ thống đúng pháp luật.",
    sections: [
      { title: "Thông tin sản phẩm và báo giá", paragraphs: ["Giá, tồn kho và thời gian giao trên website có thể cần được xác nhận lại. Báo giá riêng có thời hạn hiệu lực và chỉ trở thành cơ sở thực hiện khi được khách hàng chấp thuận."] },
      { title: "Tài khoản và tệp kỹ thuật", paragraphs: ["Khách hàng chịu trách nhiệm bảo mật tài khoản và chỉ tải lên nội dung mình có quyền sử dụng. Không được tải mã độc, nội dung trái pháp luật hoặc xâm phạm quyền của bên thứ ba."] },
      { title: "Khiếu nại và giải quyết tranh chấp", paragraphs: ["Khiếu nại cần kèm mã đơn/yêu cầu, mô tả và chứng cứ liên quan. Hai bên ưu tiên thương lượng; trường hợp không đạt thỏa thuận sẽ xử lý theo pháp luật Việt Nam và cơ quan có thẩm quyền."] },
    ],
  },
}

export function PolicyPage() {
  const { slug = "" } = useParams()
  const policy = policies[slug]
  usePageMeta(policy?.title || "Chính sách", policy?.intro || "Thông tin chính sách của Cơ khí Đăng Khoa.")
  if (!policy) return <main className="section-space container-page"><h1 className="font-display text-4xl font-bold">Không tìm thấy chính sách</h1><Link className="mt-5 inline-block font-bold text-orange-700" to="/">Về trang chủ</Link></main>
  return <main className="section-space bg-stone-50"><article className="container-page max-w-4xl rounded-3xl border bg-white p-7 shadow-sm sm:p-12"><p className="text-xs font-black uppercase tracking-widest text-orange-700">Cập nhật ngày 29/09/2026</p><h1 className="mt-3 font-display text-4xl font-bold text-emerald-950">{policy.title}</h1><p className="mt-5 text-lg leading-8 text-slate-600">{policy.intro}</p><div className="mt-9 space-y-8">{policy.sections.map(section => <section key={section.title}><h2 className="font-display text-2xl font-bold text-emerald-950">{section.title}</h2>{section.paragraphs.map(paragraph => <p className="mt-3 leading-7 text-slate-600" key={paragraph}>{paragraph}</p>)}</section>)}</div><section className="mt-10 rounded-2xl bg-emerald-950 p-6 text-emerald-50"><h2 className="font-display text-xl font-bold text-white">Liên hệ và khiếu nại</h2><p className="mt-3 leading-7">{company.name}<br/>{company.address}<br/>Hotline: {company.phoneLabel} · Email: {company.email}</p>{company.taxCode ? <p className="mt-2">Mã số thuế: {company.taxCode}</p> : <p className="mt-2 font-bold text-orange-300">Thông tin mã số thuế cần được cấu hình trước khi website production.</p>}</section></article></main>
}
