export const ExamType = {
  SKILL_UPGRADE: 'skill_upgrade',
  PERIODIC_ATVSLD: 'periodic_atvsld',
  SAFETY_HYGIENE: 'safety_hygiene',
  LEGAL_KNOWLEDGE: 'legal_knowledge',
} as const;
export type ExamType = (typeof ExamType)[keyof typeof ExamType];

export const ExamMode = {
  ONLINE: 'online',
  ONSITE: 'onsite',
} as const;
export type ExamMode = (typeof ExamMode)[keyof typeof ExamMode];

export const QuestionType = {
  MULTIPLE_CHOICE: 'multiple_choice',
  TRUE_FALSE: 'true_false',
  SCENARIO_BASED: 'scenario_based',
} as const;
export type QuestionType = (typeof QuestionType)[keyof typeof QuestionType];

export const DifficultyLevel = {
  EASY: 'easy',
  MEDIUM: 'medium',
  HARD: 'hard',
} as const;
export type DifficultyLevel = (typeof DifficultyLevel)[keyof typeof DifficultyLevel];

export const ApprovalStatus = {
  DRAFT: 'draft',
  PENDING_REVIEW: 'pending_review',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;
export type ApprovalStatus = (typeof ApprovalStatus)[keyof typeof ApprovalStatus];

export const ResultClassification = {
  EXCELLENT: 'excellent',
  GOOD: 'good',
  AVERAGE: 'average',
  FAIL: 'fail',
} as const;
export type ResultClassification = (typeof ResultClassification)[keyof typeof ResultClassification];

export const UserRole = {
  ADMIN: 'admin',
  TRAINING_OFFICER: 'training_officer',
  WORKER: 'worker',
  MANAGER: 'manager',
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const ExamPeriodStatus = {
  DRAFT: 'draft',
  SCHEDULED: 'scheduled',
  IN_PROGRESS: 'in_progress',
  FINISHED: 'finished',
  CANCELLED: 'cancelled',
} as const;
export type ExamPeriodStatus = (typeof ExamPeriodStatus)[keyof typeof ExamPeriodStatus];

export const ExamRoomStatus = {
  SCHEDULED: 'scheduled',
  IN_PROGRESS: 'in_progress',
  FINISHED: 'finished',
  CANCELLED: 'cancelled',
} as const;
export type ExamRoomStatus = (typeof ExamRoomStatus)[keyof typeof ExamRoomStatus];

export const TrainingGroup = {
  ATVSLD: 'atvsld',
  SKILL_UPGRADE: 'skill_upgrade',
  SAFETY_HYGIENE: 'safety_hygiene',
  LEGAL_KNOWLEDGE: 'legal_knowledge',
} as const;
export type TrainingGroup = (typeof TrainingGroup)[keyof typeof TrainingGroup];

export const ExamKind = {
  TRIAL: 'trial',
  OFFICIAL: 'official',
} as const;
export type ExamKind = (typeof ExamKind)[keyof typeof ExamKind];
