import React from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AdminRoute, MasterRoute } from './RouteGuards';
import { User, Course } from '@/domain/entities';
import { AdminService } from '@/services/AdminService';

// Lazy Loaded Components
const StudentDashboard = React.lazy(() => import('@/components/features/dashboard/StudentDashboard'));
const UserManagement = React.lazy(() => import('@/components/features/admin/UserManagement'));
const AdminContentManagement = React.lazy(() => import('@/components/AdminContentManagementWithAvailability'));
const FileManagement = React.lazy(() => import('@/components/FileManagement'));
const AdminSettingsPage = React.lazy(() => import('@/components/features/admin/AdminSettingsPage').then(module => ({ default: module.AdminSettingsPage })));
const AdminCourseAccessPage = React.lazy(() => import('@/components/AdminCourseAccessPage'));
const InstructorInteractionCenter = React.lazy(() => import('@/components/features/instructor/InstructorInteractionCenter'));
const UserProfilePage = React.lazy(() => import('@/components/features/user/UserProfilePage'));
const AchievementsPage = React.lazy(() => import('@/components/AchievementsPage'));
const AuditPage = React.lazy(() => import('@/components/features/admin/AuditPage'));
const StudentActivityDashboard = React.lazy(() => import('@/components/features/admin/StudentActivityDashboard'));
const BuddyFullPage = React.lazy(() => import('@/components/BuddyFullPage'));
const LessonContentEditorWrapper = React.lazy(() => import('@/src/components/features/admin/editor/LessonContentEditorWrapper'));
const LessonLoader = React.lazy(() => import('@/components/LessonLoader'));
const CourseLayout = React.lazy(() => import('@/components/CourseLayout'));
const CourseOverview = React.lazy(() => import('@/components/CourseOverview'));
const QuestionnaireManagementPage = React.lazy(() => import('@/components/QuestionnaireManagementPage'));
const SystemHealth = React.lazy(() => import('@/components/SystemHealth').then(module => ({ default: module.SystemHealth })));
const DropboxCallbackPage = React.lazy(() => import('@/components/DropboxCallbackPage'));

interface AppRoutesProps {
  user: User;
  adminService: AdminService;
  authService: any;
  refreshSession: () => Promise<void>;
  
  // Data & State
  availableCourses: Course[];
  enrolledCourses: Course[];
  adminCourses: Course[];
  activeCourse: Course | null;
  activeModule: any;
  isLoadingCourses: boolean;
  
  // Handlers
  handleEnrollRequest: (courseId: string) => void;
  handleTrackAction: (action: string, path?: string) => void;
  setIsMobileMenuOpen: (open: boolean) => void;
  selectModule: (id: string) => void;
  setForumLesson: (l: any) => void;
  setMaterialsLesson: (l: any) => void;
}

const AppRoutes: React.FC<AppRoutesProps> = ({
  user,
  adminService,
  authService,
  refreshSession,
  availableCourses,
  enrolledCourses,
  adminCourses,
  activeCourse,
  activeModule,
  isLoadingCourses,
  handleEnrollRequest,
  handleTrackAction,
  setIsMobileMenuOpen,
  selectModule,
  setForumLesson,
  setMaterialsLesson
}) => {
  const navigate = useNavigate();

  return (
    <Routes>
      {/* Dashboard Routes */}
      <Route path="/" element={
        <StudentDashboard
          user={user}
          courses={user.hasAdminPanelAccess ? adminCourses : availableCourses}
          onCourseClick={handleEnrollRequest}
          showEnrollButton={true}
          enrolledCourseIds={enrolledCourses.map(c => c.id)}
          sectionTitle="Cursos da Plataforma"
          showDashboardAnalytics={true}
          onManageCourse={user.hasAdminPanelAccess ? (id: string) => navigate(`/admin/content`, { state: { courseId: id } }) : undefined}
          onManageContent={user.hasAdminPanelAccess ? () => navigate('/admin/content') : undefined}
          isLoading={isLoadingCourses}
        />
      } />
      <Route path="/dashboard" element={<Navigate to="/" replace />} />

      <Route path="/courses" element={
        <StudentDashboard
          user={user}
          courses={enrolledCourses}
          onCourseClick={(id: string) => navigate(`/course/${id}`)}
          showEnrollButton={false}
          sectionTitle="Meus Cursos"
          showDashboardAnalytics={false}
          enrolledCourseIds={enrolledCourses.map(c => c.id)}
          onManageCourse={user.hasAdminPanelAccess ? (id: string) => navigate(`/admin/content`, { state: { courseId: id } }) : undefined}
          onManageContent={user.hasAdminPanelAccess ? () => navigate('/admin/content') : undefined}
          isLoading={isLoadingCourses}
        />
      } />

      {/* Feature Routes */}
      <Route path="/profile" element={<UserProfilePage user={user} authService={authService} onUpdate={refreshSession} />} />
      <Route path="/achievements" element={<AchievementsPage user={user} course={activeCourse} adminService={adminService} />} />
      <Route path="/buddy" element={<BuddyFullPage />} />
      <Route path="/audit" element={
        <AdminRoute>
          <AuditPage />
        </AdminRoute>
      } />

      {/* Course Routes */}
      <Route path="/course/:courseId" element={<CourseLayout />}>
        <Route index element={
           <CourseOverview
            user={user}
            activeCourse={activeCourse}
            onSelectModule={(m: any) => selectModule(m.id)}
            onSelectLesson={(l: any, tab?: string) => navigate(`/course/${activeCourse?.id}/lesson/${l.id}${tab ? `?tab=${tab}` : ''}`)}
            onOpenForum={(l: any) => setForumLesson(l)}
            onOpenMaterials={(l: any) => setMaterialsLesson(l)}
          />
        } />
        <Route path="lesson/:lessonId" element={
          <LessonLoader user={user} onTrackAction={handleTrackAction} onToggleSidebar={() => setIsMobileMenuOpen(true)} />
        } />
      </Route>

      {/* Admin Routes */}
      <Route path="/admin/content" element={
        <AdminRoute>
          <AdminContentManagement
            adminService={adminService}
            user={user}
            initialCourseId={undefined}
            onOpenContentEditor={(lesson: any) => navigate(`/admin/lesson/${lesson.id}/edit`)}
          />
        </AdminRoute>
      } />
      <Route path="/admin/lesson/:lessonId/edit" element={<AdminRoute><LessonContentEditorWrapper adminService={adminService} /></AdminRoute>} />
      <Route path="/admin/users" element={<MasterRoute><UserManagement adminService={adminService} /></MasterRoute>} />
      <Route path="/admin/access" element={<MasterRoute><AdminCourseAccessPage adminService={adminService} /></MasterRoute>} />
      <Route path="/admin/student-activity" element={
        <AdminRoute>
          <StudentActivityDashboard adminService={adminService} courses={adminCourses} />
        </AdminRoute>
      } />
      <Route path="/admin/questionnaire" element={<AdminRoute><QuestionnaireManagementPage adminService={adminService} /></AdminRoute>} />
      <Route path="/admin/files" element={<AdminRoute><FileManagement /></AdminRoute>} />
      <Route path="/admin/health" element={<AdminRoute><SystemHealth adminService={adminService} /></AdminRoute>} />
      <Route path="/admin/settings" element={<AdminRoute><AdminSettingsPage adminService={adminService} /></AdminRoute>} />
      <Route path="/instructor/interact" element={<AdminRoute><InstructorInteractionCenter /></AdminRoute>} />
      <Route path="/admin/login" element={<Navigate to="/admin/questionnaire" replace />} />
      <Route path="/oauth/dropbox" element={<DropboxCallbackPage />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;
