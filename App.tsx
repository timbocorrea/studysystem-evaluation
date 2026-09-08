import React, { useEffect, useState, startTransition, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Toaster, toast } from 'sonner';

// Contexts & Services
import { useAuth } from './contexts/AuthContext';
import { useCourse } from './contexts/CourseContext';
import { useTheme } from './contexts/ThemeContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { adminService as sharedAdminService } from './services/Dependencies';

// Hooks
import { useActivityTracker } from './hooks/useActivityTracker';
import { useIdleTimeout } from './hooks/useIdleTimeout';
import { selectInstructorAdminCourses } from './utils/instructorAdminCourses';

// Components & Modules
import { ModernLoader } from './components/ModernLoader';
import { AnimatedThemeToggler } from './components/ui/animated-theme-toggler';
import NotificationBell from './components/ui/NotificationBell';
import BuddyAiStatusIndicator from './components/ui/BuddyAiStatusIndicator';
import MainLayout from '@/src/components/layouts/MainLayout';
import AppRoutes from '@/src/routes/AppRoutes';

// Lazy Loaded Auth Components
const AuthForm = React.lazy(() => import('./components/AuthForm'));
const AdminAuthForm = React.lazy(() => import('./components/AdminAuthForm'));
const PendingApprovalScreen = React.lazy(() => import('./components/PendingApprovalScreen'));
const ForcePasswordChangeModal = React.lazy(() => import('./components/ForcePasswordChangeModal'));
const DropboxCallbackPage = React.lazy(() => import('./components/DropboxCallbackPage'));

