import React from 'react';
import { Toaster } from 'sonner';
import { useLocation, useNavigate } from 'react-router-dom';
import { ModernLoader } from '@/components/ModernLoader';
import Sidebar from '@/components/Sidebar';
import Breadcrumb from '@/components/Breadcrumb';
import LessonForumModal from '@/components/features/classroom/LessonForumModal';
import LessonMaterialsModal from '@/components/features/classroom/LessonMaterialsModal';
import GeminiBuddy from '@/components/GeminiBuddy';
import { SupportDialog } from '@/components/SupportDialog';
import CourseEnrollmentModal from '@/components/CourseEnrollmentModal';
import { User, Course, Lesson } from '@/domain/entities';
import { AdminService } from '@/services/AdminService';
import GamificationOverlayManager from '@/components/features/gamification/GamificationOverlayManager';

interface MainLayoutProps {
  children: React.ReactNode;
  user: User;
  session: any;
  logout: () => void;
  adminService: AdminService;
  
  // State from App
  activeView: string;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
  isSupportOpen: boolean;
  setIsSupportOpen: (open: boolean) => void;
  isFullscreen: boolean;
  toggleFullscreen: () => void;
  isOnline: boolean;
  showOfflineModal: boolean;
  setShowOfflineModal: (show: boolean) => void;
  
  // Data
  enrolledCourses: Course[];
  availableCourses: Course[];
  adminCourses: Course[];
  activeCourse: Course | null;
  activeLesson: Lesson | null;
  activeModule: any;
  isLoadingCourses: boolean;
  isAdminCoursesLoading: boolean;
  
  // Modals
  forumLesson: { id: string, title: string } | null;
  setForumLesson: (lesson: { id: string, title: string } | null) => void;
  materialsLesson: { id: string, title: string } | null;
  setMaterialsLesson: (lesson: { id: string, title: string } | null) => void;
  selectedCourseForEnrollment: string | null;
  setSelectedCourseForEnrollment: (id: string | null) => void;
  isEnrollmentModalOpen: boolean;
  setIsEnrollmentModalOpen: (open: boolean) => void;
  isEnrolling: boolean;
  
  // Handlers
  handleViewChange: (view: string) => void;
  enrollInCourse: (id: string) => Promise<void>;
  selectCourse: (id: string) => void;
  traverseToAdminEditor: (courseId: string, moduleId?: string, lessonId?: string) => void;
  verifyEnrollmentAndNavigate: (courseId: string, moduleId?: string, lessonId?: string) => void;
  topbarActions: React.ReactNode;
  breadcrumbItems: Array<{ label: string; icon?: string; onClick?: () => void | Promise<void> }>;
}

