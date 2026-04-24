import json
import math
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from fastapi.responses import FileResponse, StreamingResponse

from app.api.deps import get_current_user
from app.models.enums import DocumentType, TrainingGroup, ApprovalStatus
from app.models.user import User
from app.schemas.document_schemas import (
    DocumentUploadMeta, DocumentUpdate, DocumentResponse, DocumentListResponse,
)
from app.schemas.common import StatusResponse, StatusUpdateRequest
from app.utils.pagination import PaginatedResponse
from app.services import document_service
from app.services.auto_generate_service import (
    upload_and_auto_generate,
    upload_and_auto_generate_stream,
)

router = APIRouter(prefix="/documents", tags=["Knowledge Base"])


@router.post("/upload", response_model=DocumentResponse)
async def upload_document(
    file: UploadFile = File(...),
    metadata: str = Form(...),
):
    """Upload a training document with metadata (JSON string in form field)."""
    try:
        meta_dict = json.loads(metadata)
        meta = DocumentUploadMeta(**meta_dict)
    except (json.JSONDecodeError, Exception) as e:
        raise HTTPException(status_code=400, detail=f"Invalid metadata: {e}")

    try:
        doc = await document_service.upload_document(file, meta)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return DocumentResponse(id=str(doc.id), **doc.model_dump(exclude={"id", "extracted_text"}))


@router.post("/upload-and-generate")
async def upload_and_generate(
    file: UploadFile = File(...),
    metadata: str = Form(...),
):
    """
    Upload tài liệu + AI tự động tạo khóa học và câu hỏi trong 1 bước.

    Flow: Upload file → Đọc nội dung → AI phân tích → Tạo khóa học + câu hỏi

    metadata (JSON string):
    {
        "title": "Tên tài liệu",
        "document_type": "company_internal|safety_procedure|legal_document|question_bank",
        "occupations": ["Thợ khai thác lò"],
        "skill_levels": [3],
        "training_groups": ["atvsld"],
        "uploaded_by": "user_id"
    }

    Tất cả nội dung AI tạo ra đều ở trạng thái DRAFT, cần phê duyệt trước khi sử dụng.
    """
    # 1. Parse metadata
    try:
        meta_dict = json.loads(metadata)
        meta = DocumentUploadMeta(**meta_dict)
    except (json.JSONDecodeError, Exception) as e:
        raise HTTPException(status_code=400, detail=f"Invalid metadata: {e}")

    # 2. Upload & extract text
    try:
        doc = await document_service.upload_document(file, meta)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    if not doc.extracted_text:
        raise HTTPException(
            status_code=400,
            detail="Không thể đọc nội dung file. Hãy đảm bảo file PDF/DOCX có text (không phải scan ảnh).",
        )

    # 3. AI auto-generate course + questions
    try:
        result = await upload_and_auto_generate(doc)
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))

    return result


