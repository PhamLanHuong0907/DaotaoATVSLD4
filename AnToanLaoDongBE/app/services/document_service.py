import os
import uuid
import logging
from datetime import datetime, timezone
from typing import Optional

from beanie import PydanticObjectId
from fastapi import UploadFile

from app.config import get_settings
from app.models.document import TrainingDocument
from app.models.enums import DocumentType, TrainingGroup, ApprovalStatus
from app.schemas.document_schemas import DocumentUploadMeta, DocumentUpdate
from app.utils.file_parser import FileParser

logger = logging.getLogger(__name__)


async def upload_document(file: UploadFile, meta: DocumentUploadMeta) -> TrainingDocument:
    settings = get_settings()

    # Validate file extension
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in settings.ALLOWED_FILE_TYPES:
        raise ValueError(f"File type {ext} not allowed. Allowed: {settings.ALLOWED_FILE_TYPES}")

    # Read file content
    content = await file.read()
    file_size = len(content)

    # Validate file size
    max_size = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if file_size > max_size:
        raise ValueError(f"File size {file_size} exceeds max {settings.MAX_UPLOAD_SIZE_MB}MB")

    # Generate unique filename and save path
    unique_name = f"{uuid.uuid4().hex}_{file.filename}"
    now = datetime.now(timezone.utc)
    sub_dir = os.path.join(settings.UPLOAD_DIR, meta.document_type.value, now.strftime("%Y-%m"))
    os.makedirs(sub_dir, exist_ok=True)
    file_path = os.path.join(sub_dir, unique_name)

    # Save file
    with open(file_path, "wb") as f:
        f.write(content)

    # Determine MIME type
    mime_type = FileParser.get_mime_type(file.filename)

    # Extract text page-by-page
    extracted_text = None
    extracted_pages = []
    total_chars = 0
    page_count = None
    try:
        parse_result = FileParser.extract(file_path, mime_type)
        extracted_pages = parse_result.pages
        extracted_text = parse_result.full_text
        total_chars = parse_result.total_chars
        page_count = parse_result.page_count
        logger.info(
            f"Extracted {page_count} pages, {total_chars} chars from {file.filename}"
        )
    except Exception as e:
        logger.warning(f"Failed to extract text from {file.filename}: {e}")

    # Create document record
    doc = TrainingDocument(
        title=meta.title,
        description=meta.description,
        document_type=meta.document_type,
        file_name=file.filename,
        file_path=file_path,
        file_size=file_size,
        mime_type=mime_type,
        occupations=meta.occupations,
        skill_levels=meta.skill_levels,
        training_groups=meta.training_groups,
        legal_basis=meta.legal_basis,
        tags=meta.tags,
        extracted_text=extracted_text,
        extracted_pages=extracted_pages,
        total_chars=total_chars,
        page_count=page_count,
        uploaded_by=meta.uploaded_by,
    )
    await doc.insert()
    return doc


async def get_documents(
    document_type: Optional[DocumentType] = None,
    occupation: Optional[str] = None,
    skill_level: Optional[int] = None,
    training_group: Optional[TrainingGroup] = None,
    status: Optional[ApprovalStatus] = None,
    skip: int = 0,
    limit: int = 20,
) -> tuple[list[TrainingDocument], int]:
    query = {}
    if document_type:
        query["document_type"] = document_type
    if occupation:
        query["occupations"] = occupation
    if skill_level is not None:
        query["skill_levels"] = skill_level
    if training_group:
        query["training_groups"] = training_group
    if status:
        query["status"] = status

    total = await TrainingDocument.find(query).count()
    docs = await TrainingDocument.find(query).sort("-created_at").skip(skip).limit(limit).to_list()
    return docs, total


async def get_document(doc_id: str) -> Optional[TrainingDocument]:
    return await TrainingDocument.get(PydanticObjectId(doc_id))


async def get_documents_for_user(
    department_id: Optional[str],
    occupation: Optional[str],
    skill_level: Optional[int],
) -> list[TrainingDocument]:
    """APPROVED documents available to a user (filter by department + occupation + level)."""
    query: dict = {"status": ApprovalStatus.APPROVED}
    if department_id:
        query["$or"] = [
            {"assigned_department_ids": {"$size": 0}},
            {"assigned_department_ids": department_id},
        ]
    # AND-style filter for optional fields (only filter if user has them set)
    extra_and: list[dict] = []
    if occupation:
        extra_and.append({"$or": [
            {"occupations": {"$size": 0}},
            {"occupations": occupation},
        ]})
    if skill_level is not None:
        extra_and.append({"$or": [
            {"skill_levels": {"$size": 0}},
            {"skill_levels": skill_level},
        ]})
    if extra_and:
        query["$and"] = extra_and
    return await TrainingDocument.find(query).sort("-created_at").to_list()


async def update_document(doc_id: str, data: DocumentUpdate) -> Optional[TrainingDocument]:
    doc = await TrainingDocument.get(PydanticObjectId(doc_id))
    if not doc:
        return None
    update_data = data.model_dump(exclude_unset=True)
    update_data["updated_at"] = datetime.now(timezone.utc)
    await doc.set(update_data)
    return doc


async def update_document_status(
    doc_id: str,
    status: ApprovalStatus,
    reviewed_by: Optional[str] = None,
    review_notes: Optional[str] = None,
) -> Optional[TrainingDocument]:
    doc = await TrainingDocument.get(PydanticObjectId(doc_id))
    if not doc:
        return None
    update_data = {
        "status": status,
        "updated_at": datetime.now(timezone.utc),
    }
    if reviewed_by:
        update_data["reviewed_by"] = reviewed_by
    if review_notes:
        update_data["review_notes"] = review_notes
    if status == ApprovalStatus.APPROVED:
        update_data["approved_at"] = datetime.now(timezone.utc)
    await doc.set(update_data)
    return doc


async def delete_document(doc_id: str) -> bool:
    doc = await TrainingDocument.get(PydanticObjectId(doc_id))
    if not doc:
        return False
    # Remove file from disk
    if os.path.exists(doc.file_path):
        os.remove(doc.file_path)
    await doc.delete()
    return True


async def get_approved_documents_text(document_ids: list[str]) -> list[dict]:
    """Get extracted text from approved documents for AI processing."""
    results = []
    for doc_id in document_ids:
        doc = await TrainingDocument.get(PydanticObjectId(doc_id))
        if doc and doc.status == ApprovalStatus.APPROVED and doc.extracted_text:
            results.append({
                "id": str(doc.id),
                "title": doc.title,
                "text": doc.extracted_text,
            })
    return results
