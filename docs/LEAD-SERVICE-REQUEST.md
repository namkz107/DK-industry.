# Lead & Service Request

## Ranh giới nghiệp vụ

- **Lead** là thông tin liên hệ công khai từ khách chưa đăng nhập, dùng để sàng lọc và chăm sóc nhu cầu.
- **Service Request** là hồ sơ kỹ thuật có chủ sở hữu là Customer đã đăng nhập, gồm bản vẽ, trao đổi và báo giá.
- Staff chỉ chuyển Lead đủ điều kiện thành Customer/Service Request ở module Staff tiếp theo.

## Luồng Lead

`new → qualified → contacted → needs_analysis → quoted → won/lost`

- `spam` dành cho dữ liệu rác. Mọi đổi trạng thái đi qua state machine và lưu nhật ký người thao tác.
- Form công khai bắt buộc consent, kiểm tra thông tin liên hệ và chặn bản ghi giống hệt trong 10 phút.
- Mã hồ sơ có dạng `LD-YYMMDD-XXXXXX`; UTM/referrer chỉ dùng để đo nguồn marketing.

## Luồng Service Request

`submitted → reviewing ↔ need_more_info → quoted → accepted`

- `rejected` dùng khi xưởng không đáp ứng; `cancelled` dùng khi Customer hủy trước khi chấp thuận.
- Customer chỉ thấy hồ sơ của mình, tin nhắn `visibility=customer` và báo giá đã gửi.
- Ghi chú `visibility=internal` tuyệt đối không trả về API Customer.

## Trao đổi và báo giá

- `RequestMessage` lưu người gửi, vai trò, phạm vi hiển thị và file đính kèm.
- File chỉ tải qua API xác thực có kiểm tra chủ sở hữu; tên file nội bộ không xuất hiện trong response.
- Báo giá tăng version. Chỉ bản mới nhất ở trạng thái `sent` được chấp thuận hoặc yêu cầu điều chỉnh.
- Chấp thuận đóng hồ sơ ở `accepted`; yêu cầu điều chỉnh đưa về `reviewing` để Staff phát hành bản mới.

## API Customer

- `GET/POST /api/customer/requests`
- `GET /api/customer/requests/:id`
- `POST /api/customer/requests/:id/messages`
- `GET /api/customer/requests/:requestId/messages/:messageId/attachments/:attachmentId`
- `PATCH /api/customer/requests/:requestId/quotations/:quotationId/respond`
- `PATCH /api/customer/requests/:id/cancel`

## Chuyển đổi dữ liệu cũ

Chạy một lần sau khi cập nhật source:

```powershell
npm run migrate:lead-service
```

Script chỉ bổ sung mã Lead, giá trị mặc định và tin nhắn đầu tiên; không xóa dữ liệu.

## Module Staff tiếp theo

Staff sẽ có hàng đợi Lead/Service Request, bộ lọc ưu tiên, nhận/phân công hồ sơ, lịch nhắc, trao đổi với Customer, ghi chú nội bộ, tạo phiên bản báo giá và chuyển đổi Lead. Admin mới quản lý tài khoản, quyền và thao tác nhạy cảm.

## Kiểm tra

```powershell
npm test --prefix backend
$env:RUN_LEAD_INTEGRATION='true'; npm test --prefix backend -- test/lead.integration.test.js
$env:RUN_CUSTOMER_INTEGRATION='true'; npm test --prefix backend -- test/customer.integration.test.js
npm run lint --prefix frontend
npm run build --prefix frontend
```
