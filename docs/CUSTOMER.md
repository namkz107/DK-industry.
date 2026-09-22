# Customer Module — DK Industry

## Phạm vi MVP

Customer đã có thể:

1. Cập nhật họ tên, số điện thoại, công ty và mã số thuế.
2. Lưu tối đa 5 địa chỉ, sửa, xóa và chọn địa chỉ mặc định.
3. Thêm sản phẩm có giá niêm yết vào giỏ hàng; giỏ được lưu trong MongoDB theo tài khoản.
4. Điều chỉnh số lượng, chọn địa chỉ, phương thức thanh toán và tạo đơn hàng.
5. Xem lịch sử, tiến trình và tự hủy đơn khi đơn còn ở trạng thái `pending`.
6. Gửi yêu cầu gia công, báo giá sản phẩm hoặc tư vấn kỹ thuật.
7. Đính kèm tối đa 5 file, mỗi file tối đa 10MB: PDF, ảnh, DXF, DWG, STEP, IGES hoặc ZIP.
8. Xem tiến trình, tải lại bản vẽ và hủy yêu cầu khi nghiệp vụ còn cho phép.

## Luồng đơn hàng thương mại

```text
Sản phẩm có giá + còn hàng tham khảo
→ Giỏ hàng
→ Chọn địa chỉ và phương thức thanh toán
→ pending (chờ nhân viên xác nhận tồn kho/phí vận chuyển)
→ confirmed
→ preparing
→ shipping
→ delivered
```

Customer chỉ được hủy khi đơn còn `pending`. Giá từng dòng được backend đọc lại từ MongoDB và lưu snapshot vào đơn; frontend không được tự quyết định giá. MVP chưa giữ hoặc trừ kho ngay khi đặt, vì đơn công nghiệp cần nhân viên xác nhận tồn thực tế trước. Phần Staff sau này sẽ chịu trách nhiệm xác nhận và chuyển trạng thái.

Sản phẩm `priceOnRequest` hoặc không có giá không đi vào giỏ hàng. Hệ thống chuyển Customer sang luồng yêu cầu báo giá.

## Luồng yêu cầu gia công / RFQ

```text
submitted
→ reviewing
→ need_more_info (nếu thiếu bản vẽ/thông số)
→ quoted
→ accepted hoặc rejected
```

Customer có thể hủy ở `submitted` hoặc `need_more_info`. Yêu cầu lưu snapshot thông tin liên hệ và sản phẩm để lịch sử không bị sai khi dữ liệu gốc thay đổi.

## Quyền và bảo mật dữ liệu

- Mọi API `/api/customer/*` yêu cầu JWT hợp lệ và role `customer`.
- Query đơn hàng/yêu cầu luôn kèm `customer: req.user._id`; biết ID của người khác vẫn nhận `404`.
- File bản vẽ nằm trong `backend/storage/customer-requests`, đã được Git ignore và không public qua Express static.
- Download file bắt buộc qua API có JWT và kiểm tra chủ sở hữu.
- Tên lưu trên ổ đĩa dùng UUID; tên gốc chỉ dùng làm tên tải xuống.
- Refresh/access token không được ghi vào model Customer hoặc localStorage.
- Khi đăng xuất/đổi tài khoản, cache query Customer bị xóa để không lộ dữ liệu tài khoản trước.

Khi deploy nhiều server hoặc dùng hosting không có ổ đĩa bền vững, cần thay local storage bằng private bucket S3/Cloudinary authenticated asset; không biến thư mục bản vẽ thành URL công khai.

## Kiểm tra thủ công

1. Chạy `corepack yarn start`, mở `http://localhost:3000/dang-ky` và tạo Customer.
2. Mở **Tài khoản → Hồ sơ & địa chỉ**, cập nhật công ty và thêm một địa chỉ mặc định.
3. Mở **Sản phẩm**, thêm sản phẩm có giá vào giỏ. Hàng “Liên hệ báo giá” phải mở form yêu cầu thay vì vào giỏ.
4. Mở giỏ trên header, đổi số lượng, chọn địa chỉ và đặt hàng.
5. Kiểm tra đơn xuất hiện ở **Đơn hàng**, có mã `DH-*`, trạng thái “Chờ xác nhận” và có thể hủy.
6. Mở **Yêu cầu gia công**, nhập thông số, đính kèm một PDF/ảnh và gửi.
7. Kiểm tra yêu cầu có mã `YC-*`, file tải lại được và có thể hủy khi đang “Đã tiếp nhận”.

Kiểm thử tích hợp tự động trên PowerShell:

```powershell
$env:RUN_CUSTOMER_INTEGRATION='1'
node --test backend/test/customer.integration.test.js
```

Test dùng bản ghi/file tạm và tự xóa sau khi hoàn tất.
