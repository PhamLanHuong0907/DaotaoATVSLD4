# Hệ thống huấn luyện ATVSLĐ — Hướng dẫn sử dụng

> Tài liệu mô tả các chức năng hiện có dành cho người dùng cuối.
> Phiên bản: 2026-04 · Áp dụng cho web responsive + PWA mobile.

---

## Mục lục

1. [Tổng quan & vai trò](#1-tổng-quan--vai-trò)
2. [Đăng nhập, đăng ký, hồ sơ cá nhân](#2-đăng-nhập-đăng-ký-hồ-sơ-cá-nhân)
3. [Người lao động](#3-người-lao-động)
4. [Cán bộ đào tạo](#4-cán-bộ-đào-tạo)
5. [Cán bộ quản lý](#5-cán-bộ-quản-lý)
6. [Quản trị viên](#6-quản-trị-viên)
7. [Tính năng dùng chung](#7-tính-năng-dùng-chung)
8. [Cài đặt như ứng dụng (PWA)](#8-cài-đặt-như-ứng-dụng-pwa)
9. [Câu hỏi thường gặp](#9-câu-hỏi-thường-gặp)

---

## 1. Tổng quan & vai trò

Hệ thống có **4 vai trò** với quyền hạn khác nhau:

| Vai trò | Mô tả ngắn | Quyền chính |
|---|---|---|
| **Quản trị viên** (admin) | Quản lý cấu hình hệ thống | Toàn quyền: người dùng, phòng ban, cấu hình, webhook, audit log |
| **Cán bộ đào tạo** (training_officer) | Soạn nội dung, tổ chức thi | Tài liệu, khoá học, ngân hàng câu hỏi, kỳ thi, phòng thi, chấm điểm |
| **Cán bộ quản lý** (manager) | Theo dõi đào tạo | Xem báo cáo, dashboard, kết quả thi của phòng ban |
| **Người lao động** (worker) | Học tập và thi | Học khoá học, thi online, luyện tập, xem chứng chỉ |

Sau khi đăng nhập, **menu bên trái** sẽ tự động ẩn/hiện các mục theo vai trò của bạn.

---

## 2. Đăng nhập, đăng ký, hồ sơ cá nhân

### 2.1 Đăng nhập

1. Mở trình duyệt → vào địa chỉ hệ thống
2. Nhập **Tên đăng nhập** và **Mật khẩu**
3. Tích **"Ghi nhớ đăng nhập"** nếu muốn không phải đăng nhập lại trong 30 ngày
4. Bấm **Đăng nhập**

> Tài khoản mặc định lúc cài đặt: `admin / admin@123`. Vui lòng đổi mật khẩu ngay sau lần đăng nhập đầu tiên.

### 2.2 Đăng ký (chỉ người lao động)

Tab **"Đăng ký"** trên trang đăng nhập cho phép tự đăng ký tài khoản người lao động.
Cần điền: tên đăng nhập, mật khẩu, họ tên, mã nhân viên, nghề, bậc tay nghề.

> Tài khoản admin / cán bộ đào tạo / cán bộ quản lý phải được Quản trị viên tạo, không tự đăng ký được.

### 2.3 Hồ sơ cá nhân

Click vào **avatar** ở góc trên bên phải hoặc menu **"Hồ sơ cá nhân"** trong sidebar.
Tại đây bạn có thể:
- **Cập nhật thông tin**: họ tên, số điện thoại, email
- **Đổi mật khẩu**: cần nhập mật khẩu cũ + mật khẩu mới (≥6 ký tự) + xác nhận

### 2.4 Đăng xuất

Cuối sidebar có nút **"Đăng xuất"** màu xám.

---

## 3. Người lao động

### 3.1 Tổng quan

Trang đầu tiên sau khi đăng nhập là **"Tổng quan"** — hiển thị nhanh các con số cần biết và nhắc lịch thi sắp tới.

### 3.2 Khoá học của tôi

Menu **"Khoá học của tôi"** liệt kê các khoá học được giao cho phòng ban / nghề / bậc của bạn.

- Mỗi khoá học hiển thị: tên, nhóm đào tạo, nghề, bậc, **tiến độ phần trăm**, badge "Hoàn thành" / "Bắt buộc"
- 2 tab:
  - **Tất cả** — mọi khoá khả dụng
  - **Bắt buộc** — chỉ khoá học bắt buộc

Click vào card → mở **trang học bài**:
- Sidebar trái: danh sách bài học, đánh dấu trạng thái (chưa học / đang học / đã xong)
- Bên phải: nội dung bài (lý thuyết, tình huống minh hoạ, lưu ý an toàn, ảnh, video)
- **Tự động đếm thời gian** học và lưu vào hồ sơ
- Bấm **"Đánh dấu hoàn thành"** sau khi học xong → bài tự sang trạng thái xong, được cộng điểm thưởng
- Nút **"Bài trước / Bài tiếp"** để chuyển bài

### 3.3 Tài liệu học tập

Menu **"Tài liệu học tập"** — danh sách tài liệu PDF/Word đã được phê duyệt, lọc đúng phòng ban + nghề + bậc của bạn.
- Click vào card để xem trực tiếp trên trình duyệt
- Hoặc bấm **"Tải xuống"** để lưu về máy

### 3.4 Lịch thi của tôi

Menu **"Lịch thi của tôi"** — các phòng thi sắp tới mà bạn được xếp vào.

- Mỗi phòng thi hiện: tên, hình thức (online/onsite), thời gian, địa điểm, trạng thái
- **Đếm ngược thời gian** đến giờ thi
- Khi đến giờ + thi online → nút **"Vào thi ngay"** kích hoạt
- Thi onsite → đến đúng địa điểm + giờ ghi trên thẻ

### 3.5 Làm bài thi

Khi vào phòng thi, các tính năng chống gian lận tự động bật:

- **Câu hỏi xáo trộn ngẫu nhiên** mỗi người mỗi đề khác nhau
- **Đáp án A/B/C/D xáo trộn** trong mỗi câu
- **Phát hiện chuyển tab** — chuyển sang ứng dụng khác sẽ bị cảnh báo
- **Cấm copy/paste, chuột phải**
- Sau **3 lần vi phạm** → hệ thống tự động nộp bài
- **Đếm ngược thời gian** rõ ở thanh trên
- Có thể bấm vào **danh sách câu** để nhảy nhanh giữa các câu
- **Bấm Nộp bài** thủ công khi xong, hoặc hết giờ tự nộp

Sau khi nộp:
- Hệ thống chấm tự động → hiển thị điểm + xếp loại (Xuất sắc / Khá / Trung bình / Không đạt)
- Nếu đạt → tự cấp **chứng chỉ điện tử** + thông báo
- Bị trừ điểm thưởng nếu trượt, được cộng điểm + huy hiệu nếu đạt

### 3.6 Lịch sử thi

Menu **"Lịch sử thi"** — xem lại mọi bài thi đã làm, điểm số, xếp loại, và xem lại từng câu.

### 3.7 Luyện tập

Menu **"Luyện tập"** — luyện tập câu hỏi ngẫu nhiên **không tính điểm**, không lưu vào hồ sơ thi.

1. Chọn **số câu** (5/10/15/20)
2. Chọn **độ khó** (dễ / trung bình / khó / bất kỳ)
3. Bấm **"Bắt đầu luyện tập"**
4. Trả lời từng câu → bấm **"Kiểm tra"** → ngay lập tức thấy đáp án đúng + giải thích
5. Cuối phiên → xem tỉ lệ đúng → có thể luyện tiếp

### 3.8 Trợ lý AI

Menu **"Trợ lý AI"** — chat với AI hỏi đáp về ATVSLĐ.

- **Giao diện chat** kiểu ChatGPT
- AI tham khảo **kho tài liệu** đã được phê duyệt và **trích nguồn** ở dưới câu trả lời
- Hỗ trợ **lưu nhiều cuộc trò chuyện** — sidebar trái liệt kê lịch sử
- Câu trả lời hiển thị markdown đẹp (heading, list, bold, code…)
- Có **gợi ý câu hỏi mẫu** khi mở mới
- Phím tắt: **Enter** để gửi, **Shift+Enter** xuống dòng

### 3.9 Diễn đàn

Menu **"Diễn đàn"** — Q&A nội bộ.

- Đặt câu hỏi với tiêu đề + nội dung + tag
- Mọi người (cán bộ + đồng nghiệp) có thể trả lời
- **Upvote** câu trả lời hữu ích bằng nút mũi tên
- Người đặt câu hỏi (hoặc cán bộ đào tạo) có thể **"Chấp nhận câu trả lời"** → topic chuyển sang trạng thái "Đã giải quyết"
- Tìm kiếm và lọc theo trạng thái

### 3.10 Chứng chỉ

Menu **"Chứng chỉ"** — tất cả chứng chỉ đã được cấp tự động khi bạn thi đạt.

- Mỗi chứng chỉ hiện: mã (`ATVSLD-2026-XXXXXX`), tên kỳ thi, điểm, xếp loại, ngày cấp, hạn hiệu lực
- Bấm **"Tải PDF chứng chỉ"** → file PDF có **mã QR** để xác thực
- QR có thể quét bằng điện thoại để hệ thống/người ngoài xác minh chứng chỉ là thật

### 3.11 Thành tích

Menu **"Thành tích"** — gamification.

- 3 thẻ thống kê: avatar, **điểm thưởng** (kèm cấp độ + thanh tiến độ), **số huy hiệu**
- Tab **"Huy hiệu của tôi"**: 7 huy hiệu có thể đạt được (Khởi đầu, Bước đầu học tập, Hoàn thành khoá học, Vượt qua kỳ thi, Xuất sắc, Điểm tuyệt đối, Chuyên cần)
- Tab **"Lịch sử điểm"**: bảng từng sự kiện cộng điểm
- Tab **"Bảng xếp hạng"**:
  - **Toàn công ty**: ai có điểm cao nhất hệ thống
  - **Phòng ban của tôi**: top trong cùng đơn vị
  - Top 3 có icon vàng/bạc/đồng, dòng "Bạn" được highlight

### 3.12 Học tập & Ôn luyện

Menu **"Học tập & Ôn luyện"** — kết hợp tài liệu + chat AI riêng cho việc ôn thi (khác với "Trợ lý AI" tổng quát).

---

## 4. Cán bộ đào tạo

Có toàn bộ chức năng của Người lao động + các mục dưới đây.

### 4.1 Hộp duyệt

Menu **"Hộp duyệt"** — nơi tập trung các nội dung đang chờ phê duyệt.

- 4 thẻ summary: Tài liệu / Khoá học / Mẫu đề thi / Câu hỏi đang chờ duyệt
- Tabs lọc theo từng loại
- Mỗi item có 3 nút: **Mở chi tiết**, **Phê duyệt** (chấp nhận với ghi chú tuỳ chọn), **Từ chối** (bắt buộc nhập lý do)

### 4.2 Mẫu đề thi

Menu **"Mẫu đề thi"** — định nghĩa cấu trúc đề (số câu, độ khó, phân bổ topic, ngưỡng điểm, trạng thái…). Khi đã được duyệt, dùng để **sinh đề** cho kỳ thi cụ thể.

### 4.3 Đề thi

Menu **"Đề thi"** — danh sách các đề đã được sinh từ template.
- Tạo đề mới (chọn template + đặt tên)
- Xem chi tiết đề (toàn bộ câu hỏi + đáp án)
- In ra PDF
- Xem danh sách bài nộp của đề

### 4.4 Kỳ thi

Menu **"Kỳ thi"** — gom nhiều phòng thi thành một đợt.
- Tạo kỳ thi mới: tên, mô tả, loại, ngày bắt đầu/kết thúc, chọn phòng ban áp dụng
- 5 trạng thái: Nháp / Đã lên lịch / Đang diễn ra / Đã kết thúc / Đã huỷ
- Click "Phòng thi" để xem các phòng trong kỳ này

### 4.5 Phòng thi

Menu **"Phòng thi"** — các buổi thi cụ thể.

**2 chế độ xem:**
- **Bảng** — list table có filter theo kỳ thi/trạng thái
- **Lịch** — week view, kéo nhanh sang tuần trước/sau, click block để vào phòng thi

**Tạo phòng thi mới:**
1. Đặt tên (vd "Phòng A1 - Ca sáng")
2. Chọn kỳ thi
3. Chọn đề thi đã sinh
4. Chọn phòng ban
5. Chọn hình thức: **Online** (worker tự thi trên máy/điện thoại) hoặc **Onsite** (thi giấy tại địa điểm vật lý)
6. Đặt giờ bắt đầu / kết thúc, sức chứa, địa điểm

**Trang chi tiết phòng thi:**
- Thông tin nhanh: thời gian, sĩ số, trạng thái
- Quản lý thí sinh:
  - **"Thêm thí sinh"** — chọn từ dropdown người lao động cùng phòng ban
  - **"Nạp cả phòng ban"** — bulk add toàn bộ
- Bảng thí sinh: STT, mã NV, họ tên, số báo danh, có mặt, thao tác
- Click ✓ để **điểm danh** (toggle)
- **Phòng onsite** có thêm:
  - Nút **"In đề PDF"** — tải PDF gồm: đề thi + phiếu trả lời + đáp án giám thị
  - Nút **"Tạo nhiều mã đề"** — sinh N đề khác nhau (xáo trộn câu + xáo trộn đáp án), tải về dạng ZIP
  - Icon ✏️ trên mỗi thí sinh → mở dialog **nhập điểm thi giấy** → hệ thống tự tính xếp loại + tự cấp chứng chỉ nếu đạt

### 4.6 Bài thi tay nghề

Menu **"Bài thi tay nghề"** — bài thi thực hành chấm theo checklist tiêu chí (cho ngành thi nâng bậc thợ).

**Tạo bài thi:**
- Tên, mô tả, nghề, bậc, điểm đạt
- Editor checklist: thêm/sửa/xoá tiêu chí (mã, tên, điểm tối đa, trọng số)

**Chấm điểm thí sinh:**
1. Click "Chấm điểm" trên card
2. Bên trái hiện checklist tiêu chí, bên phải hiện bảng bài đã chấm
3. Bấm **"Chấm điểm thí sinh"** → dialog mở:
   - Chọn thí sinh từ dropdown (filter sẵn theo nghề + bậc khớp với bài thi)
   - Nhập điểm + ghi chú từng tiêu chí
   - **Live preview tổng điểm + Đạt/Không đạt** ngay khi gõ
4. Lưu → thí sinh nhận thông báo + chứng chỉ tự cấp nếu đạt

### 4.7 Kho tài liệu

Menu **"Kho tài liệu"** — quản lý tài liệu huấn luyện PDF/Word/Excel.

- Upload tài liệu kèm metadata (loại, nghề, bậc, nhóm đào tạo, tags)
- **AI tự động sinh khoá học + câu hỏi** từ nội dung tài liệu (`Upload và sinh tự động`)
- Trang chi tiết: xem inline, download, **gán phòng ban** (card phân công), trạng thái phê duyệt
- Streaming progress khi AI sinh

### 4.8 Khoá học

Menu **"Khoá học"** — quản lý khoá học.

- Tạo thủ công hoặc nhờ AI sinh từ tài liệu
- Trang chi tiết:
  - Card **"Phân công khoá học cho phòng ban"** — chọn các phòng ban được giao + bật "bắt buộc"
  - Bảng **"Tiến độ học viên"** — admin xem ai đã học bao nhiêu bài, thời gian học, lần học gần nhất
  - Sinh ảnh minh hoạ + sinh video (AI)

### 4.9 Ngân hàng câu hỏi

Menu **"Ngân hàng câu hỏi"** — quản lý câu hỏi cho các bài thi.

- Tạo thủ công, AI sinh, hoặc **import từ Excel hàng loạt**
- 3 loại câu hỏi:
  - **Trắc nghiệm** (multiple choice) — 4 đáp án, chọn 1 đúng
  - **Đúng/Sai** (true_false)
  - **Tình huống** (scenario_based) — chấm theo các ý chính
- Filter theo loại, độ khó, trạng thái phê duyệt
- **Phê duyệt hàng loạt** — chọn nhiều câu cùng lúc rồi bấm "Duyệt N câu"
- **Tải template Excel** mẫu để soạn ngoại tuyến

### 4.10 Cơ sở vật chất

Menu **"Cơ sở vật chất"** — quản lý phòng học, máy chiếu, máy tính, dụng cụ an toàn.

- 5 loại: Phòng / Máy chiếu / Máy tính / Dụng cụ an toàn / Khác
- Tạo/sửa/xoá, đánh dấu hoạt động/ngưng dùng
- Filter theo loại

### 4.11 Thống kê & Báo cáo

Menu **"Thống kê & Báo cáo"** — xem dashboard chi tiết, biểu đồ, xuất Excel/PDF.

- Bảng thống kê **theo phòng ban** với progress bar tỉ lệ pass
- Filter group_by theo nghề / xếp loại / phòng ban
- Xuất Excel hoặc PDF theo nhiều loại báo cáo

---

## 5. Cán bộ quản lý

Có quyền **xem** các báo cáo + dashboard, không có quyền sửa nội dung.

- **Tổng quan**: stat cards + biểu đồ tỉ lệ đạt theo phòng ban + phân loại kết quả + bài thi đã nộp
- **Thống kê & Báo cáo**: chi tiết hơn
- Xem danh sách người lao động (read-only)

---

## 6. Quản trị viên

Có toàn bộ quyền của Cán bộ đào tạo + các mục dưới đây.

### 6.1 Phòng ban

Menu **"Phòng ban"** — cây tổ chức.

- Bảng dạng cây, phòng ban con tự thụt lề theo cấp
- Tạo phòng ban mới: tên, mã, **chọn cấp trên** (tuỳ chọn), mô tả
- Mỗi dòng có 3 nút: **Add** (tạo phòng con), **Edit**, **Delete**
- Cột **ID** có nút sao chép → dùng khi import user qua Excel (cần `department_id`)

### 6.2 Quản lý người dùng

Menu **"Người dùng"** — CRUD + phân quyền.

**Header có 4 nút:**
- **Bảng phân quyền** — mở dialog tham khảo mô tả các vai trò
- **Tải template** — tải file `.xlsx` mẫu để soạn ngoại tuyến
- **Nhập từ Excel** — upload `.xlsx` hàng loạt, hệ thống báo số dòng thành công/lỗi
- **Tạo người dùng** — dialog đầy đủ form: username, password, họ tên, mã NV, vai trò, **chọn phòng ban**, nghề, bậc, sđt, email

**Filter:** vai trò + phòng ban

**Bảng người dùng** có cột: Họ tên (kèm username), Mã NV, Vai trò (chip màu), **Phòng ban**, Nghề, Bậc, SĐT, Trạng thái, Thao tác.

**Mỗi dòng có 4 nút:**
- 🛡️ **Phân quyền** — đổi nhanh vai trò; dropdown live-preview các quyền của vai trò mới
- ✏️ **Sửa thông tin** — sửa mọi field trừ username/employee_id
- 🔒 **Đặt lại mật khẩu** — nhập mật khẩu mới + xác nhận
- ⏻ **Vô hiệu hoá / Kích hoạt lại** — toggle active

### 6.3 Cấu hình hệ thống

Menu **"Cấu hình hệ thống"**.

- **Thông tin doanh nghiệp**: tên công ty, địa chỉ, số điện thoại
- **Logo công ty**: upload file PNG/JPG/WEBP/SVG → hiển thị trên chứng chỉ và header
- **Chứng chỉ**: hiệu lực (số tháng), tên người ký, chức vụ
- **Chính sách thi**: điểm đạt mặc định, cho phép tự đăng ký

### 6.4 Webhooks

Menu **"Webhooks"** — tích hợp với hệ thống ngoài qua HTTP callback.

- Tạo webhook: tên, URL, chọn nhiều sự kiện, secret HMAC (tuỳ chọn)
- 5 sự kiện hỗ trợ: nộp bài, đạt bài thi, cấp chứng chỉ, tạo phòng thi, tạo người dùng
- **Test ngay** — gửi request thử để kiểm tra kết nối
- Theo dõi success/failure counts, status code lần cuối, lỗi gần nhất

### 6.5 Nhật ký hệ thống (Audit log)

Menu **"Nhật ký hệ thống"** — log mọi thao tác POST/PUT/PATCH/DELETE.

- Filter theo phương thức (POST/PUT/...) + tiền tố đường dẫn
- Hiển thị: thời gian, người thực hiện, method, đường dẫn, status code, IP

---

## 7. Tính năng dùng chung

### 7.1 Thông báo

Icon **chuông** ở góc trên bên phải.

- Badge đỏ hiển thị số thông báo chưa đọc
- Click → popover hiển thị 10 thông báo gần nhất
- Click vào một thông báo → tự navigate đến trang liên quan + đánh dấu đã đọc
- Nút **"Đánh dấu đã đọc"** → mark all
- Tự động refresh mỗi 60 giây

**Loại thông báo:**
- Lịch thi mới được giao
- Có kết quả thi
- Được cấp chứng chỉ
- Chứng chỉ sắp hết hạn
- Trả lời mới trên diễn đàn
- Thông báo chung từ admin

### 7.2 Chế độ tối / sáng

Icon **mặt trăng / mặt trời** trên topbar — chuyển nhanh giữa light mode và dark mode. Lựa chọn được lưu lại giữa các phiên.

### 7.3 Tìm kiếm và filter

Mọi trang danh sách đều có filter ở đầu trang. Filter được giữ trong URL — bookmark được.

### 7.4 Phân trang

Các bảng dài có phân trang ở dưới — click số trang hoặc dùng nút mũi tên.

---

## 8. Cài đặt như ứng dụng (PWA)

Hệ thống là **Progressive Web App** — có thể cài lên màn hình chính của điện thoại / desktop như app native.

### Trên Android (Chrome / Edge)
1. Mở web → đăng nhập
2. Trên topbar sẽ xuất hiện nút **"Cài app"** (nếu trình duyệt hỗ trợ)
3. Bấm vào → xác nhận → app được cài lên màn hình chính
4. Mở từ icon app → giao diện full màn hình, không có thanh URL

### Trên iPhone / iPad (Safari)
1. Mở web → đăng nhập
2. Bấm nút **"Chia sẻ"** (icon hộp có mũi tên đi lên)
3. Chọn **"Thêm vào màn hình chính"**

### Lợi ích
- Mở nhanh như app native
- **Offline mode**: tài liệu / khoá học đã xem trước có thể đọc lại khi mất sóng (vd trong hầm lò không có 4G)
- Nhận thông báo đẩy (sẽ bổ sung trong tương lai)

---

## 9. Câu hỏi thường gặp

**Q: Tôi quên mật khẩu, làm sao?**
A: Liên hệ Quản trị viên để được đặt lại. Admin vào "Người dùng" → tìm bạn → bấm icon 🔒 → nhập mật khẩu mới.

**Q: Lịch thi của tôi chưa thấy phòng nào?**
A: Phòng thi phải được Cán bộ đào tạo tạo và **xếp bạn vào danh sách thí sinh** thì mới hiển thị. Nếu đã xếp mà vẫn không thấy → kiểm tra phòng ban của bạn đã được gán đúng chưa.

**Q: Tôi không thấy khoá học nào trong "Khoá học của tôi"?**
A: Khoá học chỉ hiện khi:
- Đã được phê duyệt (status = approved)
- Đã được Cán bộ đào tạo **gán cho phòng ban của bạn** (hoặc khoá học không gán phòng ban cụ thể)
- Khớp với nghề + bậc của bạn (nếu khoá học có lọc)

Liên hệ Cán bộ đào tạo nếu thiếu khoá học mà bạn cần.

**Q: Bị mất kết nối khi đang làm bài thi, bài có bị mất không?**
A: Hệ thống tự động lưu các câu đã trả lời vào trình duyệt mỗi 30 giây. Khi có mạng lại, vào lại trang thi sẽ giữ nguyên các câu đã chọn. Nếu hết thời gian, hệ thống tự nộp các câu đã có.

**Q: Vi phạm chuyển tab có đáng lo không?**
A: Cảnh báo lần 1, lần 2 chỉ là nhắc nhở. Đến lần thứ **3** thì bài thi tự nộp ngay với các câu hiện có. Hãy cố gắng tập trung khi thi.

**Q: Chứng chỉ điện tử có giá trị pháp lý không?**
A: Mỗi chứng chỉ có **mã định danh duy nhất** + **mã QR** dẫn đến URL công khai để xác thực. Đơn vị bên ngoài có thể quét QR để xác minh chứng chỉ là thật. Tính pháp lý cụ thể tuỳ thuộc vào quy định nội bộ và pháp luật ATVSLĐ áp dụng.

**Q: Trợ lý AI có sai không? Có thể tin được không?**
A: AI dựa trên tài liệu đã được duyệt trong hệ thống và trả lời tham khảo. **Luôn nên đối chiếu với cán bộ đào tạo** trước khi áp dụng vào tình huống nguy hiểm thực tế. AI có thể nhầm trong những vấn đề hiếm.

**Q: Điểm thưởng và huy hiệu có dùng làm gì không?**
A: Hiện tại là khuyến khích học tập + cạnh tranh lành mạnh trong phòng ban. Tuỳ công ty có thể dùng làm KPI hoặc khen thưởng nội bộ.

**Q: Tôi muốn đề xuất tính năng / báo lỗi?**
A: Liên hệ Quản trị viên hệ thống hoặc Cán bộ đào tạo trực tiếp. Hệ thống có Audit log nên admin có thể truy xuất thao tác của bạn nếu cần hỗ trợ.

---

## Liên hệ & hỗ trợ

| Vấn đề | Liên hệ |
|---|---|
| Quên mật khẩu / tài khoản | Quản trị viên hệ thống |
| Nội dung khoá học, đề thi | Cán bộ đào tạo |
| Lịch thi, điểm danh | Cán bộ đào tạo / Giám thị |
| Lỗi kỹ thuật | Quản trị viên hệ thống |

---

*Tài liệu được cập nhật theo phiên bản hiện tại của hệ thống. Một số tính năng có thể thay đổi giao diện trong các bản cập nhật sau.*
