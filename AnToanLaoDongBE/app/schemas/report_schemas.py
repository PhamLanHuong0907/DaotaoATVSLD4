from pydantic import BaseModel
from typing import Optional


class ReportExportRequest(BaseModel):
    report_type: str  # training_list, exam_results, individual, statistics
    department_id: Optional[str] = None
    user_id: Optional[str] = None
    occupation: Optional[str] = None
    exam_type: Optional[str] = None
    date_from: Optional[str] = None
    date_to: Optional[str] = None
