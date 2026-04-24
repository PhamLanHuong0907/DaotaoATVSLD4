
import asyncio
from app.db.mongodb import init_db
from app.models.exam import Exam, ExamSubmission
from app.models.enums import ExamKind

async def check():
    await init_db()
    print("Checking submissions and exams...")
    
    # Get all submissions
    subs = await ExamSubmission.find_all().to_list()
    print(f"Total submissions: {len(subs)}")
    
    for sub in subs:
        exam = await Exam.get(sub.exam_id)
        if exam:
            print(f"Sub ID: {sub.id}, Exam Kind: {exam.exam_kind}, User: {sub.user_id}")
        else:
            print(f"Sub ID: {sub.id}, Exam {sub.exam_id} NOT FOUND")

if __name__ == "__main__":
    asyncio.run(check())
