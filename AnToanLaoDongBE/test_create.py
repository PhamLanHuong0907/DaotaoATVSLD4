from datetime import datetime, timezone
import json
from pydantic import ValidationError
import os
import sys

# setup path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.schemas.exam_period_schemas import ExamRoomCreate
from app.models.enums import ExamMode

payload = {
    "name": "Test Room",
    "exam_period_id": "60a7f1f9a1f2c2b3e8a9d1a1",
    "exam_ids": ["60a7f1f9a1f2c2b3e8a9d1a2"],
    "exam_mode": "online",
    "department_id": "60a7f1f9a1f2c2b3e8a9d1a3",
    "location": "",
    "proctor_id": "",
    "scheduled_start": "2026-04-16T15:00:00.000Z",
    "scheduled_end": "2026-04-16T16:00:00.000Z",
    "capacity": 50,
    "candidate_user_ids": [],
    "notes": ""
}

try:
    obj = ExamRoomCreate(**payload)
    print("VALIDATION SUCCESS. Result:")
    print(obj.model_dump())
except ValidationError as e:
    print("VALIDATION ERROR:")
    print(e.json())