const App: React.FC = () => {
  const { user, session, isLoading: authLoading, logout, authService, refreshSession } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const adminService = sharedAdminService;
  const location = useLocation();
  const navigate = useNavigate();

  const {
    availableCourses,
    enrolledCourses,
    activeCourse,
    activeModule,
    activeLesson,
    selectCourse,
    enrollInCourse,
    selectLesson,
    selectModule,
    isLoadingCourses
  } = useCourse();

  // Global State
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedCourseForEnrollment, setSelectedCourseForEnrollment] = useState<string | null>(null);
  const [isEnrollmentModalOpen, setIsEnrollmentModalOpen] = useState(false);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [adminCourses, setAdminCourses] = useState<any[]>([]);
  const [isAdminCoursesLoading, setIsAdminCoursesLoading] = useState(false);
  const [forumLesson, setForumLesson] = useState<{ id: string, title: string } | null>(null);
  const [materialsLesson, setMaterialsLesson] = useState<{ id: string, title: string } | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showOfflineModal, setShowOfflineModal] = useState(false);

  // Start Audit Tracker
  useActivityTracker(activeLesson?.title);

  // Idle Timeout Implementation
  const handleIdleTimeout = useCallback(async () => {
    console.log('💤 Timer atingido, mas o auto-logout foi desabilitado.');
  }, []);

  const timeoutDuration = 24 * 60 * 60 * 1000;
  useIdleTimeout({
    onIdle: handleIdleTimeout,
    timeout: timeoutDuration,
    onRefreshSession: refreshSession
  });

  // Fullscreen Management
  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  };

  // Network Connection Monitoring
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowOfflineModal(false);
      toast.success('✅ Conexão com a internet restaurada!');
    };
    const handleOffline = () => {
      setIsOnline(false);
      setShowOfflineModal(true);
      toast.error('❌ Conexão com a internet perdida!');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    if (!navigator.onLine) {
      setIsOnline(false);
      setShowOfflineModal(true);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load Admin Courses
  useEffect(() => {
    let active = true;

    if (user?.hasAdminPanelAccess) {
      setIsAdminCoursesLoading(true);

      const loadAdminCourses = async () => {
        const outlineCourses = await adminService.listCoursesOutline();
        if (user.role !== 'INSTRUCTOR') return outlineCourses;

        const [assignedLessonIds, activeEnrollmentCourseIds, userCourseAssignmentIds] = await Promise.all([
          adminService.listInstructorLessonAssignments(user.id).catch(() => {
            console.warn('Failed to load instructor lesson assignments');
            return [];
          }),
          adminService.listActiveCourseEnrollmentIds(user.id).catch(() => {
            console.warn('Failed to load active instructor course enrollments');
            return [];
          }),
          adminService.listUserCourseAssignmentIds(user.id).catch(() => {
            console.warn('Failed to load instructor course assignments');
            return [];
          })
        ]);

        // Keep management visibility aligned with canEditLesson.
        return selectInstructorAdminCourses(
          outlineCourses,
          enrolledCourses,
          user.id,
          {
            assignedLessonIds,
            activeEnrollmentCourseIds,
            userCourseAssignmentIds
          }
        );
      };

      loadAdminCourses()
        .then(courses => {
          if (active) setAdminCourses(courses);
        })
        .catch(err => console.error("Failed to load admin courses", err))
        .finally(() => {
          if (active) setIsAdminCoursesLoading(false);
        });
    } else {
      setAdminCourses([]);
    }

    return () => {
      active = false;
    };
  }, [user, adminService, enrolledCourses]);

  // Handlers
  const handleViewChange = (view: string) => {
    setIsMobileMenuOpen(false);
    startTransition(() => {
      const routes: Record<string, string> = {
        dashboard: '/', courses: '/courses', achievements: '/achievements',
        history: '/history', audit: '/audit', buddy: '/buddy',
        content: '/admin/content', users: '/admin/users', files: '/admin/files',
        'system-health': '/admin/health', access: '/admin/access',
        'student-activity': '/admin/student-activity',
        questionnaire: '/admin/questionnaire', settings: '/admin/settings'
      };
      navigate(routes[view] || '/');
    });
  };

  const handleEnrollRequest = (courseId: string) => {
    if (enrolledCourses.some(c => c.id === courseId)) {
      navigate(`/course/${courseId}`);
    } else {
      setSelectedCourseForEnrollment(courseId);
      setIsEnrollmentModalOpen(true);
    }
  };

  const handleTrackAction = (action: string, path?: string) => {
    if (user) {
      const payload = { text: action, path: path || location.pathname };
      adminService.logActivity(user.id, 'INTERACTION', JSON.stringify(payload));
    }
  };

  const verifyEnrollmentAndNavigate = (courseId: string, moduleId?: string, lessonId?: string) => {
    if (!enrolledCourses.some(c => c.id === courseId)) {
      alert("Você precisa se inscrever neste curso para acessar o conteúdo.");
      return;
    }
    navigate(lessonId && moduleId ? `/course/${courseId}/lesson/${lessonId}` : `/course/${courseId}`);
  };

  const traverseToAdminEditor = (courseId: string, moduleId?: string, lessonId?: string) => {
    if (lessonId) navigate(`/admin/lesson/${lessonId}/edit`);
    else navigate('/admin/content', { state: { courseId, moduleId } });
  };

  // Breadcrumb & View Helpers
  const getActiveView = () => {
    const path = location.pathname;
    const directMatches: Record<string, string> = {
      '/': 'dashboard', '/dashboard': 'dashboard', '/courses': 'courses',
      '/achievements': 'achievements', '/history': 'history', '/audit': 'audit',
      '/buddy': 'buddy', '/admin/content': 'content', '/admin/users': 'users',
      '/admin/files': 'files', '/admin/health': 'system-health', '/admin/access': 'access',
      '/admin/student-activity': 'student-activity',
      '/admin/questionnaire': 'questionnaire', '/admin/settings': 'settings'
    };
    if (directMatches[path]) return directMatches[path];
    if (path.match(/\/admin\/lesson\/[^/]+\/edit/)) return 'content';
    if (path.startsWith('/course/')) return 'lesson';
    return 'dashboard';
  };

  const getBreadcrumbItems = () => {
    const items: Array<{ label: string; icon?: string; onClick?: () => void | Promise<void> }> = [
      { label: 'Painel', icon: 'fas fa-home', onClick: () => navigate('/') }
    ];
    if (getActiveView() === 'lesson' && activeCourse) {
      items.push({ label: activeCourse.title, icon: 'fas fa-graduation-cap', onClick: () => navigate(`/course/${activeCourse.id}`) });
      if (activeModule) {
        items.push({ label: activeModule.title, icon: 'fas fa-layer-group' });
        if (activeLesson) items.push({ label: activeLesson.title, icon: 'fas fa-play-circle' });
      }
    }
    return items;
  };

  const topbarActions = (
    <div className="flex items-center gap-0.5 sm:gap-1">
      <NotificationBell />
      <BuddyAiStatusIndicator user={user} isLoading={authLoading} />
      <button onClick={toggleFullscreen} className="hidden sm:flex w-10 h-10 items-center justify-center text-slate-500 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">
        <i className={`fas ${isFullscreen ? 'fa-compress' : 'fa-expand'}`}></i>
      </button>
      <button onClick={() => setIsSupportOpen(true)} className="hidden sm:flex w-10 h-10 items-center justify-center text-slate-500 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">
        <i className="fas fa-headset"></i>
      </button>
      <button onClick={() => navigate('/profile')} className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 overflow-hidden">
        {user?.avatarUrl ? <img src={user.avatarUrl} alt={user.name} className="w-6 h-6 sm:w-7 sm:h-7 rounded-full object-cover" /> : <i className="fas fa-user text-xs text-slate-500"></i>}
      </button>
      <AnimatedThemeToggler onClick={toggleTheme} className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors" />
      <button onClick={logout} className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
        <i className="fas fa-sign-out-alt"></i>
      </button>
    </div>
  );

  // Render Logic
  if (authLoading) return (
    <div className="flex h-screen overflow-hidden bg-[#050810] items-center justify-center">
      <Toaster theme="dark" richColors position="top-center" />
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
        <p className="text-slate-500 font-medium text-sm animate-pulse">Carregando StudySystem...</p>
      </div>
    </div>
  );

  if (location.pathname === '/oauth/dropbox') return <React.Suspense fallback={<ModernLoader />}><DropboxCallbackPage /></React.Suspense>;

  if (!session || !user) {
    const isAdminLogin = location.pathname === '/admin/login';
    return (
      <React.Suspense fallback={<ModernLoader message="Carregando Login..." />}>
        {isAdminLogin ? <AdminAuthForm authService={authService} onSuccess={refreshSession} /> : <AuthForm authService={authService} onSuccess={refreshSession} />}
      </React.Suspense>
    );
  }

  if (user.isPending()) return <React.Suspense fallback={<ModernLoader />}><PendingApprovalScreen userEmail={user.email} onLogout={logout} /></React.Suspense>;
  if (user.isRejected()) { logout(); return null; }
  if (user.isTempPassword) return <><Toaster theme="dark" richColors position="top-center" /><React.Suspense fallback={<ModernLoader />}><ForcePasswordChangeModal authService={authService} onSuccess={refreshSession} /></React.Suspense></>;

  return (
    <NotificationProvider>
      <MainLayout
        user={user} session={session} logout={logout} adminService={adminService}
        activeView={getActiveView()} isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen}
        isSupportOpen={isSupportOpen} setIsSupportOpen={setIsSupportOpen}
        isFullscreen={isFullscreen} toggleFullscreen={toggleFullscreen}
        isOnline={isOnline} showOfflineModal={showOfflineModal} setShowOfflineModal={setShowOfflineModal}
        enrolledCourses={enrolledCourses} availableCourses={availableCourses} adminCourses={adminCourses}
        activeCourse={activeCourse} activeLesson={activeLesson} activeModule={activeModule}
        isLoadingCourses={isLoadingCourses} isAdminCoursesLoading={isAdminCoursesLoading}
        forumLesson={forumLesson} setForumLesson={setForumLesson}
        materialsLesson={materialsLesson} setMaterialsLesson={setMaterialsLesson}
        selectedCourseForEnrollment={selectedCourseForEnrollment} setSelectedCourseForEnrollment={setSelectedCourseForEnrollment}
        isEnrollmentModalOpen={isEnrollmentModalOpen} setIsEnrollmentModalOpen={setIsEnrollmentModalOpen}
        isEnrolling={isEnrolling} handleViewChange={handleViewChange}
        enrollInCourse={enrollInCourse} selectCourse={selectCourse}
        traverseToAdminEditor={traverseToAdminEditor} verifyEnrollmentAndNavigate={verifyEnrollmentAndNavigate}
        topbarActions={topbarActions} breadcrumbItems={getBreadcrumbItems()}
      >
        <AppRoutes
          user={user} adminService={adminService} authService={authService} refreshSession={refreshSession}
          availableCourses={availableCourses} enrolledCourses={enrolledCourses} adminCourses={adminCourses}
          activeCourse={activeCourse} activeModule={activeModule} isLoadingCourses={isLoadingCourses}
          handleEnrollRequest={handleEnrollRequest} handleTrackAction={handleTrackAction}
          setIsMobileMenuOpen={setIsMobileMenuOpen} selectModule={selectModule}
          setForumLesson={setForumLesson} setMaterialsLesson={setMaterialsLesson}
        />
      </MainLayout>
    </NotificationProvider>
  );
};

export default App;
