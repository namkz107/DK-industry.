# Authentication — DK Industry

## Phạm vi đã triển khai

Hệ thống dùng ba role cố định:

| Role | Cách tạo | Quyền hiện tại |
|---|---|---|
| `customer` | Tự đăng ký trên website | Quản lý hồ sơ, địa chỉ, giỏ hàng, đơn hàng, yêu cầu gia công và hội thoại riêng |
| `staff` | Do Admin cấp | Xử lý lead, yêu cầu, báo giá, lệnh sản xuất, đơn hàng và hỗ trợ khách hàng |
| `admin` | Bootstrap bằng seed hoặc tạo từ trang Admin | Toàn quyền nghiệp vụ, tài khoản, nội dung và nhật ký kiểm toán |

API đăng ký không đọc trường `role` từ client. Vì vậy người dùng công khai không thể tự đăng ký thành Staff/Admin.

## Cơ chế phiên đăng nhập

1. Đăng nhập/đăng ký đúng sẽ trả access token có hạn 15 phút. Frontend chỉ giữ token trong bộ nhớ, không ghi vào `localStorage`.
2. Backend đồng thời tạo refresh token ngẫu nhiên, gửi bằng session cookie `HttpOnly`, `SameSite=Lax`; cookie không có `Max-Age` lưu dài hạn.
3. MongoDB chỉ lưu SHA-256 hash của refresh token trong collection `refreshsessions`, không lưu token gốc.
4. Trong cùng một tab, tải lại trang vẫn giữ phiên để tránh bắt đăng nhập lại không cần thiết. Khi đóng tab/trình duyệt, dấu phiên phía frontend mất; lần mở sau cookie cũ được thu hồi và người dùng phải đăng nhập lại. Khi access token hết hạn trong lúc sử dụng, frontend gọi `/api/auth/refresh` và xoay token cũ.
5. Đăng xuất thu hồi session hiện tại. Đổi mật khẩu tăng `tokenVersion` và thu hồi toàn bộ refresh session của tài khoản.

6. Mỗi request được bảo vệ đều kiểm tra tài khoản còn tồn tại, đang `active` và đúng `tokenVersion`.

## Tạo Admin đầu tiên

Trong PowerShell, tại thư mục dự án:

```powershell
Copy-Item backend\.env.example backend\.env
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Dán chuỗi vừa sinh vào `JWT_SECRET`, sau đó sửa các giá trị sau trong `backend/.env`:

```dotenv
ADMIN_SEED_NAME=Họ tên quản trị viên
ADMIN_SEED_EMAIL=email-thật-của-bạn@example.com
ADMIN_SEED_PHONE=09xxxxxxxx
ADMIN_SEED_PASSWORD=<mat-khau-rieng-du-dai-va-khong-dung-lai>
```

Chạy:

```powershell
npm run seed:admin
npm start
```

Khi terminal báo `Admin account: ready (...)`, đăng nhập tại `http://localhost:3000/dang-nhap`. Lệnh này không seed lại hoặc xóa sản phẩm/dự án. Không đưa mật khẩu thật vào `.env.example`, README, ảnh chụp hoặc Git. Nên xóa dòng mật khẩu khỏi `backend/.env` sau khi bootstrap xong; việc này không xóa mật khẩu đã hash trong MongoDB.

## Collection MongoDB

- `users`: hồ sơ, role, trạng thái và bcrypt hash của mật khẩu. Các trường `passwordHash` và `tokenVersion` bị ẩn khỏi query mặc định.
- `refreshsessions`: hash token, hạn dùng, thời điểm thu hồi, user-agent và IP. TTL index tự dọn session hết hạn.

Có thể xem cả hai collection bằng MongoDB Compass và MongoDB Atlas. Không sửa `passwordHash`, `tokenVersion` hoặc `tokenHash` thủ công trừ khi đang phục hồi hệ thống có kiểm soát.

## Checklist trước production

- Đặt `NODE_ENV=production`, dùng HTTPS và một `JWT_SECRET` riêng có độ ngẫu nhiên cao.
- Đặt `CLIENT_URL` đúng origin frontend; nhiều origin phải phân tách bằng dấu phẩy.
- Không commit bất kỳ file `.env` nào và bật secret scanning trên repository public.
- Không ghi access/refresh token, mật khẩu hoặc toàn bộ header cookie vào log.
- Luồng quên mật khẩu, xác minh email và gửi lại liên kết xác minh đã có. MFA cho Admin vẫn là bước hardening trước production.
- Khi frontend và API nằm khác site, cần cấu hình cookie `SameSite=None; Secure` và bổ sung CSRF token trước khi deploy.
