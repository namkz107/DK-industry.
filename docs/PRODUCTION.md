# Checklist triển khai production

Tài liệu này phân biệt phần hệ thống đã kiểm soát trong mã nguồn với các dịch vụ cần doanh nghiệp cấu hình trước khi mở bán thật.

## Hạ tầng bắt buộc

- Dùng MongoDB replica set hoặc MongoDB Atlas. Các thao tác đơn hàng, tồn kho, giỏ hàng, báo giá và lệnh sản xuất dùng transaction; production sẽ từ chối khởi động nếu MongoDB không hỗ trợ transaction, trừ khi chủ động đặt `ALLOW_NON_TRANSACTIONAL_WRITES=true` (không khuyến nghị).
- Đặt `NODE_ENV=production`, `JWT_SECRET` đủ mạnh, `CLIENT_URL` đúng origin HTTPS và `TRUST_PROXY` phù hợp với reverse proxy thực tế.
- Không dùng tài khoản seed hoặc mật khẩu mẫu. Sau khi bootstrap Admin, xóa `ADMIN_SEED_PASSWORD` khỏi môi trường chạy.
- Bật HTTPS, backup MongoDB định kỳ, kiểm thử phục hồi backup, log tập trung, cảnh báo lỗi và giám sát endpoint `/api/health`.
- Reverse proxy phải cho phép WebSocket upgrade tại đường dẫn `/socket.io`; cấu hình `VITE_SOCKET_URL` trỏ tới public origin của API realtime.
- Nếu chạy nhiều instance API, thêm Socket.IO Redis Streams Adapter, chuyển rate limit sang kho dùng chung và chỉ chạy tác vụ định kỳ trên một worker để tránh sự kiện hoặc giới hạn bị lệch giữa các node.

## Email, tệp và bản đồ

- Cấu hình SMTP để xác minh email, khôi phục mật khẩu và gửi thông báo nghiệp vụ. Nếu không có SMTP, thông báo trong ứng dụng vẫn hoạt động nhưng email sẽ không được gửi.
- Cấu hình Google Places/Geocoding bằng server key giới hạn IP và Maps Embed bằng browser key giới hạn referrer. Footer chỉ chứa địa chỉ và liên kết điều hướng; bản đồ nhúng chỉ tải theo yêu cầu tại trang Liên hệ.
- Môi trường nhiều instance cần object storage riêng (S3-compatible hoặc nhà cung cấp tương đương), antivirus/quarantine và URL ký thời hạn ngắn. Kiểm tra chữ ký tệp hiện tại chỉ là lớp phòng vệ đầu vào, không thay thế quét malware.

## Thông tin doanh nghiệp và pháp lý

- Điền đầy đủ các biến `VITE_COMPANY_*`, đặc biệt tên pháp lý, mã số thuế/đăng ký và người đại diện. Không xuất bản nội dung placeholder.
- Nhờ đơn vị pháp lý rà soát điều khoản, quyền riêng tư, vận chuyển, thanh toán, đổi trả và bảo hành theo mô hình kinh doanh thực tế.
- Checkout bắt buộc khách đồng ý điều khoản và lưu thời điểm/phiên bản vào đơn hàng. Khi sửa nội dung chính sách, cập nhật `termsVersion` tại endpoint tạo đơn.
- Hoàn tất thủ tục thông báo/đăng ký website thương mại điện tử và quy trình hóa đơn điện tử theo yêu cầu áp dụng cho doanh nghiệp.

## Tích hợp phải chọn nhà cung cấp

Mã nguồn đã quản lý trạng thái thanh toán, số tiền, mã tham chiếu, hoàn tiền chờ xử lý, đơn vị vận chuyển và mã vận đơn. Để tự động hóa hoàn toàn, vẫn cần chọn và tích hợp:

- cổng thanh toán/webhook có xác thực chữ ký và cơ chế chống gửi lặp;
- hãng vận chuyển/API tính phí, tạo vận đơn và đồng bộ trạng thái;
- nhà cung cấp hóa đơn điện tử;
- object storage, quét malware và dịch vụ gửi email production.

Không đánh dấu thanh toán thành công từ callback phía trình duyệt. Chỉ ghi nhận sau webhook đã xác minh hoặc sau đối soát bởi nhân viên có thẩm quyền.

## Kiểm tra trước go-live

1. Chạy `npm test` trong `backend` với toàn bộ cờ integration được bật.
2. Chạy `npm run lint` và `npm run build` trong `frontend`.
3. Thử lại các luồng: đăng ký/xác minh/khôi phục mật khẩu; tư vấn → chuyển đổi yêu cầu; báo giá → chấp nhận → lệnh sản xuất; đặt hàng → thanh toán → giao → hậu mãi; hủy và hoàn tiền.
4. Kiểm tra phân quyền bằng ít nhất bốn tài khoản: khách, hai nhân viên khác nhau và quản trị viên.
5. Thử webhook trùng, đặt hàng nhấn hai lần, thiếu tồn kho, email lỗi, upload sai định dạng, MongoDB mất kết nối và khôi phục backup.
