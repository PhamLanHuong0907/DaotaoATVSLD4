from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie

from app.config import get_settings
from app.models.department import Department
from app.models.user import User

_client: AsyncIOMotorClient | None = None


def get_all_document_models():
    """Return all Beanie document models. Import here to avoid circular imports."""
    from app.models.document import TrainingDocument
    from app.models.course import Course
    from app.models.question import Question
    from app.models.exam_template import ExamTemplate
    from app.models.exam import Exam, ExamSubmission
    from app.models.study_session import StudySession
    from app.models.exam_period import ExamPeriod
    from app.models.exam_room import ExamRoom
    from app.models.certificate import Certificate
    from app.models.notification import Notification
    from app.models.audit_log import AuditLog
    from app.models.system_settings import SystemSettings
    from app.models.lesson_progress import LessonProgress
    from app.models.chat_session import ChatSession
    from app.models.gamification import UserScore
    from app.models.forum import ForumTopic
    from app.models.facility import Facility
    from app.models.webhook import Webhook
    from app.models.catalog import Occupation, CertificateType

    return [
        Department,
        User,
        TrainingDocument,
        Course,
        Question,
        ExamTemplate,
        Exam,
        ExamSubmission,
        StudySession,
        ExamPeriod,
        ExamRoom,
        Certificate,
        Notification,
        AuditLog,
        SystemSettings,
        LessonProgress,
        ChatSession,
        UserScore,
        ForumTopic,
        Facility,
        Webhook,
        Occupation,
        CertificateType,
    ]


async def init_db():
    global _client
    settings = get_settings()
    _client = AsyncIOMotorClient(settings.MONGODB_URI)
    await init_beanie(
        database=_client[settings.MONGODB_DATABASE],
        document_models=get_all_document_models(),
    )


async def close_db():
    global _client
    if _client:
        _client.close()
