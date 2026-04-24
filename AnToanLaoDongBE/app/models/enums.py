from enum import Enum


class UserRole(str, Enum):
    ADMIN = "admin"
    TRAINING_OFFICER = "training_officer"
    WORKER = "worker"
    MANAGER = "manager"


class ExamPeriodStatus(str, Enum):
    DRAFT = "draft"
    SCHEDULED = "scheduled"
    IN_PROGRESS = "in_progress"
    FINISHED = "finished"
    CANCELLED = "cancelled"


class ExamRoomStatus(str, Enum):
    SCHEDULED = "scheduled"
    IN_PROGRESS = "in_progress"
    FINISHED = "finished"
    CANCELLED = "cancelled"


class ApprovalStatus(str, Enum):
    DRAFT = "draft"
    PENDING_REVIEW = "pending_review"
    APPROVED = "approved"
    REJECTED = "rejected"


class DocumentType(str, Enum):
    COMPANY_INTERNAL = "company_internal"
    SAFETY_PROCEDURE = "safety_procedure"
    LEGAL_DOCUMENT = "legal_document"
    QUESTION_BANK = "question_bank"


class TrainingGroup(str, Enum):
    ATVSLD = "atvsld"
    SKILL_UPGRADE = "skill_upgrade"
    SAFETY_HYGIENE = "safety_hygiene"
    LEGAL_KNOWLEDGE = "legal_knowledge"


class QuestionType(str, Enum):
    MULTIPLE_CHOICE = "multiple_choice"
    TRUE_FALSE = "true_false"
    SCENARIO_BASED = "scenario_based"


class DifficultyLevel(str, Enum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"


class ExamType(str, Enum):
    SKILL_UPGRADE = "skill_upgrade"
    PERIODIC_ATVSLD = "periodic_atvsld"
    SAFETY_HYGIENE = "safety_hygiene"
    LEGAL_KNOWLEDGE = "legal_knowledge"


class ExamMode(str, Enum):
    ONLINE = "online"
    ONSITE = "onsite"


class ResultClassification(str, Enum):
    EXCELLENT = "excellent"
    GOOD = "good"
    AVERAGE = "average"
    FAIL = "fail"


class ExamKind(str, Enum):
    TRIAL = "trial"
    OFFICIAL = "official"
