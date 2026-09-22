# Quy chuẩn nội dung, SEO và bảo mật DK Industry

## Nội dung được phép xuất bản

- Dịch vụ phải có phạm vi gia công, vật liệu, ứng dụng và ảnh thực tế.
- Sản phẩm phải thuộc taxonomy đã duyệt; không tạo nhiều trang gần giống nhau để nhồi từ khóa.
- Dự án phải có phạm vi công việc, thời gian, địa điểm và ảnh được phép sử dụng.
- Bài kỹ thuật phải được người có chuyên môn kiểm tra trước khi xuất bản.
- Số liệu năng lực, chứng chỉ và lời chứng thực phải có nguồn xác minh nội bộ.

## Nội dung cần tránh

- Nội dung casino, cá cược, vay tài chính, thuốc hoặc chủ đề không liên quan đến hoạt động doanh nghiệp.
- Link ngoài không rõ nguồn gốc, link mua bán backlink và anchor text bất thường.
- Copy nguyên văn nội dung đối thủ hoặc dùng ảnh không có quyền sử dụng.
- Nhồi từ khóa, tạo trang hàng loạt, tiêu đề giật gân hoặc cam kết tuyệt đối không chứng minh được.

## Quy trình xuất bản

1. Nhân viên tạo nội dung ở trạng thái nháp.
2. Người phụ trách kỹ thuật kiểm tra tính chính xác.
3. Người quản trị kiểm tra ảnh, link ngoài và metadata SEO.
4. Chỉ tài khoản có quyền `publisher` mới được xuất bản.
5. Kiểm tra định kỳ bài mới, tài khoản quản trị và các link ngoài phát sinh.

## Bảo mật vận hành

- Không commit `.env`, API key, mật khẩu hoặc URI MongoDB có thông tin xác thực.
- Dùng mật khẩu riêng cho database, bật MFA cho hosting, GitHub, Cloudinary và MongoDB Atlas.
- Không hiển thị HTML do người dùng nhập bằng `dangerouslySetInnerHTML`.
- Giới hạn tần suất gửi form, validate ở cả frontend/backend và ghi log các lần đăng nhập lỗi.
- Sao lưu database định kỳ và thử quy trình khôi phục.
- Cập nhật dependency, kiểm tra `npm audit` và rà soát tài khoản quản trị hàng tháng.
