# Module Staff

## Phạm vi quyền

Role `staff` và `admin` được vào `/staff` và `/api/staff/*`. Customer luôn nhận `403`.

Staff được:

- Xem dashboard công việc, Lead và Service Request.
- Tìm kiếm/lọc theo trạng thái, ưu tiên và người phụ trách.
- Nhận hồ sơ chưa phân công cho chính mình hoặc bỏ nhận hồ sơ mình đang giữ.
- Cập nhật trạng thái qua state machine, mức ưu tiên và lịch liên hệ.
- Gửi trao đổi cho Customer hoặc lưu ghi chú nội bộ.
- Tạo báo giá nháp, gửi báo giá và giữ lịch sử phiên bản.
- Xác nhận tồn kho, cập nhật thanh toán, chuẩn bị và điều phối đơn hàng thương mại.
- Tải file kỹ thuật của hồ sơ trong khu vực đã xác thực.

Staff không được:

- Tự phân công hồ sơ cho nhân viên khác.
- Quản lý tài khoản, role hoặc permission.
- CRUD sản phẩm, dự án và dịch vụ quản trị.
- Xóa Lead, yêu cầu, tin nhắn hoặc báo giá.
- Sửa đè báo giá đã gửi.

Admin có toàn bộ quyền Staff và có thể chỉ định một nhân viên đang hoạt động làm người phụ trách. Quản lý tài khoản Staff thuộc module Admin tiếp theo.

## Workflow Lead

1. Mở **Khách hàng tiềm năng**, ưu tiên Lead mới/chưa phân công.
2. Bấm **Nhận phụ trách** trước khi gọi khách.
3. Xác minh nhu cầu và chuyển `new → qualified` hoặc `contacted`.
4. Ghi lịch gọi tiếp theo và nội dung trao đổi.
5. Chuyển qua `needs_analysis → quoted → won/lost`; nếu `lost` phải nhập lý do.
6. Dữ liệu rác chuyển `spam`. Mọi thao tác trạng thái và phân công được lưu timeline.

## Workflow Service Request

1. Mở **Yêu cầu dịch vụ**, nhận hồ sơ và đặt mức ưu tiên.
2. Chuyển `submitted → reviewing` khi bắt đầu đánh giá.
3. Nếu thiếu dữ liệu, chọn `need_more_info` và ghi rõ thông tin khách phải bổ sung.
4. Trao đổi công khai dùng **Gửi khách hàng**; nhận xét kỹ thuật riêng dùng **Chỉ nội bộ**.
5. Lập báo giá gồm hạng mục, số lượng, đơn vị, đơn giá, VAT, hiệu lực và điều khoản.
6. Có thể lưu `draft`; khi gửi, hệ thống chuyển hồ sơ sang `quoted` và thay các bản chờ cũ bằng `superseded`.
7. Customer chấp thuận thì hồ sơ thành `accepted`; yêu cầu sửa thì quay về `reviewing` để Staff phát hành version mới.

## Workflow đơn hàng

1. Đơn mới ở `pending`; Staff nhận phụ trách và kiểm tra tồn kho thực tế.
2. Chuyển sang `confirmed` mới trừ tồn kho trên hệ thống.
3. Thực hiện `confirmed → preparing → shipping → delivered` và ghi nội dung mỗi lần bàn giao.
4. Có thể hủy ở `pending`, `confirmed` hoặc `preparing`. Nếu đã trừ kho nhưng chưa giao, hệ thống hoàn tồn tự động.
5. Từ `shipping` không được hủy trực tiếp; cần xử lý hoàn hàng theo nghiệp vụ mở rộng sau này.
6. Trạng thái thanh toán được theo dõi độc lập: `unpaid`, `pending`, `paid`, `refunded`.

## API chính

- `GET /api/staff/dashboard`
- `GET /api/staff/leads` và `GET /api/staff/leads/:id`
- `PATCH /api/staff/leads/:id`
- `POST /api/staff/leads/:id/notes`
- `GET /api/staff/requests` và `GET /api/staff/requests/:id`
- `PATCH /api/staff/requests/:id`
- `POST /api/staff/requests/:id/messages`
- `POST /api/staff/requests/:id/quotations`
- `PATCH /api/staff/requests/:requestId/quotations/:quotationId/send`
- `GET /api/staff/orders` và `GET /api/staff/orders/:id`
- `PATCH /api/staff/orders/:id`

Danh sách dùng phân trang tối đa 50 bản ghi/lần. Các filter hỗ trợ `q`, `status`, `priority`, `assigned=mine|unassigned`.

## Cách kiểm tra

Admin hiện tại có thể truy cập thẳng `http://localhost:3000/staff`. Tài khoản role Staff sẽ được tạo/quản lý trong module Admin.

```powershell
$env:RUN_STAFF_INTEGRATION='1'
npm test --prefix backend -- test/staff.integration.test.js
npm run lint --prefix frontend
npm run build --prefix frontend
```
