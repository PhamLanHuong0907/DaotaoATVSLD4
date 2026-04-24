import type {
  ExamType, ExamMode, QuestionType, DifficultyLevel, ApprovalStatus,
  ResultClassification, TrainingGroup, ExamPeriodStatus, ExamRoomStatus, UserRole,
} from '@/types/enums';

export const examTypeLabels: Record<ExamType, string> = {
  skill_upgrade: 'Thi nâng bậc thợ',
  periodic_atvsld: 'Thi ATVSLĐ định kỳ',
  safety_hygiene: 'Thi an toàn vệ sinh viên',
  legal_knowledge: 'Thi văn bản pháp luật',
};

export const examModeLabels: Record<ExamMode, string> = {
  online: 'Trực tuyến',
  onsite: 'Trực tiếp',
};

export const questionTypeLabels: Record<QuestionType, string> = {
  multiple_choice: 'Trắc nghiệm',
  true_false: 'Đúng / Sai',
  scenario_based: 'Tình huống',
};

export const difficultyLabels: Record<DifficultyLevel, string> = {
  easy: 'Dễ',
  medium: 'Trung bình',
  hard: 'Khó',
};

export const approvalStatusLabels: Record<ApprovalStatus, string> = {
  draft: 'Nháp',
  pending_review: 'Chờ duyệt',
  approved: 'Đã duyệt',
  rejected: 'Từ chối',
};

export const classificationLabels: Record<ResultClassification, string> = {
  excellent: 'Giỏi',
  good: 'Khá',
  average: 'Trung bình',
  fail: 'Không đạt',
};

export const trainingGroupLabels: Record<TrainingGroup, string> = {
  atvsld: 'An toàn vệ sinh lao động',
  skill_upgrade: 'Nâng bậc thợ',
  safety_hygiene: 'An toàn vệ sinh viên',
  legal_knowledge: 'Văn bản pháp luật',
};

export const examPeriodStatusLabels: Record<ExamPeriodStatus, string> = {
  draft: 'Nháp',
  scheduled: 'Đã lên lịch',
  in_progress: 'Đang diễn ra',
  finished: 'Đã kết thúc',
  cancelled: 'Đã huỷ',
};

export const examRoomStatusLabels: Record<ExamRoomStatus, string> = {
  scheduled: 'Đã lên lịch',
  in_progress: 'Đang diễn ra',
  finished: 'Đã kết thúc',
  cancelled: 'Đã huỷ',
};

export const userRoleLabels: Record<UserRole, string> = {
  admin: 'Quản trị viên',
  training_officer: 'Cán bộ đào tạo',
  manager: 'Cán bộ quản lý',
  worker: 'Người lao động',
};
