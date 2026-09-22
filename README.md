# DK Industry

Website giới thiệu năng lực, dự án và sản phẩm dành cho doanh nghiệp cơ khí – công nghiệp. Source được tổ chức theo mô hình React/Vite SPA + Node/Express REST API + MongoDB.

## Chức năng hiện có

- Landing page hiện đại, responsive: năng lực, dịch vụ, dự án, sản phẩm, quy trình và góc kỹ thuật.
- Form yêu cầu tư vấn/RFQ có thể đính kèm các sản phẩm đã chọn.
- API lưu và quản lý lead theo pipeline: mới, đã liên hệ, đã báo giá, thắng hoặc mất.
- CRUD API cho dự án và sản phẩm; thống kê CRM mini cho dashboard.
- Danh mục dịch vụ cơ khí thực tế: laser CNC, chấn gấp, gia công chính xác, Jig, hàn và hệ thống công nghiệp.
- Rate limiting và kiểm tra khóa nguy hiểm để hạn chế spam form/MongoDB injection.
- Dữ liệu fallback ở frontend và script seed MongoDB để chạy demo nhanh.
- Header bảo vệ admin bằng `x-admin-key` khi `ADMIN_API_KEY` được cấu hình.

## Frontend stack chuẩn của dự án

- **Vite + React + TypeScript**: build nhanh, type-safe và hỗ trợ code splitting.
- **Tailwind CSS v4**: design system, responsive và CSS production tối ưu.
- **shadcn/ui + Radix UI**: component source-owned, accessible, dễ tùy biến.
- **TanStack Query**: gọi API, cache, deduplicate và quản lý trạng thái server.
- **React Hook Form + Zod**: form hiệu năng cao và validation thống nhất.
- **React Router**: lazy route cho trang dịch vụ, dự án và sản phẩm.
- **Lucide React**: icon vector tree-shakeable.
- **React Bits**: animation source-owned, có hỗ trợ reduced motion.

Mọi chức năng frontend mới cần tiếp tục dùng stack này và ưu tiên chữ dễ đọc, vùng bấm tối thiểu 44px, tương phản cao, thao tác ngắn và hỗ trợ bàn phím.

## Cấu trúc

```text
dk-industry/
├── frontend/               # React/CRA
│   ├── public/
│   ├── src/components/ui/        # shadcn primitives
│   ├── src/components/react-bits/# animation source-owned
│   ├── src/pages/                # lazy-loaded routes
│   └── src/lib/                  # API và utilities
├── backend/                # Express/Mongoose API
│   ├── src/config/
│   ├── src/middleware/
│   ├── src/models/
│   └── src/routes/
├── .env.example
└── package.json            # script điều phối monorepo
```

## Chạy local

Yêu cầu Node.js 18+ và MongoDB local (hoặc MongoDB Atlas).

```bash
npm run install:all
copy backend\.env.example backend\.env
npm run seed
npm run dev
```

- Website: `http://localhost:3000`
- API health check: `http://localhost:5000/api/health`

Nếu chưa bật MongoDB/backend, frontend vẫn sử dụng dữ liệu mẫu để xem giao diện. Form chỉ được lưu thật khi API hoạt động.

## API chính

| Method | Endpoint | Công dụng |
|---|---|---|
| GET | `/api/projects` | Danh sách dự án đã xuất bản |
| GET | `/api/products` | Danh sách sản phẩm đang hoạt động |
| GET | `/api/services` | Danh mục dịch vụ đã xuất bản |
| POST | `/api/leads` | Gửi yêu cầu tư vấn / báo giá |
| GET | `/api/admin/dashboard` | Thống kê CRM mini |
| GET/PATCH | `/api/admin/leads` | Danh sách/cập nhật trạng thái lead |
| POST/PATCH/DELETE | `/api/admin/products/:id` | Quản trị sản phẩm |
| POST/PATCH/DELETE | `/api/admin/projects/:id` | Quản trị dự án |

Các route `/api/admin/*` yêu cầu header `x-admin-key` nếu đã thiết lập `ADMIN_API_KEY`. Trước khi production cần thay toàn bộ thông tin liên hệ, hình ảnh demo và cấu hình email/Zalo/thanh toán thực tế.

Quy chuẩn kiểm duyệt nội dung và phòng tránh SEO spam nằm tại [`docs/CONTENT-SECURITY.md`](docs/CONTENT-SECURITY.md).
