import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import AppLayout from '@/components/layout/AppLayout';
import RequireRole from '@/components/common/RequireRole';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types/enums';

const LoginPage = lazy(() => import('@/pages/LoginPage'));
const DashboardPage = lazy(() => import('@/pages/DashboardPage'));

const ExamListPage = lazy(() => import('@/pages/exams/ExamListPage'));
const ExamTakePage = lazy(() => import('@/pages/exams/ExamTakePage'));
const ExamResultPage = lazy(() => import('@/pages/exams/ExamResultPage'));
const ExamHistoryPage = lazy(() => import('@/pages/exams/ExamHistoryPage'));
const OfficialExamListPage = lazy(() => import('@/pages/exams/OfficialExamListPage'));
const StudyPage = lazy(() => import('@/pages/study/StudyPage'));

const TemplateListPage = lazy(() => import('@/pages/admin/templates/TemplateListPage'));
const TemplateCreatePage = lazy(() => import('@/pages/admin/templates/TemplateCreatePage'));
const TemplateEditPage = lazy(() => import('@/pages/admin/templates/TemplateEditPage'));
const TemplateDetailPage = lazy(() => import('@/pages/admin/templates/TemplateDetailPage'));

const AdminExamListPage = lazy(() => import('@/pages/admin/exams/AdminExamListPage'));
const ExamDetailPage = lazy(() => import('@/pages/admin/exams/ExamDetailPage'));
const ExamGeneratePage = lazy(() => import('@/pages/admin/exams/ExamGeneratePage'));
const ExamSubmissionsPage = lazy(() => import('@/pages/admin/exams/ExamSubmissionsPage'));

const DocumentListPage = lazy(() => import('@/pages/admin/documents/DocumentListPage'));
const DocumentDetailPage = lazy(() => import('@/pages/admin/documents/DocumentDetailPage'));
const CourseListPage = lazy(() => import('@/pages/admin/courses/CourseListPage'));
const CourseDetailPage = lazy(() => import('@/pages/admin/courses/CourseDetailPage'));
const CourseDetailEditPage = lazy(() => import('@/pages/admin/courses/CourseDetailEditPage'));
const QuestionListPage = lazy(() => import('@/pages/admin/questions/QuestionListPage'));
const QuestionDetailPage = lazy(() => import('@/pages/admin/questions/QuestionDetailPage'));
const UserListPage = lazy(() => import('@/pages/admin/users/UserListPage'));
const StatisticsPage = lazy(() => import('@/pages/admin/reports/StatisticsPage'));

const PeriodListPage = lazy(() => import('@/pages/admin/periods/PeriodListPage'));
const PeriodFormPage = lazy(() => import('@/pages/admin/periods/PeriodFormPage'));
const RoomListPage = lazy(() => import('@/pages/admin/rooms/RoomListPage'));
const RoomFormPage = lazy(() => import('@/pages/admin/rooms/RoomFormPage'));
const RoomDetailPage = lazy(() => import('@/pages/admin/rooms/RoomDetailPage'));

const MySchedulePage = lazy(() => import('@/pages/exams/MySchedulePage'));
const MyCoursesPage = lazy(() => import('@/pages/study/MyCoursesPage'));
const CertificatesPage = lazy(() => import('@/pages/CertificatesPage'));
const AuditLogPage = lazy(() => import('@/pages/admin/audit/AuditLogPage'));
const SettingsPage = lazy(() => import('@/pages/admin/settings/SettingsPage'));
const ProfilePage = lazy(() => import('@/pages/ProfilePage'));
const MyDocumentsPage = lazy(() => import('@/pages/study/MyDocumentsPage'));
const CourseStudyPage = lazy(() => import('@/pages/study/CourseStudyPage'));
const PracticePage = lazy(() => import('@/pages/study/PracticePage'));
const ApprovalInboxPage = lazy(() => import('@/pages/admin/approvals/ApprovalInboxPage'));
const AITutorPage = lazy(() => import('@/pages/AITutorPage'));
const AchievementsPage = lazy(() => import('@/pages/AchievementsPage'));
const ForumListPage = lazy(() => import('@/pages/forum/ForumListPage'));
const ForumTopicPage = lazy(() => import('@/pages/forum/ForumTopicPage'));
const FacilityListPage = lazy(() => import('@/pages/admin/facilities/FacilityListPage'));
const WebhookListPage = lazy(() => import('@/pages/admin/webhooks/WebhookListPage'));
const DepartmentListPage = lazy(() => import('@/pages/admin/departments/DepartmentListPage'));
const CatalogsPage = lazy(() => import('@/pages/admin/catalogs/CatalogsPage'));

const STAFF_ROLES = [UserRole.ADMIN, UserRole.TRAINING_OFFICER];
const ADMIN_ROLES = [UserRole.ADMIN];

function LoadingFallback() {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
      <CircularProgress />
    </Box>
  );
}