const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  user,
  session,
  logout,
  adminService,
  activeView,
  isMobileMenuOpen,
  setIsMobileMenuOpen,
  isSupportOpen,
  setIsSupportOpen,
  isFullscreen,
  toggleFullscreen,
  isOnline,
  showOfflineModal,
  setShowOfflineModal,
  enrolledCourses,
  availableCourses,
  adminCourses,
  activeCourse,
  activeLesson,
  isLoadingCourses,
  isAdminCoursesLoading,
  forumLesson,
  setForumLesson,
  materialsLesson,
  setMaterialsLesson,
  selectedCourseForEnrollment,
  setSelectedCourseForEnrollment,
  isEnrollmentModalOpen,
  setIsEnrollmentModalOpen,
  isEnrolling,
  handleViewChange,
  enrollInCourse,
  selectCourse,
  traverseToAdminEditor,
  verifyEnrollmentAndNavigate,
  topbarActions,
  breadcrumbItems
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const isLessonRoute = location.pathname.match(/\/course\/[^/]+\/lesson\//) !== null;
  const activeLessonId = activeLesson?.id;
  const isStudentMobileBottomNav = user.role === 'STUDENT';
  const showStudentMobileBottomNav = isStudentMobileBottomNav && isLessonRoute === false;

  const studentMobileNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'fas fa-th-large', activeViews: ['dashboard'] },
    { id: 'courses', label: 'Cursos', icon: 'fas fa-graduation-cap', activeViews: ['courses', 'lesson'] },
    { id: 'achievements', label: 'Conquistas', icon: 'fas fa-trophy', activeViews: ['achievements'] },
    { id: 'buddy', label: 'Buddy AI', icon: 'fas fa-robot', activeViews: ['buddy'] }
  ];

  const handleStudentMobileNavChange = (view: string) => {
    setIsMobileMenuOpen(false);
    handleViewChange(view);
  };

  return (
    <div className={`flex flex-col lg:flex-row lg:h-screen min-h-screen w-full bg-slate-100 dark:bg-[#050810] text-slate-800 dark:text-slate-100 font-sans selection:bg-indigo-500/30 relative overflow-hidden`}>
      {/* GLOBAL DYNAMIC BACKGROUND */}
      <div className="absolute inset-0 pointer-events-none z-0 hidden lg:block">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-500/5 rounded-full blur-[150px] mix-blend-screen animate-pulse-slow"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/5 rounded-full blur-[150px] mix-blend-screen animate-pulse-slow delay-1000"></div>
        <div className="absolute top-[40%] left-[30%] w-[30%] h-[30%] bg-teal-500/5 rounded-full blur-[120px] mix-blend-screen animate-pulse-slow delay-2000"></div>
        <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-[0.02]"></div>
      </div>

      <Toaster theme="dark" richColors position="top-center" />

      {/* Sidebar */}
      <React.Suspense fallback={<div className="w-[360px] h-full bg-slate-900/60 hidden lg:block" />}>
        <Sidebar
          session={session}
          activeView={activeView}
          onViewChange={handleViewChange}
          onLogout={logout}
          user={user}
          onNavigateFile={(path) => navigate('/admin/files', { state: { path } })}
          courses={enrolledCourses}
          adminCourses={adminCourses}
          onOpenContent={user.hasAdminPanelAccess ? traverseToAdminEditor : verifyEnrollmentAndNavigate}
          onSelectLesson={(courseId, modId, lessId) => navigate(`/course/${courseId}/lesson/${lessId}`)}
          isMobileOpen={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
          activeLessonId={activeLessonId}
          activeCourse={activeCourse}
          onExpandCourse={(courseId) => selectCourse(courseId)}
          isOnline={isOnline}
          isLoadingCourses={isLoadingCourses}
          isLoadingAdminCourses={isAdminCoursesLoading}
          isHiddenOnDesktop={isLessonRoute}
          onOpenForum={(l) => setForumLesson(l)}
          onOpenMaterials={(l) => setMaterialsLesson(l)}
        />
      </React.Suspense>

      {/* Overlay */}
      {isMobileMenuOpen && (
        <div className={`fixed inset-0 bg-slate-900/70 backdrop-blur-none z-[55] ${isLessonRoute ? '' : 'lg:hidden'} animate-in fade-in duration-150`} onClick={() => setIsMobileMenuOpen(false)} />
      )}

      <div className="flex-1 flex flex-col min-h-0 w-full overflow-hidden h-full relative">
        {/* TOPBAR GLOBAL (Desktop & Mobile Unified Logic) */}
        
        {/* Desktop Header: Visible on lg+ screens */}
        <header className="hidden lg:flex items-center justify-between px-8 py-3 bg-[#e2e8f0] dark:bg-[#0a0e14] border-b border-slate-200 dark:border-slate-800 z-[60] sticky top-0 backdrop-blur-md bg-opacity-90 dark:bg-opacity-90">
          <div className="flex-1 min-w-0">
            <Breadcrumb items={breadcrumbItems} />
          </div>
          <div className="flex items-center gap-4 ml-6">
            {topbarActions}
          </div>
        </header>

        {/* Mobile Header: Visible on <lg screens */}
        <header className="flex items-center justify-between px-4 py-3 bg-[#e2e8f0] dark:bg-[#0a0e14] border-b border-slate-200 dark:border-slate-800 lg:hidden sticky top-0 left-0 right-0 z-[60] bg-opacity-95 dark:bg-opacity-95">
          <div className="flex items-center gap-4">
            {!isStudentMobileBottomNav && (
              <button onClick={() => setIsMobileMenuOpen(true)} className="w-10 h-10 flex items-center justify-center text-slate-500 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <i className="fas fa-bars text-xl"></i>
              </button>
            )}
            <h1 className="font-black text-slate-800 dark:text-slate-100 text-[10px] uppercase tracking-tighter">StudySystem</h1>
          </div>
          <div className="flex items-center">
            {topbarActions}
          </div>
        </header>

        <main className={`flex-1 overflow-y-auto bg-slate-50/50 dark:bg-transparent lg:scroll-smooth relative ${showStudentMobileBottomNav ? 'pb-24 lg:pb-0' : ''}`}>
          <React.Suspense fallback={
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-100 dark:bg-[#0a0e14] lg:static lg:bg-transparent lg:z-auto lg:h-full">
              <ModernLoader message="Carregando..." />
            </div>
          }>
            {children}
          </React.Suspense>
        </main>

        {showStudentMobileBottomNav && (
          <nav className="fixed inset-x-0 bottom-0 z-[90] lg:hidden border-t border-slate-200/70 dark:border-white/10 bg-white dark:bg-[#0a0e14] shadow-[0_-6px_18px_rgba(15,23,42,0.18)] px-2 pt-2 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
            <div className="grid grid-cols-4 gap-1 max-w-md mx-auto">
              {studentMobileNavItems.map((item) => {
                const isActive = item.activeViews.includes(activeView);

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleStudentMobileNavChange(item.id)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`min-w-0 h-16 rounded-2xl flex flex-col items-center justify-center gap-1 transition-colors ${isActive
                      ? 'bg-gradient-to-r from-indigo-600 to-teal-600 text-white shadow-sm shadow-indigo-500/20'
                      : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-800 dark:hover:text-white'
                      }`}
                  >
                    <i className={`${item.icon} text-[17px]`}></i>
                    <span className="text-[10px] font-black leading-none tracking-tight truncate max-w-full px-1">
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </nav>
        )}
      </div>

      {/* Modals & Helpers */}
      {selectedCourseForEnrollment && (
        <CourseEnrollmentModal
          course={availableCourses.find(c => c.id === selectedCourseForEnrollment)!}
          isOpen={isEnrollmentModalOpen}
          onClose={() => { setIsEnrollmentModalOpen(false); setSelectedCourseForEnrollment(null); }}
          isLoading={isEnrolling}
          onConfirm={async () => {
            await enrollInCourse(selectedCourseForEnrollment);
            setSelectedCourseForEnrollment(null);
          }}
        />
      )}

      <React.Suspense fallback={null}>
        <GeminiBuddy
          userName={user.name}
          systemContext="Você está no StudySystem v2 com Rotas."
          currentContext={activeLesson?.content || activeLesson?.contentBlocks?.map(b => b.text).join('\n\n') || ''}
        />
      </React.Suspense>

      {showOfflineModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[150] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-[#0a0e14]/90 backdrop-blur-xl rounded-2xl shadow-2xl shadow-red-900/20 w-full max-w-md overflow-hidden border border-red-500/50 animate-in zoom-in-95 duration-300">
            <div className="bg-gradient-to-r from-red-600/20 to-orange-600/20 p-6 text-center border-b border-red-500/20 relative overflow-hidden">
              <div className="absolute inset-0 bg-red-500/5 backdrop-blur-[2px]"></div>
              <div className="relative z-10 text-center">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-red-500 to-orange-600 p-[1px] shadow-lg shadow-red-500/30">
                  <div className="w-full h-full rounded-full bg-[#0a0e14] flex items-center justify-center">
                    <i className="fas fa-wifi-slash text-4xl text-red-500 animate-pulse"></i>
                  </div>
                </div>
                <h2 className="text-2xl font-black text-white mb-2 drop-shadow-lg">Conexão Perdida</h2>
                <p className="text-sm text-slate-300 font-medium">Sem acesso à internet</p>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-start gap-3 p-4 bg-red-500/10 rounded-xl border border-red-500/20">
                <i className="fas fa-exclamation-triangle text-red-500 text-xl mt-1"></i>
                <div>
                  <h3 className="font-bold text-white mb-1 leading-tight">Não é possível acessar o sistema</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">Você perdeu a conexão com a internet. Suas alterações não serão salvas até que a conexão seja restaurada.</p>
                </div>
              </div>
              <div className="p-4 bg-white/5 border-t border-white/5">
                <button onClick={() => setShowOfflineModal(false)} className="w-full px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-bold transition-all active:scale-95 border border-white/5">
                  Entendi, vou aguardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <SupportDialog
        isOpen={isSupportOpen}
        onClose={() => setIsSupportOpen(false)}
        adminService={user?.role === 'INSTRUCTOR' ? adminService : undefined}
      />

      <LessonForumModal 
        lessonId={forumLesson?.id || ''}
        lessonTitle={forumLesson?.title || ''}
        user={user}
        isOpen={!!forumLesson}
        onClose={() => setForumLesson(null)}
      />

      {materialsLesson && (
        <LessonMaterialsModal 
          lessonId={materialsLesson.id} 
          lessonTitle={materialsLesson.title} 
          isOpen={true} 
          onClose={() => setMaterialsLesson(null)} 
        />
      )}

      {/* Gamification Events (Global) */}
      <GamificationOverlayManager userId={user.id} />
    </div>
  );
};

export default MainLayout;
