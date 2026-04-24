# Tài liệu API - Hệ thống huấn luyện ATVSLĐ

**Base URL:** `http://localhost:8000`
**Swagger UI:** `http://localhost:8000/docs`

---

## Mục lục

1. [Giá trị Enum](#1-giá-trị-enum)
2. [Kiểm tra sức khỏe hệ thống](#2-kiểm-tra-sức-khỏe-hệ-thống)
3. [Đơn vị](#3-đơn-vị)
4. [Người dùng](#4-người-dùng)
5. [Kho tài liệu](#5-kho-tài-liệu)
6. [Khóa học](#6-khóa-học)
7. [Ngân hàng câu hỏi](#7-ngân-hàng-câu-hỏi)
8. [Thi & Chấm điểm](#8-thi--chấm-điểm)
9. [Học tập & Ôn luyện](#9-học-tập--ôn-luyện)
10. [Báo cáo](#10-báo-cáo)
11. [Luồng nghiệp vụ chính](#11-luồng-nghiệp-vụ-chính)

---

## 1. Giá trị Enum

Frontend cần dùng các giá trị này cho dropdown, filter, v.v.

### UserRole - Vai trò người dùng
| Giá trị | Mô tả |
|---|---|
| `training_officer` | Cán bộ đào tạo |
| `worker` | Người lao động |
| `manager` | Cán bộ quản lý |

### ApprovalStatus - Trạng thái phê duyệt
| Giá trị | Mô tả | Màu sắc gợi ý |
|---|---|---|
| `draft` | Nháp, chưa gửi duyệt | Xám |
| `pending_review` | Chờ phê duyệt | Vàng |
| `approved` | Đã phê duyệt | Xanh lá |
| `rejected` | Từ chối | Đỏ |

### DocumentType - Loại tài liệu
| Giá trị | Mô tả |
|---|---|
| `company_internal` | Tài liệu nội bộ công ty |
| `safety_procedure` | Quy trình an toàn |
| `legal_document` | Văn bản pháp luật ATVSLĐ |
| `question_bank` | Ngân hàng câu hỏi có sẵn |

### TrainingGroup - Nhóm huấn luyện
| Giá trị | Mô tả |
|---|---|
| `atvsld` | An toàn vệ sinh lao động |
| `skill_upgrade` | Nâng bậc thợ |
| `safety_hygiene` | An toàn vệ sinh viên |
| `legal_knowledge` | Tìm hiểu văn bản pháp luật |

### QuestionType - Loại câu hỏi
| Giá trị | Mô tả |
|---|---|
| `multiple_choice` | Trắc nghiệm 4 đáp án A/B/C/D |
| `true_false` | Đúng / Sai |
| `scenario_based` | Tình huống (tự luận) |

### DifficultyLevel - Mức độ khó
| Giá trị | Mô tả |
|---|---|
| `easy` | Dễ |
| `medium` | Trung bình |
| `hard` | Khó |

### ExamType - Loại kỳ thi
| Giá trị | Mô tả |
|---|---|
| `skill_upgrade` | Thi nâng bậc thợ |
| `periodic_atvsld` | Thi ATVSLĐ định kỳ |
| `safety_hygiene` | Thi an toàn vệ sinh viên |
| `legal_knowledge` | Thi tìm hiểu văn bản pháp luật |

### ExamMode - Hình thức thi
| Giá trị | Mô tả |
|---|---|
| `online` | Thi trực tuyến |
| `onsite` | Thi trực tiếp |

### ResultClassification - Xếp loại kết quả
| Giá trị | Mô tả | Điều kiện (mặc định) |
|---|---|---|
| `excellent` | Giỏi | >= 9.0 điểm |
| `good` | Khá | >= 7.0 điểm |
| `average` | Trung bình (Đạt) | >= 5.0 điểm |
| `fail` | Không đạt | < 5.0 điểm |

---

## 2. Kiểm tra sức khỏe hệ thống

### `GET /health`

**Phản hồi:**
```json
{
  "status": "ok",
  "service": "ATVSLD Training System"
}
```

---

## 3. Đơn vị

### `POST /api/v1/departments` - Tạo đơn vị

**Nội dung yêu cầu:**
```json
{
  "name": "Phân xưởng khai thác 1",
  "code": "PX-KT1",
  "parent_id": null,
  "description": "Phân xưởng khai thác than hầm lò số 1"
}
```

**Phản hồi:** `DepartmentResponse`
```json
{
  "id": "507f1f77bcf86cd799439011",
  "name": "Phân xưởng khai thác 1",
  "code": "PX-KT1",
  "parent_id": null,
  "description": "Phân xưởng khai thác than hầm lò số 1",
  "created_at": "2026-02-28T10:00:00Z",
  "updated_at": "2026-02-28T10:00:00Z"
}
```

### `GET /api/v1/departments` - Danh sách đơn vị

**Tham số truy vấn:**
| Tham số | Kiểu | Mô tả |
|---|---|---|
| `parent_id` | string (tuỳ chọn) | Lọc theo đơn vị cha |

**Phản hồi:** `DepartmentResponse[]`

### `GET /api/v1/departments/{dept_id}` - Chi tiết đơn vị

### `PUT /api/v1/departments/{dept_id}` - Cập nhật đơn vị

**Nội dung yêu cầu:** (chỉ gửi trường cần sửa)
```json
{
  "name": "Phân xưởng khai thác 2"
}
```

### `DELETE /api/v1/departments/{dept_id}` - Xoá đơn vị

**Phản hồi:**
```json
{
  "success": true,
  "message": "Department deleted"
}
```

---

## 4. Người dùng

### `POST /api/v1/users` - Tạo người dùng

**Nội dung yêu cầu:**
```json
{
  "full_name": "Nguyễn Văn A",
  "employee_id": "NV001",
  "role": "worker",
  "department_id": "507f1f77bcf86cd799439011",
  "occupation": "Thợ khai thác lò",
  "skill_level": 3,
  "phone": "0912345678",
  "email": "nguyenvana@duonghuy.vn"
}
```

**Phản hồi:** `UserResponse`
```json
{
  "id": "507f1f77bcf86cd799439022",
  "full_name": "Nguyễn Văn A",
  "employee_id": "NV001",
  "role": "worker",
  "department_id": "507f1f77bcf86cd799439011",
  "occupation": "Thợ khai thác lò",
  "skill_level": 3,
  "phone": "0912345678",
  "email": "nguyenvana@duonghuy.vn",
  "is_active": true,
  "created_at": "2026-02-28T10:00:00Z",
  "updated_at": "2026-02-28T10:00:00Z"
}
```

### `GET /api/v1/users` - Danh sách người dùng (phân trang)

**Tham số truy vấn:**
| Tham số | Kiểu | Mô tả |
|---|---|---|
| `role` | string | Lọc theo vai trò: `training_officer`, `worker`, `manager` |
| `department_id` | string | Lọc theo đơn vị |
| `occupation` | string | Lọc theo nghề |
| `skill_level` | int | Lọc theo bậc thợ (1-7) |
| `is_active` | bool | Lọc trạng thái hoạt động |
| `page` | int | Trang (mặc định: 1) |
| `page_size` | int | Số bản ghi/trang (mặc định: 20, tối đa: 100) |

**Phản hồi:** `PaginatedResponse`
```json
{
  "items": [ ...UserResponse ],
  "total": 150,
  "page": 1,
  "page_size": 20,
  "total_pages": 8
}
```

### `GET /api/v1/users/{user_id}` - Chi tiết người dùng

### `PUT /api/v1/users/{user_id}` - Cập nhật người dùng

**Nội dung yêu cầu:** (chỉ gửi trường cần sửa)
```json
{
  "skill_level": 4,
  "phone": "0987654321"
}
```

### `DELETE /api/v1/users/{user_id}` - Vô hiệu hoá (soft delete)

---

## 5. Kho tài liệu

### `POST /api/v1/documents/upload` - Tải lên tài liệu

**Content-Type:** `multipart/form-data`

| Trường | Kiểu | Mô tả |
|---|---|---|
| `file` | File | File PDF, DOCX, XLSX, TXT (tối đa 50MB) |
| `metadata` | string (JSON) | Thông tin tài liệu (xem bên dưới) |

**metadata JSON:**
```json
{
  "title": "Quy trình an toàn khai thác lò",
  "description": "Tài liệu huấn luyện nội bộ",
  "document_type": "safety_procedure",
  "occupations": ["Thợ khai thác lò"],
  "skill_levels": [3, 4, 5],
  "training_groups": ["atvsld"],
  "legal_basis": "Thông tư 06/2020/TT-BLĐTBXH",
  "tags": ["khai thác lò", "an toàn"],
  "uploaded_by": "officer_001"
}
```

**Ví dụ gọi bằng JavaScript:**
```javascript
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('metadata', JSON.stringify({
  title: 'Quy trình an toàn khai thác lò',
  document_type: 'safety_procedure',
  occupations: ['Thợ khai thác lò'],
  skill_levels: [3],
  training_groups: ['atvsld'],
  uploaded_by: 'officer_001'
}));

const res = await fetch('/api/v1/documents/upload', {
  method: 'POST',
  body: formData
});
```

**Phản hồi:** `DocumentResponse`

---

### `POST /api/v1/documents/upload-and-generate` - Tải lên + AI tự động tạo khoá học & câu hỏi

> **ĐÂY LÀ ENDPOINT CHÍNH** - Tải file lên, đọc nội dung, AI tự động tạo khoá học và câu hỏi.
>
> **Chiến lược xử lý:**
> - Tài liệu nhỏ (<50K ký tự): 1 lần gọi AI duy nhất
> - Tài liệu lớn (>=50K ký tự): **chunk-by-chunk** - chia theo trang, AI xử lý từng chunk riêng → tạo bài học + câu hỏi cho mỗi phần → gộp lại thành 1 khoá học
>
> Tài liệu càng dài → càng nhiều bài học và câu hỏi được tạo ra.

**Content-Type:** `multipart/form-data` (giống upload)

| Trường | Kiểu | Mô tả |
|---|---|---|
| `file` | File | File PDF, DOCX, XLSX, TXT |
| `metadata` | string (JSON) | Thông tin tài liệu |

**metadata JSON:**
```json
{
  "title": "Quy trình an toàn nổ mìn",
  "document_type": "safety_procedure",
  "occupations": ["Thợ nổ mìn"],
  "skill_levels": [4],
  "training_groups": ["atvsld"],
  "uploaded_by": "officer_001"
}
```

**Ví dụ gọi bằng JavaScript:**
```javascript
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('metadata', JSON.stringify({
  title: 'Quy trình an toàn nổ mìn',
  document_type: 'safety_procedure',
  occupations: ['Thợ nổ mìn'],
  skill_levels: [4],
  training_groups: ['atvsld'],
  uploaded_by: 'officer_001'
}));

const res = await fetch('/api/v1/documents/upload-and-generate', {
  method: 'POST',
  body: formData
});
// Lưu ý: tài liệu lớn có thể mất vài phút vì AI xử lý từng phần
```

**Phản hồi:**
```json
{
  "document": {
    "id": "doc_001",
    "title": "Quy trình an toàn nổ mìn",
    "file_name": "quy_trinh_no_min.pdf",
    "page_count": 45,
    "total_chars": 125000,
    "status": "draft"
  },
  "processing": {
    "strategy": "chunk-by-chunk",
    "total_chunks": 9,
    "original_chars": 125000
  },
  "course": {
    "id": "course_001",
    "title": "Khoá học An toàn nổ mìn trong khai thác than",
    "description": "Khoá học huấn luyện...",
    "objectives": [
      "Nắm vững quy trình an toàn nổ mìn",
      "Nhận biết các nguy cơ khi nổ mìn"
    ],
    "lesson_count": 12,
    "lessons": [
      {"order": 1, "title": "Khái niệm cơ bản về nổ mìn", "duration_minutes": 45},
      {"order": 2, "title": "Phân loại vật liệu nổ", "duration_minutes": 40},
      {"order": 3, "title": "Quy trình chuẩn bị trước khi nổ", "duration_minutes": 50},
      {"order": 4, "title": "Quy trình an toàn khi nổ mìn", "duration_minutes": 60},
      {"order": 5, "title": "Kỹ thuật nổ mìn hầm lò", "duration_minutes": 50},
      {"order": 6, "title": "Kỹ thuật nổ mìn lộ thiên", "duration_minutes": 50},
      {"order": 7, "title": "Xử lý mìn câm và sự cố", "duration_minutes": 45},
      {"order": 8, "title": "Bảo quản và vận chuyển vật liệu nổ", "duration_minutes": 40},
      {"order": 9, "title": "Kiểm tra sau nổ mìn", "duration_minutes": 35},
      {"order": 10, "title": "Báo cáo và hồ sơ nổ mìn", "duration_minutes": 30},
      {"order": 11, "title": "Quy định pháp luật về nổ mìn", "duration_minutes": 45},
      {"order": 12, "title": "Sơ cứu tai nạn nổ mìn", "duration_minutes": 40}
    ],
    "status": "draft"
  },
  "questions": {
    "total": 45,
    "by_type": {
      "multiple_choice": 28,
      "true_false": 9,
      "scenario_based": 8
    },
    "by_difficulty": {
      "easy": 15,
      "medium": 18,
      "hard": 12
    },
    "items": [
      {
        "id": "q_001",
        "content": "Khoảng cách an toàn tối thiểu khi nổ mìn là bao nhiêu?",
        "question_type": "multiple_choice",
        "difficulty": "easy"
      },
      {
        "id": "q_002",
        "content": "Trước khi tiến hành nổ mìn, cần kiểm tra khí methane",
        "question_type": "true_false",
        "difficulty": "medium"
      }
    ]
  },
  "message": "Đã tạo thành công từ tài liệu 'Quy trình an toàn nổ mìn' (45 trang, 125,000 ký tự): 1 khoá học (12 bài học) và 45 câu hỏi. Chiến lược: chunk-by-chunk (9 chunks). Tất cả ở trạng thái DRAFT, cần cán bộ đào tạo phê duyệt."
}
```

> **Lưu ý cho FE:**
> - Endpoint này KHÔNG có streaming → phải chờ toàn bộ xong mới nhận kết quả
> - Nên dùng **endpoint streaming** bên dưới để hiển thị tiến trình realtime
> - Tất cả nội dung AI tạo đều ở trạng thái `draft`, cần phê duyệt

---

### `POST /api/v1/documents/upload-and-generate-stream` - Tải lên + AI tạo (SSE Streaming)

> **ENDPOINT KHUYẾN NGHỊ** - Giống `upload-and-generate` nhưng trả về **Server-Sent Events (SSE)** để frontend hiển thị tiến trình realtime: % hoàn thành, bài học/câu hỏi đang được tạo.

**Content-Type:** `multipart/form-data` (giống upload-and-generate)
**Response Content-Type:** `text/event-stream`

**Tham số:** Giống hệt `upload-and-generate` (file + metadata JSON)

#### SSE Events

| Event | Progress | Mô tả |
|---|---|---|
| `start` | 5% | Thông tin tài liệu, chiến lược xử lý (single-pass / chunk-by-chunk) |
| `start_chunks` | 8% | Số chunks đã chia (chỉ có khi chunk-by-chunk) |
| `generating` | 15% | AI đang xử lý (chỉ có khi single-pass) |
| `chunk_start` | 10-80% | Bắt đầu xử lý chunk N/M |
| `chunk_done` | 10-80% | Hoàn thành chunk: bài học + câu hỏi đã tạo |
| `chunk_error` | — | Lỗi xử lý 1 chunk (các chunk khác vẫn tiếp tục) |
| `metadata` | 83% | Đang tạo metadata khóa học |
| `metadata_done` | 88% | Metadata hoàn thành (title, description, objectives) |
| `saving` | 92% | Đang lưu vào cơ sở dữ liệu |
| `complete` | 100% | Hoàn thành! Kèm kết quả cuối cùng (giống response của upload-and-generate) |
| `error` | — | Lỗi nghiêm trọng, dừng xử lý |

#### Format mỗi SSE event:
```
event: chunk_done
data: {"event": "chunk_done", "progress": 38, "message": "Hoàn thành phần 2/5: 3 bài học, 8 câu hỏi", "data": {...}}
```

#### Ví dụ sử dụng JavaScript (Frontend):
```javascript
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('metadata', JSON.stringify({
  title: 'Quy trình an toàn nổ mìn',
  document_type: 'safety_procedure',
  occupations: ['Thợ nổ mìn'],
  skill_levels: [4],
  training_groups: ['atvsld'],
  uploaded_by: 'officer_001'
}));

const response = await fetch('/api/v1/documents/upload-and-generate-stream', {
  method: 'POST',
  body: formData,
});

const reader = response.body.getReader();
const decoder = new TextDecoder();
let buffer = '';

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  buffer += decoder.decode(value, { stream: true });
  const lines = buffer.split('\n');
  buffer = lines.pop(); // giữ lại phần chưa hoàn chỉnh

  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const event = JSON.parse(line.slice(6));

      // Cập nhật progress bar
      setProgress(event.progress);
      setMessage(event.message);

      // Xử lý từng loại event
      switch (event.event) {
        case 'start':
          console.log('Chiến lược:', event.data.strategy);
          console.log('Tổng ký tự:', event.data.total_chars);
          break;

        case 'chunk_done':
          // Hiển thị bài học vừa tạo
          const { lessons, cumulative_lessons, cumulative_questions } = event.data;
          lessons.forEach(l => addLessonToUI(l));
          updateStats(cumulative_lessons, cumulative_questions);
          break;

        case 'metadata_done':
          // Hiển thị thông tin khóa học
          setCourseTitle(event.data.title);
          setCourseDescription(event.data.description);
          break;

        case 'complete':
          // Kết quả cuối cùng (giống response của upload-and-generate)
          setFinalResult(event.data);
          break;

        case 'error':
          showError(event.message);
          break;
      }
    }
  }
}
```

#### Ví dụ luồng events (tài liệu lớn - chunk-by-chunk):
```
event: start
data: {"event":"start","progress":5,"message":"Bắt đầu xử lý tài liệu (45 trang, 125,000 ký tự)","data":{"document_id":"doc_001","title":"Quy trình an toàn nổ mìn","page_count":45,"total_chars":125000,"strategy":"chunk-by-chunk"}}

event: start_chunks
data: {"event":"start_chunks","progress":8,"message":"Chia tài liệu thành 5 phần để xử lý","data":{"total_chunks":5}}

event: chunk_start
data: {"event":"chunk_start","progress":10,"message":"Đang xử lý phần 1/5 (14,500 ký tự)...","data":{"chunk":1,"total_chunks":5,"chunk_chars":14500}}

event: chunk_done
data: {"event":"chunk_done","progress":24,"message":"Hoàn thành phần 1/5: 3 bài học, 9 câu hỏi","data":{"chunk":1,"total_chunks":5,"lessons_count":3,"questions_count":9,"lessons":[{"order":1,"title":"Khái niệm cơ bản về nổ mìn"},{"order":2,"title":"Phân loại vật liệu nổ"},{"order":3,"title":"Quy định pháp luật"}],"cumulative_lessons":3,"cumulative_questions":9}}

event: chunk_start
data: {"event":"chunk_start","progress":24,"message":"Đang xử lý phần 2/5 (13,200 ký tự)...","data":{"chunk":2,"total_chunks":5,"chunk_chars":13200}}

event: chunk_done
data: {"event":"chunk_done","progress":38,"message":"Hoàn thành phần 2/5: 2 bài học, 7 câu hỏi","data":{"chunk":2,"total_chunks":5,"lessons_count":2,"questions_count":7,"lessons":[{"order":1,"title":"Quy trình chuẩn bị nổ mìn"},{"order":2,"title":"Kỹ thuật nổ hầm lò"}],"cumulative_lessons":5,"cumulative_questions":16}}

... (chunk 3, 4, 5) ...

event: metadata
data: {"event":"metadata","progress":83,"message":"Đang tạo thông tin tổng quan khóa học..."}

event: metadata_done
data: {"event":"metadata_done","progress":88,"message":"Khóa học: An toàn nổ mìn trong khai thác than","data":{"title":"An toàn nổ mìn trong khai thác than","description":"Khóa học huấn luyện...","objectives":["Nắm vững quy trình an toàn nổ mìn","Nhận biết các nguy cơ khi nổ mìn"]}}

event: saving
data: {"event":"saving","progress":92,"message":"Đang lưu 12 bài học và 45 câu hỏi vào cơ sở dữ liệu..."}

event: complete
data: {"event":"complete","progress":100,"message":"Đã tạo thành công...","data":{"document":{...},"processing":{...},"course":{...},"questions":{...}}}
```

> **Lưu ý cho FE:**
> - Sử dụng `fetch()` + `ReadableStream` (không phải `EventSource` vì cần POST)
> - Mỗi event `chunk_done` có `cumulative_lessons` và `cumulative_questions` để hiển thị tổng đang tăng dần
> - Event `complete` chứa toàn bộ kết quả (giống response của endpoint không streaming)
> - Nếu có `chunk_error`, các chunk khác vẫn tiếp tục xử lý
> - Nếu có `error`, quá trình dừng hoàn toàn

---

### `GET /api/v1/documents` - Danh sách tài liệu (phân trang)

**Tham số truy vấn:**
| Tham số | Kiểu | Mô tả |
|---|---|---|
| `document_type` | string | `company_internal`, `safety_procedure`, `legal_document`, `question_bank` |
| `occupation` | string | Lọc theo nghề |
| `skill_level` | int | Lọc theo bậc thợ |
| `training_group` | string | `atvsld`, `skill_upgrade`, `safety_hygiene`, `legal_knowledge` |
| `status` | string | `draft`, `pending_review`, `approved`, `rejected` |
| `page` | int | Trang (mặc định: 1) |
| `page_size` | int | Số bản ghi/trang (mặc định: 20) |

**Phản hồi:** `PaginatedResponse[DocumentListResponse]`

### `GET /api/v1/documents/{doc_id}` - Chi tiết tài liệu

### `PUT /api/v1/documents/{doc_id}` - Cập nhật metadata

### `PATCH /api/v1/documents/{doc_id}/status` - Đổi trạng thái phê duyệt

**Nội dung yêu cầu:**
```json
{
  "status": "approved",
  "reviewed_by": "officer_001",
  "review_notes": "Nội dung chính xác, phê duyệt"
}
```

### `DELETE /api/v1/documents/{doc_id}` - Xoá tài liệu (xoá cả file)

### `GET /api/v1/documents/{doc_id}/download` - Tải file gốc

**Phản hồi:** File download trực tiếp

---

## 6. Khóa học

### `POST /api/v1/courses` - Tạo khoá học thủ công

**Nội dung yêu cầu:**
```json
{
  "title": "An toàn điện trong hầm lò",
  "description": "Khoá học về an toàn sử dụng điện trong hầm lò khai thác",
  "objectives": ["Nhận biết nguy cơ điện", "Sử dụng thiết bị an toàn"],
  "occupation": "Thợ điện hầm lò",
  "skill_level": 3,
  "training_group": "atvsld",
  "lessons": [
    {
      "order": 1,
      "title": "Nguy cơ điện trong hầm lò",
      "theory": "Nội dung lý thuyết chi tiết...",
      "scenario": "Tình huống: Phát hiện dây điện bị hỏng...",
      "safety_notes": "Luôn cắt điện trước khi sửa chữa...",
      "duration_minutes": 45,
      "image_url": null
    }
  ],
  "created_by": "officer_001"
}
> **`image_url`**: Ban đầu `null`. Sau khi gọi `POST /{course_id}/generate-images`, field này sẽ được cập nhật với đường dẫn ảnh minh họa do AI sinh ra.
```

### `POST /api/v1/courses/ai-generate` - AI tạo khoá học từ tài liệu đã duyệt

**Nội dung yêu cầu:**
```json
{
  "document_ids": ["doc_001", "doc_002"],
  "occupation": "Thợ khai thác lò",
  "skill_level": 3,
  "training_group": "atvsld",
  "created_by": "officer_001"
}
```

> Lưu ý: document_ids phải là các tài liệu đã được phê duyệt (status = approved)

### `GET /api/v1/courses` - Danh sách khoá học (phân trang)

**Tham số truy vấn:**
| Tham số | Kiểu | Mô tả |
|---|---|---|
| `occupation` | string | Lọc theo nghề |
| `skill_level` | int | Lọc theo bậc thợ |
| `training_group` | string | Lọc theo nhóm huấn luyện |
| `status` | string | Lọc theo trạng thái phê duyệt |
| `page` | int | Trang |
| `page_size` | int | Số bản ghi/trang |

### `GET /api/v1/courses/{course_id}` - Chi tiết khoá học (bao gồm bài học)

### `PUT /api/v1/courses/{course_id}` - Sửa khoá học (chỉnh nội dung AI trước khi duyệt)

### `PATCH /api/v1/courses/{course_id}/status` - Phê duyệt / Từ chối

**Nội dung yêu cầu:**
```json
{
  "status": "approved",
  "reviewed_by": "officer_001",
  "review_notes": "Đã kiểm tra, nội dung chính xác"
}
```

### `DELETE /api/v1/courses/{course_id}` - Xoá khoá học

---

### `POST /api/v1/courses/{course_id}/generate-images` - AI sinh ảnh cho TẤT CẢ bài học

> Sử dụng **DALL-E 3** sinh ảnh minh họa cho từng bài học trong khóa học.
> Ảnh được tạo dựa trên tiêu đề + nội dung lý thuyết, phong cách infographic an toàn lao động.
> Sau khi sinh, `image_url` được cập nhật vào từng bài học.

**Phản hồi:**
```json
{
  "course_id": "course_001",
  "course_title": "An toàn khai thác lò",
  "total": 5,
  "generated": 5,
  "results": [
    {
      "lesson_order": 1,
      "lesson_title": "Khái niệm cơ bản về an toàn hầm lò",
      "image_url": "/api/v1/images/course_001_lesson1_a1b2c3d4.png"
    },
    {
      "lesson_order": 2,
      "lesson_title": "Thiết bị bảo hộ cá nhân",
      "image_url": "/api/v1/images/course_001_lesson2_e5f6g7h8.png"
    }
  ]
}
```

> **Lưu ý cho FE:**
> - Mỗi bài học mất ~10-20 giây để sinh ảnh (DALL-E 3)
> - Khóa học 10 bài → ~2-3 phút tổng cộng
> - Nên hiển thị loading khi gọi endpoint này
> - `image_url` là đường dẫn tương đối, truy cập ảnh: `GET /api/v1/images/{filename}`
> - Nếu bài học đã có ảnh, gọi lại sẽ tạo ảnh mới (thay thế)

### `POST /api/v1/courses/{course_id}/lessons/{lesson_order}/generate-image` - AI sinh ảnh cho 1 bài học

> Sinh ảnh minh họa cho **1 bài học cụ thể** (theo `lesson_order`).

**Phản hồi:**
```json
{
  "lesson_order": 3,
  "lesson_title": "Quy trình xử lý sự cố khí methane",
  "image_url": "/api/v1/images/course_001_lesson3_x9y0z1w2.png"
}
```

### `GET /api/v1/images/{filename}` - Truy cập ảnh đã sinh

> Static file serving. Trả về file ảnh PNG trực tiếp.
> Dùng làm `src` cho thẻ `<img>` trên FE.

```html
<img src="http://localhost:8000/api/v1/images/course_001_lesson1_a1b2c3d4.png" />
```

---

## 7. Ngân hàng câu hỏi

### `POST /api/v1/questions` - Tạo câu hỏi thủ công

**Câu hỏi trắc nghiệm:**
```json
{
  "content": "Khi phát hiện rò khí methane, hành động đầu tiên là gì?",
  "question_type": "multiple_choice",
  "difficulty": "medium",
  "options": [
    {"label": "A", "text": "Tiếp tục làm việc", "is_correct": false},
    {"label": "B", "text": "Báo cáo và sơ tán ngay", "is_correct": true},
    {"label": "C", "text": "Tự tắt máy", "is_correct": false},
    {"label": "D", "text": "Chờ kỹ thuật đến", "is_correct": false}
  ],
  "explanation": "Khi phát hiện rò khí methane, phải báo cáo và sơ tán ngay theo quy trình...",
  "occupation": "Thợ khai thác lò",
  "skill_level": 3,
  "training_group": "atvsld",
  "topic_tags": ["khí methane", "xử lý sự cố"],
  "created_by": "officer_001"
}
```

**Câu hỏi đúng/sai:**
```json
{
  "content": "Có thể sử dụng đèn pin thông thường trong hầm lò có khí methane",
  "question_type": "true_false",
  "difficulty": "easy",
  "correct_answer_bool": false,
  "explanation": "Trong hầm lò có khí methane chỉ được sử dụng thiết bị phòng nổ...",
  "occupation": "Thợ khai thác lò",
  "skill_level": 3,
  "training_group": "atvsld",
  "topic_tags": ["thiết bị phòng nổ"],
  "created_by": "officer_001"
}
```

**Câu hỏi tình huống:**
```json
{
  "content": "Mô tả cách xử lý khi phát hiện sập lò trong khu vực khai thác",
  "question_type": "scenario_based",
  "difficulty": "hard",
  "scenario_description": "Bạn đang làm việc tại gương khai thác, phát hiện vách than có vết nứt lớn...",
  "expected_key_points": [
    "Dừng công việc ngay",
    "Cảnh báo đồng nghiệp",
    "Báo cáo quản đốc",
    "Sơ tán theo đường thoát hiểm"
  ],
  "explanation": "Khi phát hiện dấu hiệu sập lò, phải tuân thủ quy trình...",
  "occupation": "Thợ khai thác lò",
  "skill_level": 4,
  "training_group": "atvsld",
  "topic_tags": ["sập lò", "xử lý sự cố"],
  "created_by": "officer_001"
}
```

### `POST /api/v1/questions/ai-generate` - AI tạo câu hỏi

**Nội dung yêu cầu:**
```json
{
  "source_document_ids": ["doc_001"],
  "source_course_id": "course_001",
  "occupation": "Thợ khai thác lò",
  "skill_level": 3,
  "training_group": "atvsld",
  "question_type": "multiple_choice",
  "difficulty": "medium",
  "count": 10,
  "created_by": "officer_001"
}
```

**Phản hồi:** `QuestionResponse[]` (mảng các câu hỏi đã tạo)

### `GET /api/v1/questions` - Danh sách câu hỏi (phân trang)

**Tham số truy vấn:**
| Tham số | Kiểu | Mô tả |
|---|---|---|
| `question_type` | string | `multiple_choice`, `true_false`, `scenario_based` |
| `difficulty` | string | `easy`, `medium`, `hard` |
| `occupation` | string | Lọc theo nghề |
| `skill_level` | int | Lọc theo bậc thợ |
| `training_group` | string | Lọc theo nhóm huấn luyện |
| `topic_tag` | string | Lọc theo tag chủ đề |
| `status` | string | Lọc theo trạng thái phê duyệt |
| `page` | int | Trang |
| `page_size` | int | Số bản ghi/trang |

### `GET /api/v1/questions/topic-tags` - Lấy tất cả topic tags duy nhất

> Dùng cho dropdown/filter chủ đề trên FE. Trả về mảng tất cả tag không trùng lặp, sắp xếp theo bảng chữ cái. Không cần truyền tham số.

**Phản hồi:** `string[]`
```json
["an toàn điện", "khí methane", "sập lò", "thiết bị phòng nổ", "xử lý sự cố"]
```

### `GET /api/v1/questions/{question_id}` - Chi tiết câu hỏi

### `PUT /api/v1/questions/{question_id}` - Sửa câu hỏi

### `PATCH /api/v1/questions/{question_id}/status` - Phê duyệt / Từ chối

### `POST /api/v1/questions/bulk-approve` - Duyệt nhiều câu hỏi cùng lúc

**Nội dung yêu cầu:**
```json
{
  "question_ids": ["q_001", "q_002", "q_003"],
  "reviewed_by": "officer_001"
}
```

**Phản hồi:**
```json
{
  "success": true,
  "message": "Đã duyệt 3 câu hỏi"
}
```

### `DELETE /api/v1/questions/{question_id}` - Xoá câu hỏi

---

## 8. Thi & Chấm điểm

### 8.1 Mẫu đề thi

### `POST /api/v1/exams/templates` - Tạo mẫu đề thi

**Nội dung yêu cầu:**
```json
{
  "name": "Đề thi ATVSLĐ định kỳ - Thợ khai thác lò bậc 3",
  "exam_type": "periodic_atvsld",
  "training_group": "atvsld",
  "occupation": "Thợ khai thác lò",
  "skill_level": 3,
  "total_questions": 30,
  "duration_minutes": 45,
  "passing_score": 5.0,
  "distributions": [
    {"topic_tag": "khí methane", "question_type": "multiple_choice", "difficulty": "easy", "count": 5},
    {"topic_tag": "khí methane", "question_type": "multiple_choice", "difficulty": "medium", "count": 5},
    {"topic_tag": "xử lý sự cố", "question_type": "multiple_choice", "difficulty": "hard", "count": 5},
    {"question_type": "true_false", "difficulty": "easy", "count": 5},
    {"question_type": "true_false", "difficulty": "medium", "count": 5},
    {"question_type": "scenario_based", "difficulty": "hard", "count": 5}
  ],
  "excellent_threshold": 9.0,
  "good_threshold": 7.0,
  "average_threshold": 5.0,
  "created_by": "officer_001"
}
```

### `GET /api/v1/exams/templates` - Danh sách mẫu (phân trang)

**Tham số truy vấn:** `exam_type`, `status`, `page`, `page_size`

### `GET /api/v1/exams/templates/{template_id}` - Chi tiết mẫu

### `PUT /api/v1/exams/templates/{template_id}` - Sửa mẫu

### `PATCH /api/v1/exams/templates/{template_id}/status` - Duyệt mẫu

### `DELETE /api/v1/exams/templates/{template_id}` - Xoá mẫu

---

### 8.2 Kỳ thi

### `POST /api/v1/exams/generate` - Tạo đề thi từ mẫu (AI chọn câu hỏi)

**Nội dung yêu cầu:**
```json
{
  "template_id": "template_001",
  "name": "Kỳ thi ATVSLĐ Q1-2026 - Đợt 1",
  "exam_mode": "online",
  "scheduled_date": "2026-03-15T08:00:00Z",
  "exam_period_id": "Q1-2026",
  "created_by": "officer_001"
}
```

> `exam_period_id`: Nhóm các đề thi cùng kỳ. Hệ thống đảm bảo **không trùng câu hỏi** giữa các đề trong cùng kỳ.

**Phản hồi:** `ExamResponse`
```json
{
  "id": "exam_001",
  "name": "Kỳ thi ATVSLĐ Q1-2026 - Đợt 1",
  "exam_type": "periodic_atvsld",
  "exam_mode": "online",
  "template_id": "template_001",
  "occupation": "Thợ khai thác lò",
  "skill_level": 3,
  "total_questions": 30,
  "total_points": 30.0,
  "duration_minutes": 45,
  "passing_score": 5.0,
  "scheduled_date": "2026-03-15T08:00:00Z",
  "is_active": true,
  "created_by": "officer_001",
  "created_at": "2026-02-28T10:00:00Z"
}
```

### `GET /api/v1/exams` - Danh sách kỳ thi (phân trang)

**Tham số truy vấn:** `exam_type`, `occupation`, `skill_level`, `is_active`, `page`, `page_size`

---

### 8.3 Thi & Nộp bài

### `GET /api/v1/exams/{exam_id}/take` - Lấy đề thi để làm bài

> **Dùng cho màn hình làm bài thi.** Trả về câu hỏi **KHÔNG có đáp án đúng.**

**Phản hồi:**
```json
{
  "id": "exam_001",
  "name": "Kỳ thi ATVSLĐ Q1-2026 - Đợt 1",
  "duration_minutes": 45,
  "total_questions": 30,
  "questions": [
    {
      "question_id": "q_001",
      "order": 1,
      "content": "Khi phát hiện rò khí methane, hành động đầu tiên là gì?",
      "question_type": "multiple_choice",
      "options": [
        {"label": "A", "text": "Tiếp tục làm việc"},
        {"label": "B", "text": "Báo cáo và sơ tán ngay"},
        {"label": "C", "text": "Tự tắt máy"},
        {"label": "D", "text": "Chờ kỹ thuật đến"}
      ]
    },
    {
      "question_id": "q_002",
      "order": 2,
      "content": "Có thể sử dụng đèn pin thông thường trong hầm lò có khí methane",
      "question_type": "true_false",
      "options": []
    },
    {
      "question_id": "q_003",
      "order": 3,
      "content": "Mô tả cách xử lý khi phát hiện sập lò",
      "question_type": "scenario_based",
      "options": []
    }
  ]
}
```

> **FE cần làm:**
> - Bắt đầu đếm ngược thời gian (`duration_minutes`)
> - Hiển thị câu hỏi theo `question_type`:
>   - `multiple_choice`: Radio buttons A/B/C/D
>   - `true_false`: 2 nút Đúng / Sai
>   - `scenario_based`: Textarea để nhập tự luận

### `POST /api/v1/exams/{exam_id}/submit` - Nộp bài thi

**Nội dung yêu cầu:**
```json
{
  "user_id": "user_001",
  "answers": [
    {"question_id": "q_001", "question_order": 1, "selected_answer": "B"},
    {"question_id": "q_002", "question_order": 2, "selected_answer": "false"},
    {"question_id": "q_003", "question_order": 3, "text_answer": "Dừng công việc, cảnh báo đồng nghiệp, báo cáo quản đốc, sơ tán theo đường thoát hiểm"}
  ]
}
```

> **Lưu ý:**
> - `selected_answer`: "A"/"B"/"C"/"D" cho trắc nghiệm, "true"/"false" cho đúng/sai
> - `text_answer`: Văn bản tự luận cho câu tình huống

**Phản hồi:** (tự động chấm điểm)
```json
{
  "id": "sub_001",
  "exam_id": "exam_001",
  "user_id": "user_001",
  "total_score": 7.33,
  "total_correct": 22,
  "total_questions": 30,
  "classification": "good",
  "answers": [
    {
      "question_id": "q_001",
      "question_order": 1,
      "selected_answer": "B",
      "is_correct": true,
      "points_earned": 1.0
    },
    {
      "question_id": "q_002",
      "question_order": 2,
      "selected_answer": "false",
      "is_correct": true,
      "points_earned": 1.0
    },
    {
      "question_id": "q_003",
      "question_order": 3,
      "text_answer": "Dừng công việc...",
      "is_correct": true,
      "points_earned": 0.75
    }
  ],
  "submitted_at": "2026-03-15T08:42:00Z",
  "graded_at": "2026-03-15T08:42:00Z",
  "created_at": "2026-03-15T08:42:00Z"
}
```

---

### 8.4 Kết quả thi

### `GET /api/v1/exams/{exam_id}/submissions` - Tất cả bài nộp của 1 kỳ thi

**Tham số truy vấn:** `page`, `page_size`

### `GET /api/v1/exams/submissions/{submission_id}` - Chi tiết 1 bài nộp

### `GET /api/v1/exams/submissions/user/{user_id}` - Lịch sử thi của 1 người

**Tham số truy vấn:** `page`, `page_size`

---

## 9. Học tập & Ôn luyện

### `GET /api/v1/study/materials` - Tài liệu tự học

**Tham số truy vấn:**
| Tham số | Kiểu | Mô tả |
|---|---|---|
| `occupation` | string | Lọc theo nghề |
| `skill_level` | int | Lọc theo bậc thợ |

**Phản hồi:**
```json
{
  "courses": [
    {
      "id": "course_001",
      "title": "An toàn khai thác lò",
      "description": "...",
      "occupation": "Thợ khai thác lò",
      "skill_level": 3,
      "training_group": "atvsld",
      "lesson_count": 5
    }
  ],
  "documents": [
    {
      "id": "doc_001",
      "title": "Quy trình an toàn nổ mìn",
      "description": "...",
      "document_type": "safety_procedure",
      "file_name": "quy_trinh.pdf"
    }
  ]
}
```

### `POST /api/v1/study/chat` - Chat với AI gia sư

**Nội dung yêu cầu:**
```json
{
  "user_id": "user_001",
  "session_id": null,
  "message": "Cho tôi hỏi về quy trình kiểm tra khí methane trước khi vào lò?",
  "occupation": "Thợ khai thác lò",
  "skill_level": 3
}
```

> - Lần đầu: `session_id = null`, hệ thống tạo phiên mới
> - Lần sau: gửi lại `session_id` từ response trước để tiếp tục hội thoại

**Phản hồi:**
```json
{
  "session_id": "session_001",
  "response": "Quy trình kiểm tra khí methane trước khi vào lò gồm các bước sau:\n\n1. Sử dụng máy đo khí methane đã được kiểm định...\n2. Kiểm tra nồng độ khí tại các điểm quy định...\n3. Nồng độ methane không được vượt quá 1%..."
}
```

### `POST /api/v1/study/explain-wrong-answers` - AI giải thích câu sai

**Nội dung yêu cầu:**
```json
{
  "submission_id": "sub_001"
}
```

**Phản hồi:**
```json
{
  "explanation": "## Phân tích các câu trả lời sai:\n\n**Câu 5:** Bạn chọn A (Tiếp tục làm việc), nhưng đáp án đúng là B (Báo cáo và sơ tán).\n**Giải thích:** Khi phát hiện rò khí methane..."
}
```

### `POST /api/v1/study/suggest-review` - AI gợi ý ôn tập

**Nội dung yêu cầu:**
```json
{
  "submission_id": "sub_001"
}
```

**Phản hồi:**
```json
{
  "analysis": "Kết quả thi 7.0/10, xếp loại Khá. Bạn yếu ở phần xử lý sự cố và thiết bị phòng nổ.",
  "weak_topics": ["Xử lý sự cố khí methane", "Thiết bị phòng nổ"],
  "suggestions": [
    {
      "topic": "Xử lý sự cố khí methane",
      "reason": "Trả lời sai 3/5 câu về chủ đề này",
      "focus_points": ["Quy trình sơ tán khi có khí methane", "Nồng độ giới hạn cho phép"]
    }
  ]
}
```

### `POST /api/v1/study/practice-questions` - Tạo câu hỏi luyện tập

**Nội dung yêu cầu:**
```json
{
  "topic": "An toàn điện trong hầm lò",
  "occupation": "Thợ điện hầm lò",
  "skill_level": 3,
  "count": 5
}
```

**Phản hồi:**
```json
{
  "questions": [
    {
      "content": "Điện áp an toàn trong hầm lò là bao nhiêu?",
      "question_type": "multiple_choice",
      "difficulty": "easy",
      "options": [
        {"label": "A", "text": "220V", "is_correct": false},
        {"label": "B", "text": "42V", "is_correct": false},
        {"label": "C", "text": "36V", "is_correct": true},
        {"label": "D", "text": "12V", "is_correct": false}
      ],
      "explanation": "Theo quy định, điện áp an toàn trong hầm lò khai thác không được vượt quá 36V..."
    }
  ]
}
```

### `GET /api/v1/study/sessions?user_id=xxx` - Lịch sử phiên học

### `GET /api/v1/study/sessions/{session_id}` - Chi tiết phiên + lịch sử chat

---

## 10. Báo cáo

### `GET /api/v1/reports/dashboard` - Tổng quan dashboard

**Phản hồi:**
```json
{
  "active_courses": 12,
  "total_documents": 45,
  "total_questions": 320,
  "total_users": 150,
  "active_exams": 5,
  "total_submissions": 1200,
  "pass_rate": 85.3
}
```

### `GET /api/v1/reports/training-list` - Danh sách huấn luyện theo đơn vị

**Tham số truy vấn:** `department_id`, `occupation`

**Phản hồi:**
```json
{
  "department_name": "Phân xưởng khai thác 1",
  "total": 25,
  "items": [
    {
      "full_name": "Nguyễn Văn A",
      "employee_id": "NV001",
      "occupation": "Thợ khai thác lò",
      "skill_level": 3,
      "exam_name": "Kỳ thi ATVSLĐ Q1-2026",
      "score": 8.5,
      "classification": "good"
    }
  ]
}
```

### `GET /api/v1/reports/exam-results` - Kết quả thi

**Tham số truy vấn:** `exam_type`, `occupation`, `date_from` (ISO), `date_to` (ISO)

### `GET /api/v1/reports/individual/{user_id}` - Hồ sơ huấn luyện cá nhân

**Phản hồi:**
```json
{
  "user": {
    "full_name": "Nguyễn Văn A",
    "employee_id": "NV001",
    "occupation": "Thợ khai thác lò",
    "skill_level": 3,
    "department_id": "dept_001"
  },
  "exam_history": [
    {
      "exam_name": "Kỳ thi ATVSLĐ Q1-2026",
      "exam_type": "periodic_atvsld",
      "score": 8.5,
      "classification": "good",
      "submitted_at": "2026-03-15T08:42:00Z"
    }
  ],
  "total_exams": 5
}
```

### `GET /api/v1/reports/statistics` - Thống kê tổng hợp

**Tham số truy vấn:**
| Tham số | Kiểu | Mô tả |
|---|---|---|
| `group_by` | string | `occupation` (mặc định), `classification`, `department_id` |
| `department_id` | string | Lọc theo đơn vị |

**Phản hồi:**
```json
{
  "group_by": "occupation",
  "statistics": [
    {
      "group": "Thợ khai thác lò",
      "total": 50,
      "passed": 42,
      "pass_rate": 84.0,
      "avg_score": 7.2,
      "excellent": 5,
      "good": 20,
      "average": 17,
      "fail": 8
    }
  ]
}
```

### `POST /api/v1/reports/export/excel` - Xuất báo cáo Excel

**Nội dung yêu cầu:**
```json
{
  "report_type": "training_list",
  "department_id": "dept_001"
}
```

> `report_type`: `training_list`, `exam_results`, `individual`

**Phản hồi:** File Excel download

### `POST /api/v1/reports/export/pdf` - Xuất báo cáo PDF

**Nội dung yêu cầu:** (giống Excel)

**Phản hồi:** File PDF download

---

## 11. Luồng nghiệp vụ chính

### Luồng 1: Tải tài liệu lên + AI tự động tạo nội dung

```
[Cán bộ đào tạo tải file PDF/DOCX lên]
         |
         v
POST /documents/upload-and-generate-stream  ← KHUYẾN NGHỊ (SSE streaming)
POST /documents/upload-and-generate         ← Fallback (chờ toàn bộ)
         |
         v
[SSE stream tiến trình về FE: % hoàn thành, bài học/câu hỏi đang tạo]
    start (5%) → chunk_start → chunk_done (10-80%) → metadata (83%) → saving (92%) → complete (100%)
         |
         v
[Trả về: 1 khoá học (DRAFT) + N câu hỏi (DRAFT)]
    Tài liệu càng dài → càng nhiều bài học và câu hỏi
         |
         v
[Cán bộ đào tạo xem lại, chỉnh sửa nếu cần]
    PUT /courses/{id}          -- Sửa khoá học
    PUT /questions/{id}        -- Sửa câu hỏi
         |
         v
[Phê duyệt]
    PATCH /courses/{id}/status      {"status": "approved"}
    POST /questions/bulk-approve    {"question_ids": [...]}
```

### Luồng 2: Tổ chức kỳ thi

```
[Tạo mẫu đề thi]
    POST /exams/templates
         |
         v
[Duyệt mẫu]
    PATCH /exams/templates/{id}/status  {"status": "approved"}
         |
         v
[Tạo đề thi từ mẫu (AI chọn câu hỏi)]
    POST /exams/generate
         |
         v
[Người lao động làm bài]
    GET  /exams/{id}/take     -- Lấy đề (không có đáp án)
    POST /exams/{id}/submit   -- Nộp bài (tự động chấm điểm)
         |
         v
[Xem kết quả]
    GET /exams/{id}/submissions
    GET /exams/submissions/user/{user_id}
```

### Luồng 3: Học tập & Ôn luyện

```
[Xem tài liệu tự học]
    GET /study/materials?occupation=xxx&skill_level=3
         |
         v
[Chat với AI gia sư]
    POST /study/chat  {"message": "Cho tôi hỏi về...", "user_id": "xxx"}
         |
         v
[Sau khi thi xong - xem phân tích]
    POST /study/explain-wrong-answers  {"submission_id": "xxx"}
    POST /study/suggest-review         {"submission_id": "xxx"}
         |
         v
[Luyện tập thêm]
    POST /study/practice-questions  {"topic": "An toàn điện", ...}
```

### Luồng 4: Báo cáo & Thống kê

```
[Dashboard tổng quan]
    GET /reports/dashboard
         |
         v
[Xem báo cáo chi tiết]
    GET /reports/training-list?department_id=xxx
    GET /reports/exam-results?exam_type=periodic_atvsld
    GET /reports/individual/{user_id}
    GET /reports/statistics?group_by=occupation
         |
         v
[Xuất file]
    POST /reports/export/excel  {"report_type": "training_list", ...}
    POST /reports/export/pdf    {"report_type": "exam_results", ...}
```

---

## Ghi chú chung cho FE

### Phân trang
Tất cả endpoint danh sách đều hỗ trợ phân trang:
- Truy vấn: `page=1&page_size=20`
- Phản hồi: `{ items: [], total, page, page_size, total_pages }`

### Phản hồi lỗi
```json
{
  "detail": "Mô tả lỗi"
}
```
Mã HTTP: 400 (Yêu cầu không hợp lệ), 404 (Không tìm thấy), 500 (Lỗi máy chủ)

### Tải file lên
- Dùng `multipart/form-data`
- Trường `metadata` là JSON string (không phải JSON object)
- File tối đa 50MB
- Định dạng cho phép: `.pdf`, `.docx`, `.doc`, `.xlsx`, `.xls`, `.txt`

### SSE Streaming
- Endpoint `upload-and-generate-stream` trả về `text/event-stream` (SSE)
- Dùng `fetch()` + `ReadableStream` để đọc (không dùng `EventSource` vì cần POST multipart)
- Mỗi event có format: `event: <tên>\ndata: {"event":"...", "progress": 0-100, "message":"...", "data":{...}}\n\n`
- Event `chunk_done` có `cumulative_lessons` và `cumulative_questions` để hiển thị tổng đang tăng dần
- Event `complete` chứa toàn bộ kết quả (giống response của endpoint không streaming)
- Xem ví dụ code JavaScript chi tiết tại [mục 5 - upload-and-generate-stream](#post-apiv1documentsupload-and-generate-stream---tải-lên--ai-tạo-sse-streaming)

### Thời gian xử lý AI
- `upload-and-generate-stream`: 30-120 giây (có SSE streaming, FE thấy tiến trình realtime)
- `upload-and-generate`: 30-120 giây (không streaming, phải chờ toàn bộ)
- `ai-generate` (khoá học/câu hỏi): 15-30 giây
- `study/chat`: 3-10 giây
- Nên dùng endpoint streaming cho upload-and-generate để người dùng thấy tiến trình
- Các request AI khác nên hiển thị loading indicator