export default function AppRouter() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <LoginPage />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        <Route element={<AppLayout />}>
          {/* Dashboard */}
          <Route path="/dashboard" element={<DashboardPage />} />

          {/* Worker - Exams */}
          <Route path="/exams" element={<ExamListPage />} />
          <Route path="/official_exams" element={<OfficialExamListPage />} />
          <Route path="/exams/schedule" element={<MySchedulePage />} />
          <Route path="/exams/history" element={<ExamHistoryPage />} />
          <Route path="/official_exams/history" element={<ExamHistoryPage kind="official" />} />
          <Route path="/practice/history" element={<ExamHistoryPage kind="trial" />} />
          <Route path="/exams/results/:submissionId" element={<ExamResultPage />} />

          {/* Worker - Study */}
          <Route path="/study" element={<StudyPage />} />
          <Route path="/my-courses" element={<MyCoursesPage />} />
          <Route path="/study/courses/:courseId" element={<CourseStudyPage />} />
          <Route path="/practice" element={<PracticePage />} />
          <Route path="/ai-tutor" element={<AITutorPage />} />
          <Route path="/achievements" element={<AchievementsPage />} />
          <Route path="/forum" element={<ForumListPage />} />
          <Route path="/forum/:topicId" element={<ForumTopicPage />} />
          <Route path="/my-documents" element={<MyDocumentsPage />} />

          {/* Certificates */}
          <Route path="/certificates" element={<CertificatesPage />} />

          {/* Profile (any logged in user) */}
          <Route path="/profile" element={<ProfilePage />} />

          {/* Admin - Templates */}
          <Route path="/admin/templates" element={<RequireRole roles={STAFF_ROLES}><TemplateListPage /></RequireRole>} />
          <Route path="/admin/templates/create" element={<RequireRole roles={STAFF_ROLES}><TemplateCreatePage /></RequireRole>} />
          <Route path="/admin/templates/:templateId" element={<RequireRole roles={STAFF_ROLES}><TemplateDetailPage /></RequireRole>} />
          <Route path="/admin/templates/:templateId/edit" element={<RequireRole roles={STAFF_ROLES}><TemplateEditPage /></RequireRole>} />

          {/* Admin - Exams */}
          <Route path="/admin/exams" element={<RequireRole roles={STAFF_ROLES}><AdminExamListPage /></RequireRole>} />
          <Route path="/admin/exams/generate" element={<RequireRole roles={STAFF_ROLES}><ExamGeneratePage /></RequireRole>} />
          <Route path="/admin/exams/:examId" element={<RequireRole roles={STAFF_ROLES}><ExamDetailPage /></RequireRole>} />
          <Route path="/admin/exams/:examId/submissions" element={<RequireRole roles={STAFF_ROLES}><ExamSubmissionsPage /></RequireRole>} />

          {/* Admin - Exam Periods (kỳ thi) */}
          <Route path="/admin/periods" element={<RequireRole roles={STAFF_ROLES}><PeriodListPage /></RequireRole>} />
          <Route path="/admin/periods/create" element={<RequireRole roles={STAFF_ROLES}><PeriodFormPage /></RequireRole>} />
          <Route path="/admin/periods/:periodId/edit" element={<RequireRole roles={STAFF_ROLES}><PeriodFormPage /></RequireRole>} />

          {/* Admin - Exam Rooms (phòng thi) */}
          <Route path="/admin/rooms" element={<RequireRole roles={STAFF_ROLES}><RoomListPage /></RequireRole>} />
          <Route path="/admin/rooms/create" element={<RequireRole roles={STAFF_ROLES}><RoomFormPage /></RequireRole>} />
          <Route path="/admin/rooms/:roomId" element={<RequireRole roles={STAFF_ROLES}><RoomDetailPage /></RequireRole>} />
          <Route path="/admin/rooms/:roomId/edit" element={<RequireRole roles={STAFF_ROLES}><RoomFormPage /></RequireRole>} />

          {/* Admin - Content */}
          <Route path="/admin/documents" element={<RequireRole roles={STAFF_ROLES}><DocumentListPage /></RequireRole>} />
          <Route path="/admin/documents/:docId" element={<RequireRole roles={STAFF_ROLES}><DocumentDetailPage /></RequireRole>} />
          <Route path="/admin/courses" element={<RequireRole roles={STAFF_ROLES}><CourseListPage /></RequireRole>} />
          <Route path="/admin/courses/:courseId" element={<RequireRole roles={STAFF_ROLES}><CourseDetailPage /></RequireRole>} />
          <Route path="/admin/courses/:courseId/edit" element={<RequireRole roles={STAFF_ROLES}><CourseDetailEditPage /></RequireRole>} />
          <Route path="/admin/questions" element={<RequireRole roles={STAFF_ROLES}><QuestionListPage /></RequireRole>} />
          <Route path="/admin/questions/:questionId" element={<RequireRole roles={STAFF_ROLES}><QuestionDetailPage /></RequireRole>} />

          {/* Admin - System (admin only) */}
          <Route path="/admin/users" element={<RequireRole roles={ADMIN_ROLES}><UserListPage /></RequireRole>} />
          <Route path="/admin/departments" element={<RequireRole roles={ADMIN_ROLES}><DepartmentListPage /></RequireRole>} />
          <Route path="/admin/catalogs" element={<RequireRole roles={STAFF_ROLES}><CatalogsPage /></RequireRole>} />
          <Route path="/admin/approvals" element={<RequireRole roles={STAFF_ROLES}><ApprovalInboxPage /></RequireRole>} />
          <Route path="/admin/facilities" element={<RequireRole roles={STAFF_ROLES}><FacilityListPage /></RequireRole>} />
          <Route path="/admin/webhooks" element={<RequireRole roles={ADMIN_ROLES}><WebhookListPage /></RequireRole>} />
          <Route path="/admin/audit-logs" element={<RequireRole roles={ADMIN_ROLES}><AuditLogPage /></RequireRole>} />
          <Route path="/admin/settings" element={<RequireRole roles={ADMIN_ROLES}><SettingsPage /></RequireRole>} />
          <Route path="/admin/reports" element={<RequireRole roles={STAFF_ROLES}><StatisticsPage /></RequireRole>} />

          {/* Default */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>

        {/* Exam take page - no sidebar layout */}
        <Route path="/exams/:examId/take" element={<ExamTakePage />} />
      </Routes>
    </Suspense>
  );
}
