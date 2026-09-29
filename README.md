# QUẢN LÝ ĐIỂM HỌC SINH

Website quản lý điểm cộng, điểm trừ và đổi điểm lấy quà cho giáo viên.

## 1. Cấu trúc

- `index.html`: giao diện
- `style.css`: giao diện Modern Educational Dashboard
- `script.js`: toàn bộ logic
- `Code.gs`: Google Apps Script đọc danh sách học sinh

## 2. Google Sheets

Tạo bảng với đúng 5 cột:

| STT | Trường | Họ và tên đệm | Tên | Lớp |
|---|---|---|---|---|

Ví dụ:

| 1 | ABC | Nguyễn Minh | Anh | 5A1 |
| 2 | ABC | Trần Quốc | Bảo | 5A1 |

Tên hiển thị sẽ là `Họ và tên đệm + Tên`.

## 3. Tạo Google Apps Script Web App

Mở Google Sheet → Extensions → Apps Script.

Dán `Code.gs`, thay:

`THAY_ID_GOOGLE_SHEET_TAI_DAY`

bằng ID của Google Sheet.

Sau đó:
1. Deploy → New deployment.
2. Type: Web app.
3. Execute as: Me.
4. Who has access: Anyone.
5. Deploy.
6. Sao chép Web app URL.
7. Mở website, dán URL vào ô Google Apps Script Web App.
8. Bấm Kết nối.

## 4. Lưu điểm

Điểm cộng/trừ và lịch sử được lưu trong LocalStorage của trình duyệt.

- +1/+2/+3/+5: cộng ngay, không hỏi lý do.
- Trừ: bắt buộc chọn lý do.
- Đổi quà: chỉ dùng điểm cộng còn lại.
- Đổi quà không làm giảm tổng điểm xếp hạng.

## 5. Sao lưu

Nút `💾 Sao lưu dữ liệu` xuất toàn bộ học sinh thành JSON, bao gồm:
- STT
- Trường
- Họ và tên đệm
- Tên
- Lớp
- Điểm cộng
- Điểm trừ
- Xếp loại
- Hạng
- Điểm đã dùng đổi quà
- Điểm còn lại
- Lịch sử điểm trừ
- Lịch sử đổi quà

Tên file:

`data_YYYY-MM-DD_HH-mm.json`

## 6. Khôi phục

Nút `📂 Khôi phục` nhận file JSON được tạo từ chức năng sao lưu.

Google Sheets vẫn là nguồn danh sách học sinh; JSON là nguồn phục hồi trạng thái điểm và lịch sử.

## 7. Xếp loại mặc định

- >= 10: 🌟 Xuất sắc
- 5–9: 😊 Tốt
- 0–4: 🙂 Đạt
- < 0: ⚠️ Cần cố gắng

Có thể chỉnh trực tiếp trong `RANKING_RULES` của `script.js`.

## 8. Chữ cái lọc tên

Bộ lọc dùng chữ cái đầu của cột `Tên`, không dùng họ.

Ví dụ:
- Nguyễn Minh Anh → A
- Trần Quốc Bảo → B
- Lê Hoàng Nam → N
- Phạm Minh Tuấn → T

## 9. Xuất bản GitHub Pages

Đưa `index.html`, `style.css`, `script.js` lên GitHub repository.

Settings → Pages → Deploy from branch → chọn branch chứa website.

Google Apps Script Web App vẫn được triển khai riêng.