@router.post("/upload-and-generate-stream")
async def upload_and_generate_stream(
    file: UploadFile = File(...),
    metadata: str = Form(...),
):
    """
    Upload tài liệu + AI tự động tạo khóa học và câu hỏi - **Streaming (SSE)**.

    Trả về Server-Sent Events (text/event-stream) với tiến trình xử lý realtime.

    **SSE Events:**
    - `start` (5%): Thông tin tài liệu, chiến lược xử lý
    - `start_chunks` (8%): Số chunks đã chia (chỉ chunk-by-chunk)
    - `chunk_start` (10-80%): Bắt đầu xử lý chunk N/M
    - `chunk_done` (10-80%): Hoàn thành chunk, kèm bài học + câu hỏi đã tạo
    - `generating` (15%): AI đang xử lý (chỉ single-pass)
    - `metadata` (83%): Đang tạo metadata khóa học
    - `metadata_done` (88%): Metadata hoàn thành
    - `saving` (92%): Đang lưu vào DB
    - `complete` (100%): Hoàn thành, kèm kết quả cuối cùng
    - `error`: Lỗi xử lý

    **Mỗi event có format:**
    ```
    event: <event_name>
    data: {"event": "...", "progress": 0-100, "message": "...", "data": {...}}
    ```

    **Frontend usage (JavaScript):**
    ```js
    const formData = new FormData();
    formData.append('file', file);
    formData.append('metadata', JSON.stringify({...}));

    const response = await fetch('/api/v1/documents/upload-and-generate-stream', {
        method: 'POST',
        body: formData,
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value);
        // Parse SSE events from text
        for (const line of text.split('\\n')) {
            if (line.startsWith('data: ')) {
                const event = JSON.parse(line.slice(6));
                console.log(event.progress + '%', event.message);
                // Update UI with event.data
            }
        }
    }
    ```
    """
    # 1. Parse metadata
    try:
        meta_dict = json.loads(metadata)
        meta = DocumentUploadMeta(**meta_dict)
    except (json.JSONDecodeError, Exception) as e:
        raise HTTPException(status_code=400, detail=f"Invalid metadata: {e}")

    # 2. Upload & extract text
    try:
        doc = await document_service.upload_document(file, meta)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    if not doc.extracted_text:
        raise HTTPException(
            status_code=400,
            detail="Không thể đọc nội dung file. Hãy đảm bảo file PDF/DOCX có text (không phải scan ảnh).",
        )

    # 3. Return SSE stream
    return StreamingResponse(
        upload_and_auto_generate_stream(doc),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/{doc_id}/generate-content-stream")
async def generate_content_from_existing_stream(doc_id: str):
    """Sinh lại khóa học + câu hỏi từ 1 tài liệu ĐÃ CÓ (và đã duyệt).

    Cho phép chạy lặp lại nhiều lần để admin tạo thêm bộ khóa học/câu hỏi
    từ cùng 1 tài liệu. Yêu cầu tài liệu đã được phê duyệt.
    """
    from app.services.auto_generate_service import upload_and_auto_generate_stream
    from app.services import document_service
    from app.models.enums import ApprovalStatus

    doc = await document_service.get_document(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài liệu")
    if doc.status != ApprovalStatus.APPROVED:
        raise HTTPException(
            status_code=400,
            detail="Chỉ có thể tạo nội dung từ tài liệu đã phê duyệt",
        )
    if not doc.extracted_text:
        raise HTTPException(
            status_code=400,
            detail="Tài liệu không có nội dung text để phân tích",
        )

    return StreamingResponse(
        upload_and_auto_generate_stream(doc),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("", response_model=PaginatedResponse[DocumentListResponse])
async def list_documents(
    document_type: Optional[DocumentType] = None,
    occupation: Optional[str] = None,
    skill_level: Optional[int] = None,
    training_group: Optional[TrainingGroup] = None,
    status: Optional[ApprovalStatus] = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
):
    skip = (page - 1) * page_size
    docs, total = await document_service.get_documents(
        document_type=document_type,
        occupation=occupation,
        skill_level=skill_level,
        training_group=training_group,
        status=status,
        skip=skip, limit=page_size,
    )
    return PaginatedResponse(
        items=[
            DocumentListResponse(id=str(d.id), **d.model_dump(
                include={"title", "document_type", "file_name", "file_size",
                         "occupations", "training_groups", "assigned_department_ids",
                         "status", "created_at"}
            ))
            for d in docs
        ],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=math.ceil(total / page_size) if total > 0 else 0,
    )


@router.get("/my-documents", response_model=list[DocumentListResponse])
async def list_my_documents(user: User = Depends(get_current_user)):
    """Return APPROVED documents available to the current user."""
    docs = await document_service.get_documents_for_user(
        department_id=user.department_id,
        occupation=user.occupation,
        skill_level=user.skill_level,
    )
    return [
        DocumentListResponse(id=str(d.id), **d.model_dump(
            include={"title", "document_type", "file_name", "file_size",
                     "occupations", "training_groups", "assigned_department_ids",
                     "status", "created_at"}
        ))
        for d in docs
    ]


@router.get("/{doc_id}", response_model=DocumentResponse)
async def get_document(doc_id: str):
    doc = await document_service.get_document(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return DocumentResponse(id=str(doc.id), **doc.model_dump(exclude={"id", "extracted_text"}))


@router.put("/{doc_id}", response_model=DocumentResponse)
async def update_document(doc_id: str, data: DocumentUpdate):
    doc = await document_service.update_document(doc_id, data)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return DocumentResponse(id=str(doc.id), **doc.model_dump(exclude={"id", "extracted_text"}))


@router.patch("/{doc_id}/status", response_model=DocumentResponse)
async def update_document_status(doc_id: str, data: StatusUpdateRequest):
    try:
        status = ApprovalStatus(data.status)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid status: {data.status}")

    doc = await document_service.update_document_status(
        doc_id, status, data.reviewed_by, data.review_notes,
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return DocumentResponse(id=str(doc.id), **doc.model_dump(exclude={"id", "extracted_text"}))


@router.delete("/{doc_id}", response_model=StatusResponse)
async def delete_document(doc_id: str):
    success = await document_service.delete_document(doc_id)
    if not success:
        raise HTTPException(status_code=404, detail="Document not found")
    return StatusResponse(success=True, message="Document deleted")


@router.get("/{doc_id}/download")
async def download_document(doc_id: str):
    doc = await document_service.get_document(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return FileResponse(
        path=doc.file_path,
        filename=doc.file_name,
        media_type=doc.mime_type,
    )


@router.get("/{doc_id}/preview")
async def preview_document(doc_id: str):
    """Return file with Content-Disposition: inline for in-browser preview."""
    doc = await document_service.get_document(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return FileResponse(
        path=doc.file_path,
        media_type=doc.mime_type or "application/pdf",
        content_disposition_type="inline",
    )
