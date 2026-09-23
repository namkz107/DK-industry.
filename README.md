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
- Authentication cho Customer, Staff và Admin bằng access token ngắn hạn + refresh cookie HttpOnly.
- Phân quyền API: Staff xử lý dashboard/lead; chỉ Admin được thay đổi hoặc xóa nội dung hệ thống.
- Trung tâm Customer: hồ sơ, tối đa 5 địa chỉ, giỏ hàng MongoDB, đặt/hủy đơn, lịch sử trạng thái và yêu cầu gia công kèm bản vẽ riêng tư.

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
├── frontend/               # React/Vite + TypeScript
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
Copy-Item backend\.env.example backend\.env
npm run seed
yarn start
```

Nếu Windows chưa nhận lệnh `yarn`, mở PowerShell bằng **Run as administrator** một lần và chạy `corepack enable yarn`. Trong lúc chưa bật shim hệ thống, có thể dùng tương đương: `corepack yarn start`.

- Website: `http://localhost:3000`
- API health check: `http://localhost:5000/api/health`

Mở `backend/.env`, thay `JWT_SECRET` bằng chuỗi ngẫu nhiên dài và đặt `ADMIN_SEED_*` bằng thông tin riêng. Chạy `npm run seed:admin` để chỉ tạo/cập nhật Admin mà không xóa sản phẩm hoặc dự án hiện có. Không commit `backend/.env`; file này đã được `.gitignore` loại trừ. Sau khi tạo Admin thành công, có thể xóa giá trị `ADMIN_SEED_PASSWORD` khỏi máy để tránh đặt lại mật khẩu ngoài ý muốn.

Đăng ký công khai luôn tạo role `customer`, kể cả khi request cố gửi `role: admin`. Tài khoản Staff/Admin chỉ được cấp bởi Admin hoặc script bootstrap đáng tin cậy.

Nếu chưa bật MongoDB/backend, frontend vẫn sử dụng dữ liệu mẫu để xem giao diện. Form chỉ được lưu thật khi API hoạt động.

## API chính

| Method | Endpoint | Công dụng |
|---|---|---|
| POST | `/api/auth/register` | Đăng ký tài khoản Customer |
| POST | `/api/auth/login` | Đăng nhập bằng email hoặc số điện thoại |
| POST | `/api/auth/refresh` | Xoay refresh token và cấp access token mới |
| POST | `/api/auth/logout` | Thu hồi phiên đăng nhập hiện tại |
| GET | `/api/auth/me` | Xem tài khoản đang đăng nhập |
| POST | `/api/auth/change-password` | Đổi mật khẩu và thu hồi toàn bộ phiên |
| GET/PATCH | `/api/customer/profile` | Xem/cập nhật hồ sơ Customer |
| POST/PATCH/DELETE | `/api/customer/addresses/:id` | Quản lý địa chỉ giao hàng |
| GET/POST/PATCH/DELETE | `/api/customer/cart/*` | Quản lý giỏ hàng theo tài khoản |
| GET/POST | `/api/customer/orders` | Xem/tạo đơn hàng thương mại |
| GET/POST | `/api/customer/requests` | Xem/gửi yêu cầu gia công và báo giá |
| GET | `/api/projects` | Danh sách dự án đã xuất bản |
| GET | `/api/products` | Danh sách sản phẩm đang hoạt động |
| GET | `/api/services` | Danh mục dịch vụ đã xuất bản |
| POST | `/api/leads` | Gửi yêu cầu tư vấn / báo giá |
| GET | `/api/admin/dashboard` | Thống kê CRM mini |
| GET/PATCH | `/api/admin/leads` | Danh sách/cập nhật trạng thái lead |
| GET | `/api/staff/dashboard` | Công việc tổng quan của Staff |
| GET/PATCH | `/api/staff/leads/:id` | Tiếp nhận và xử lý Lead có audit trail |
| GET/PATCH | `/api/staff/requests/:id` | Xử lý yêu cầu kỹ thuật và phân công |
| POST | `/api/staff/requests/:id/messages` | Trao đổi với khách hoặc ghi chú nội bộ |
| POST | `/api/staff/requests/:id/quotations` | Lưu nháp hoặc phát hành báo giá có phiên bản |
| GET/PATCH | `/api/staff/orders/:id` | Xác nhận tồn kho, thanh toán và giao hàng |
| POST/PATCH/DELETE | `/api/admin/products/:id` | Quản trị sản phẩm |
| POST/PATCH/DELETE | `/api/admin/projects/:id` | Quản trị dự án |

Các route `/api/staff/*` dành cho Staff/Admin xử lý nghiệp vụ. Route quản trị nội dung `/api/admin/products|projects|services` tiếp tục yêu cầu role Admin. Trước khi production cần thay toàn bộ thông tin liên hệ, hình ảnh demo và cấu hình email/Zalo/thanh toán thực tế.

Quy chuẩn kiểm duyệt nội dung và phòng tránh SEO spam nằm tại [`docs/CONTENT-SECURITY.md`](docs/CONTENT-SECURITY.md).
Kiến trúc, luồng sử dụng và checklist production của Authentication nằm tại [`docs/AUTHENTICATION.md`](docs/AUTHENTICATION.md).
Nghiệp vụ Customer, trạng thái và kịch bản kiểm tra nằm tại [`docs/CUSTOMER.md`](docs/CUSTOMER.md).
Luồng Lead và Service Request nằm tại [`docs/LEAD-SERVICE-REQUEST.md`](docs/LEAD-SERVICE-REQUEST.md).
Quyền hạn, workflow và kịch bản kiểm tra Staff nằm tại [`docs/STAFF.md`](docs/STAFF.md).
