import asyncio
import logging
from app.db.mongodb import init_db
from app.models.exam import Exam, ExamSubmission

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def migrate():
    await init_db()
    logger.info("Starting migration of exam_kind in submissions...")
    
    submissions = await ExamSubmission.find_all().to_list()
    total = len(submissions)
    migrated = 0
    
    for sub in submissions:
        if sub.exam_kind is None:
            exam = await Exam.get(sub.exam_id)
            if exam:
                await sub.set({ExamSubmission.exam_kind: exam.exam_kind})
                migrated += 1
    
    logger.info(f"Migration completed. Total: {total}, Migrated: {migrated}")

if __name__ == "__main__":
    asyncio.run(migrate())
