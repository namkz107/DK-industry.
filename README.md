# DK Industry

Website giới thiệu năng lực, dự án và sản phẩm dành cho doanh nghiệp cơ khí – công nghiệp. Source được tổ chức theo mô hình React SPA + Node/Express REST API + MongoDB.

## Chức năng hiện có

- Landing page hiện đại, responsive: năng lực, dịch vụ, dự án, sản phẩm, quy trình và góc kỹ thuật.
- Form yêu cầu tư vấn/RFQ có thể đính kèm các sản phẩm đã chọn.
- API lưu và quản lý lead theo pipeline: mới, đã liên hệ, đã báo giá, thắng hoặc mất.
- CRUD API cho dự án và sản phẩm; thống kê CRM mini cho dashboard.
- Dữ liệu fallback ở frontend và script seed MongoDB để chạy demo nhanh.
- Header bảo vệ admin bằng `x-admin-key` khi `ADMIN_API_KEY` được cấu hình.

## Cấu trúc

```text
dk-industry/
├── frontend/               # React/CRA
│   ├── public/
│   └── src/
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
| POST | `/api/leads` | Gửi yêu cầu tư vấn / báo giá |
| GET | `/api/admin/dashboard` | Thống kê CRM mini |
| GET/PATCH | `/api/admin/leads` | Danh sách/cập nhật trạng thái lead |
| POST/PATCH/DELETE | `/api/admin/products/:id` | Quản trị sản phẩm |
| POST/PATCH/DELETE | `/api/admin/projects/:id` | Quản trị dự án |

Các route `/api/admin/*` yêu cầu header `x-admin-key` nếu đã thiết lập `ADMIN_API_KEY`. Trước khi production cần thay toàn bộ thông tin liên hệ, hình ảnh demo và cấu hình email/Zalo/thanh toán thực tế.
