import asyncio 
# Force reload for Exam Period Filter fix
import os
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.config import get_settings
from app.db.mongodb import init_db, close_db
from app.utils.audit import AuditMiddleware

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    settings = get_settings()
    await init_db()
    logger.info("MongoDB connected, Beanie initialized")
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    os.makedirs(settings.EXPORT_DIR, exist_ok=True)
    os.makedirs(os.path.join(settings.UPLOAD_DIR, "images"), exist_ok=True)
    os.makedirs(os.path.join(settings.UPLOAD_DIR, "videos"), exist_ok=True)

    # Ensure at least one admin exists
    from app.api.auth import ensure_bootstrap_admin
    await ensure_bootstrap_admin()

    # Background task: notify users about expiring certificates daily
    bg_task = asyncio.create_task(_expiry_notifier_loop())

    try:
        yield
    finally:
        bg_task.cancel()
        try:
            await bg_task
        except asyncio.CancelledError:
            pass
        await close_db()
        logger.info("MongoDB connection closed")


async def _expiry_notifier_loop():
    """Run once on startup, then every 24h. Sends in-app notifications for
    certificates expiring in <= 30 days."""
    from app.services.certificate_service import notify_expiring_certificates
    while True:
        try:
            sent = await notify_expiring_certificates(within_days=30)
            if sent:
                logger.info("Cert expiry: sent %d notifications", sent)
        except Exception as e:
            logger.warning("Cert expiry notifier failed: %s", e)
        await asyncio.sleep(24 * 60 * 60)


app = FastAPI(
    title="He thong huan luyen ATVSLD - Cong ty than Duong Huy",
    description="AI-powered Occupational Safety Training System",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(AuditMiddleware)

# Register routers
from app.api.health import router as health_router
from app.api.auth import router as auth_router
from app.api.users import router as users_router
from app.api.documents import router as documents_router
from app.api.courses import router as courses_router
from app.api.questions import router as questions_router
from app.api.exams import router as exams_router
from app.api.exam_periods import router as exam_periods_router
from app.api.certificates import router as certificates_router
from app.api.notifications import router as notifications_router
from app.api.audit import router as audit_router
from app.api.system_settings import router as system_settings_router
from app.api.lesson_progress import router as lesson_progress_router
from app.api.practice import router as practice_router
from app.api.approvals import router as approvals_router
from app.api.ai_tutor import router as ai_tutor_router
from app.api.gamification import router as gamification_router
from app.api.forum import router as forum_router
from app.api.facilities import router as facilities_router
from app.api.webhooks import router as webhooks_router
from app.api.study import router as study_router
from app.api.reports import router as reports_router
from app.api.catalog import router as catalog_router

# Serve generated images as static files
_images_dir = os.path.join("./uploads", "images")
os.makedirs(_images_dir, exist_ok=True)
app.mount("/api/v1/images", StaticFiles(directory=_images_dir), name="images")

# Serve uploaded logos
_logos_dir = os.path.join("./uploads", "logos")
os.makedirs(_logos_dir, exist_ok=True)
app.mount("/api/v1/logos", StaticFiles(directory=_logos_dir), name="logos")

# Serve generated videos as static files
_videos_dir = os.path.join("./uploads", "videos")
os.makedirs(_videos_dir, exist_ok=True)
app.mount("/api/v1/videos", StaticFiles(directory=_videos_dir), name="videos")

app.include_router(health_router)
app.include_router(auth_router, prefix="/api/v1")
app.include_router(users_router, prefix="/api/v1")
app.include_router(documents_router, prefix="/api/v1")
app.include_router(courses_router, prefix="/api/v1")
app.include_router(questions_router, prefix="/api/v1")
app.include_router(exams_router, prefix="/api/v1")
app.include_router(exam_periods_router, prefix="/api/v1")
app.include_router(certificates_router, prefix="/api/v1")
app.include_router(notifications_router, prefix="/api/v1")
app.include_router(audit_router, prefix="/api/v1")
app.include_router(system_settings_router, prefix="/api/v1")
app.include_router(lesson_progress_router, prefix="/api/v1")
app.include_router(practice_router, prefix="/api/v1")
app.include_router(approvals_router, prefix="/api/v1")
app.include_router(ai_tutor_router, prefix="/api/v1")
app.include_router(gamification_router, prefix="/api/v1")
app.include_router(forum_router, prefix="/api/v1")
app.include_router(facilities_router, prefix="/api/v1")
app.include_router(webhooks_router, prefix="/api/v1")
app.include_router(study_router, prefix="/api/v1")
app.include_router(reports_router, prefix="/api/v1")
app.include_router(catalog_router, prefix="/api/v1")
