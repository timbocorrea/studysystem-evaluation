import React, { useEffect, useState, useCallback, useMemo, memo, useRef } from 'react';
import { IUserSession } from '../domain/auth';
import { Course, User } from '../domain/entities';
import { Link } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';

interface SidebarProps {
  session: IUserSession;
  activeView: string;
  onViewChange: (view: string, keepMobileOpen?: boolean) => void;
  onLogout: () => void;
  courses?: Course[];
  adminCourses?: Course[];
  onOpenContent?: (courseId: string, moduleId?: string, lessonId?: string) => void;
  onSelectLesson?: (courseId: string, moduleId: string, lessonId: string) => void;
  user?: User | null;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  activeLessonId?: string; // ID da aula sendo editada no Content Editor
  onNavigateFile?: (path: string) => void;
  activeCourse?: Course | null;
  onExpandCourse?: (courseId: string) => void;
  isOnline?: boolean; // Network connection status
  isLoadingCourses?: boolean;
  isLoadingAdminCourses?: boolean;
  isHiddenOnDesktop?: boolean;
  onOpenForum?: (lesson: { id: string, title: string }) => void;
  onOpenMaterials?: (lesson: { id: string, title: string }) => void;
}

// Memoized LessonItem Component for instant rendering
const LessonItem = memo<{
  lesson: any;
  isActive: boolean;
  isAdminMode: boolean;
  courseId: string;
  moduleId: string;
  courseColor?: string | null;
  onSelect?: (courseId: string, moduleId: string, lessonId: string) => void;
  onCloseMobile?: () => void;
  onOpenForum?: (lesson: { id: string, title: string }) => void;
  onOpenMaterials?: (lesson: { id: string, title: string }) => void;
}>(({ lesson, isActive, isAdminMode, courseId, moduleId, courseColor, onSelect, onCloseMobile, onOpenForum, onOpenMaterials }) => {
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAdminMode && onSelect) {
      onSelect(courseId, moduleId, lesson.id);
      onCloseMobile?.();
    }
  }, [isAdminMode, onSelect, courseId, moduleId, lesson.id, onCloseMobile]);

  const isCompleted = lesson.isCompleted || false;
  const baseColor = courseColor || '#10b981'; // emerald-500 default

  if (isAdminMode) {
    return (
      <Link
        to={`/admin/lesson/${lesson.id}/edit`}
        onClick={(e) => e.stopPropagation()}
        data-sidebar-casing="normal"
        className={`w-full text-left px-3 py-2.5 rounded-lg transition-[background-color,color,box-shadow] duration-100 text-[13px] font-medium tracking-wide whitespace-normal break-words block relative z-10 ${isActive
          ? 'font-black shadow-sm'
          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        style={isActive ? { backgroundColor: `${baseColor}1a`, color: baseColor, boxShadow: `0 0 0 1px ${baseColor}33` } : {}}
      >
        <div className="flex items-start gap-3">
          <div className="w-5 shrink-0 flex justify-center">
            <i className="fas fa-pencil-alt mt-1" style={isActive ? { color: baseColor } : { color: '#94a3b8' }}></i>
          </div>
          <span className="flex-1">{lesson.title}</span>
        </div>
      </Link>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClick(e as any); }}
      data-sidebar-casing="normal"
      className={`relative z-10 w-full text-left px-3 py-3 rounded-lg transition-[background-color,transform] duration-200 text-[13px] font-medium tracking-wide whitespace-normal break-words flex items-start gap-3 group cursor-pointer ${!isActive ? 'hover:bg-slate-50 dark:hover:bg-slate-800/40' : ''}`}
      style={isActive ? { backgroundColor: `${baseColor}1a` } : {}}
    >
      <div className="relative flex flex-col items-center mt-0.5 shrink-0 w-5">
        {isCompleted ? (
          <div className="w-5 h-5 rounded-full flex items-center justify-center text-white shadow-sm ring-4 ring-white dark:ring-slate-900 z-10 transition-transform group-hover:scale-110" style={{ backgroundColor: baseColor }}>
            <i className="fas fa-check text-[10px]"></i>
          </div>
        ) : (
          <div
            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center bg-white dark:bg-slate-900 ring-4 ring-white dark:ring-slate-900 z-10 transition-[border-color,color,transform] ${isActive ? '' : 'border-slate-300 dark:border-slate-600 text-slate-400 group-hover:border-slate-400'}`}
            style={isActive ? { borderColor: baseColor, color: baseColor } : {}}
          >
            <i className={`fas fa-chevron-right text-[8px] ml-0.5 ${isActive ? 'translate-x-0.5 transition-transform' : ''}`}></i>
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
        <span
          className={`block transition-colors duration-200 ${isActive ? 'font-bold' : isCompleted ? 'text-slate-600 dark:text-slate-300' : 'text-slate-600 dark:text-slate-400'}`}
          style={isActive ? { color: baseColor } : {}}
        >
          {lesson.title}
        </span>

        {/* Action Buttons for Students */}
        {!isAdminMode && (
          <div className="flex items-center gap-1 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity">
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onOpenMaterials?.({ id: lesson.id, title: lesson.title });
                    onCloseMobile?.();
                }}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 text-slate-400 hover:text-indigo-400 transition-[background-color,color,border-color] border border-transparent hover:border-indigo-500/20"
                title="Materiais"
            >
                <i className="fas fa-file-download text-[11px]"></i>
            </button>
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onOpenForum?.({ id: lesson.id, title: lesson.title });
                    onCloseMobile?.();
                }}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 text-slate-400 hover:text-indigo-400 transition-[background-color,color,border-color] border border-transparent hover:border-indigo-500/20"
                title="Fórum"
            >
                <i className="fas fa-comments text-[11px]"></i>
            </button>
          </div>
        )}
      </div>
    </div>
  );
});

// Memoized Module Item Component for instant rendering
const ModuleItem = memo<{
  module: any;
  isOpen: boolean;
  isAdminMode: boolean;
  courseId: string;
  courseColor?: string | null;
  activeLessonId?: string;
  onToggle: (moduleId: string) => void;
  onOpenContent?: (courseId: string, moduleId?: string) => void;
  onViewChange: (view: string) => void;
  onSelectLesson?: (courseId: string, moduleId: string, lessonId: string) => void;
  onCloseMobile?: () => void;
  onOpenForum?: (lesson: { id: string, title: string }) => void;
  onOpenMaterials?: (lesson: { id: string, title: string }) => void;
}>(({ module, isOpen, isAdminMode, courseId, courseColor, activeLessonId, onToggle, onOpenContent, onViewChange, onSelectLesson, onCloseMobile, onOpenForum, onOpenMaterials }) => {
  const lessons = module.lessons || [];

  const completedLessons = lessons.filter((l: any) => l.isCompleted).length;
  const progressPercent = lessons.length > 0 ? Math.round((completedLessons / lessons.length) * 100) : 0;

  const baseColor = courseColor || '#10b981'; // emerald-500

  const handleToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onToggle(module.id);
  }, [module.id, onToggle]);

  const handleAdminClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onToggle(module.id);
    onOpenContent?.(courseId, module.id);
    onViewChange('content');
  }, [module.id, onToggle, onOpenContent, courseId, onViewChange]);

  return (
    <div
      className={`space-y-0 rounded-xl overflow-hidden shadow-sm border transition-[background-color,border-color] duration-200 ${isOpen ? 'dark:bg-slate-900/60' : 'dark:bg-slate-800/40'}`}
      style={{
        backgroundColor: `${baseColor}${isOpen ? '1A' : '10'}`,
        borderColor: `${baseColor}${isOpen ? '33' : '20'}`
      }}
    >
      {isAdminMode ? (
        <Link
          to="/admin/content"
          state={{ courseId, moduleId: module.id }}
          onClick={handleAdminClick}
          data-sidebar-casing="normal"
          className="w-full text-left px-3 py-3 flex items-start gap-3 group"
        >
          <div className="w-5 shrink-0 flex justify-center">
            {/* Adicionando um ícone na área de adm para manter o fluxo? Não, pode ficar vazio mas alinhado */}
            <i className="fas fa-folder text-slate-400 mt-1 dark:text-slate-500"></i>
          </div>
          <div className="flex-1 min-w-0 pr-2">
            <h3 className={`text-[13px] font-medium tracking-wide truncate transition-colors ${isOpen ? '' : 'text-slate-700 dark:text-slate-300'}`} style={isOpen ? { color: baseColor } : {}}>{module.title}</h3>
          </div>
          <div
            className={`w-7 h-7 shrink-0 rounded flex items-center justify-center transition-colors ${isOpen ? 'text-white shadow-md' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 group-hover:bg-slate-300 dark:group-hover:bg-slate-600'}`}
            style={isOpen ? { backgroundColor: baseColor } : {}}
          >
            <i className={`fas fa-chevron-down text-[10px] transition-transform ${isOpen ? 'rotate-180' : ''}`}></i>
          </div>
        </Link>
      ) : (
        <button
          onClick={handleToggle}
          data-sidebar-casing="normal"
          className="w-full text-left px-3 py-4 flex items-start gap-3 group relative overflow-hidden"
        >
          <div className="w-5 shrink-0"></div> {/* Espaçador para alinhar com o menu principal */}
          <div className="flex-1 min-w-0 pr-2">
            <h3 className={`text-[13px] font-medium tracking-wide transition-colors leading-snug drop-shadow-sm ${isOpen ? '' : 'text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white'}`} style={isOpen ? { color: baseColor } : {}}>{module.title}</h3>

            <div className="flex items-center gap-3 mt-2.5">
              <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden shrink-0 relative">
                <div className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-150 ease-linear" style={{ width: `${progressPercent}%`, backgroundColor: baseColor }}></div>
              </div>
              <span className="text-[10px] font-black tracking-widest" style={{ color: baseColor }}>{progressPercent}%</span>
            </div>
          </div>
          <div
            className={`w-8 h-8 shrink-0 rounded-md flex items-center justify-center transition-[background-color,color,transform,box-shadow] ${isOpen ? 'text-white shadow-md' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 group-hover:bg-slate-300 dark:group-hover:bg-slate-600'}`}
            style={isOpen ? { backgroundColor: baseColor } : {}}
          >
            <i className={`fas fa-chevron-down text-[12px] transition-transform duration-100 ${isOpen ? 'rotate-180' : ''}`}></i>
          </div>
        </button>
      )}

      {/* Expandable Contents */}
      {isOpen && lessons.length > 0 && (
        <div className="bg-white/50 dark:bg-slate-900/50 pt-2 pb-3 border-t border-slate-100 dark:border-white/5">
          {/* Wrapper to add the connecting vertical line effect */}
          <div className="relative isolate space-y-1">
            {/* Dotted Line - Aligned slightly left of the icons w-5 center (left-3 = 12px, half of w-5 = 10px = 22px!) */}
            <div className="absolute top-[28px] bottom-[28px] left-[22px] w-px border-l-[2px] border-dotted border-slate-300 dark:border-slate-600 -z-10"></div>

            {lessons.map((lesson: any) => (
              <LessonItem
                key={lesson.id}
                lesson={lesson}
                isActive={activeLessonId === lesson.id}
                isAdminMode={isAdminMode}
                courseId={courseId}
                moduleId={module.id}
                courseColor={courseColor}
                onSelect={onSelectLesson}
                onCloseMobile={onCloseMobile}
                onOpenForum={onOpenForum}
                onOpenMaterials={onOpenMaterials}
              />
            ))}
          </div>
        </div>
      )}

      {isOpen && lessons.length === 0 && (
        <div className="px-3 py-4 text-xs text-slate-500/70 italic text-center bg-white/50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-white/5">Nenhuma aula cadastrada.</div>
      )}
    </div>
  );
});

// Memoized Course Item Component for instant rendering
const CourseItem = memo<{
  course: Course;
  isOpen: boolean;
  isAdminMode: boolean;
  expandedModuleId: string;
  activeLessonId?: string;
  activeCourse?: Course | null;
  isLoadingModules?: boolean;
  onToggleCourse: (courseId: string) => void;
  onToggleModule: (moduleId: string) => void;
  onExpandCourse?: (courseId: string) => void;
  onOpenContent?: (courseId: string, moduleId?: string) => void;
  onViewChange: (view: string) => void;
  onSelectLesson?: (courseId: string, moduleId: string, lessonId: string) => void;
  onCloseMobile?: () => void;
  onOpenForum?: (lesson: { id: string, title: string }) => void;
  onOpenMaterials?: (lesson: { id: string, title: string }) => void;
  searchQuery?: string;
}>(({ course, isOpen, isAdminMode, expandedModuleId, activeLessonId, activeCourse, isLoadingModules = false, onToggleCourse, onToggleModule, onExpandCourse, onOpenContent, onViewChange, onSelectLesson, onCloseMobile, onOpenForum, onOpenMaterials, searchQuery = '' }) => {
  const rawModules = (activeCourse?.id === course.id && activeCourse.modules?.length)
    ? activeCourse.modules
    : (course.modules || []);

  // Filter modules based on query (by module title or containing a lesson matching the title)
  const modules = searchQuery.trim() === ''
    ? rawModules
    : rawModules.filter((m: any) => {
      const query = searchQuery.toLowerCase();
      const moduleMatch = m.title.toLowerCase().includes(query);
      const lessonMatch = m.lessons?.some((l: any) => l.title.toLowerCase().includes(query));
      return moduleMatch || lessonMatch;
    });

  const shouldShowLoading = isOpen && rawModules.length === 0 && isLoadingModules;

  const handleToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const newId = isOpen ? '' : course.id;
    onToggleCourse(newId);
    if (newId) {
      onExpandCourse?.(newId);
    }
  }, [isOpen, course.id, onToggleCourse, onExpandCourse]);

  const handleAdminClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const newId = isOpen ? '' : course.id;
    onToggleCourse(newId);
    if (newId) {
      onExpandCourse?.(newId);
    }
    onOpenContent?.(course.id);
    onViewChange('content');
  }, [isOpen, course.id, onToggleCourse, onExpandCourse, onOpenContent, onViewChange]);

  const baseColor = course.color || '#10b981';

  const itemClasses = `w-full text-left px-3 py-2 rounded-lg transition-[background-color,color,box-shadow] duration-150 text-[13px] font-medium tracking-wide whitespace-normal break-words block ${!isOpen
    ? 'text-slate-600 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-800 dark:hover:text-slate-300'
    : 'font-bold'
    }`;

  const activeStyles = isOpen ? { 
    backgroundColor: `${baseColor}1a`, 
    color: baseColor,
    boxShadow: `0 0 0 1px ${baseColor}33`
  } : {};

  return (
    <div className="space-y-2 relative pb-2 border-b border-slate-200/60 dark:border-white/5 last:border-b-0">
      {isAdminMode ? (
        <Link
          to="/admin/content"
          state={{ courseId: course.id }}
          onClick={handleAdminClick}
          data-sidebar-casing="normal"
          className={itemClasses}
          style={activeStyles}
        >
          <div className="flex items-start gap-3">
            <div className="w-5 shrink-0 flex justify-center">
              <i className="fas fa-book text-slate-400 dark:text-slate-500 mt-0.5"></i>
            </div>
            <span className="flex-1">{course.title}</span>
            <div
              className={`w-7 h-7 shrink-0 rounded flex items-center justify-center transition-colors ${isOpen ? 'text-white shadow-md' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 group-hover:bg-slate-300 dark:group-hover:bg-slate-600'}`}
              style={isOpen ? { backgroundColor: baseColor } : {}}
            >
              <i className={`fas fa-chevron-down text-[10px] transition-transform ${isOpen ? 'rotate-180' : ''}`}></i>
            </div>
          </div>
        </Link>
      ) : (
        <button
          onClick={handleToggle}
          data-sidebar-casing="normal"
          className={itemClasses}
          style={activeStyles}
        >
          <div className="flex items-start gap-3">
            <div className="w-5 shrink-0 flex justify-center">
              <i className="fas fa-book text-slate-400 dark:text-slate-500 mt-0.5"></i>
            </div>
            <span className="flex-1 text-left leading-snug">{course.title}</span>
            <div
              className={`w-7 h-7 shrink-0 rounded flex items-center justify-center transition-colors ${isOpen ? 'text-white shadow-md' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 group-hover:bg-slate-300 dark:group-hover:bg-slate-600'}`}
              style={isOpen ? { backgroundColor: baseColor } : {}}
            >
              <i className={`fas fa-chevron-down text-[10px] transition-transform ${isOpen ? 'rotate-180' : ''}`}></i>
            </div>
          </div>
        </button>
      )}

      {isOpen && (
        <div className="w-full space-y-3 pt-2">
          {shouldShowLoading && (
            <div className="px-3 py-4 text-xs tracking-wider text-center text-emerald-600/70 font-bold uppercase animate-pulse">
              Carregando Módulos...
            </div>
          )}

          <div className="space-y-3 relative">
            {!shouldShowLoading && modules.map((module: any) => (
              <ModuleItem
                key={module.id}
                module={module}
                isOpen={expandedModuleId === module.id || (searchQuery.trim() !== '' && modules.length < 5)} // Auto-expand when searching
                isAdminMode={isAdminMode}
                courseId={course.id}
                courseColor={course.color}
                activeLessonId={activeLessonId}
                onToggle={onToggleModule}
                onOpenContent={onOpenContent}
                onViewChange={onViewChange}
                onSelectLesson={onSelectLesson}
                onCloseMobile={onCloseMobile}
                onOpenForum={onOpenForum}
                onOpenMaterials={onOpenMaterials}
              />
            ))}
          </div>

          {!shouldShowLoading && modules.length === 0 && (
            <div className="px-3 py-4 text-[12px] text-center text-slate-500/60 italic font-medium">Nenhum módulo encontrado.</div>
          )}
        </div>
      )}
    </div>
  );
});

const Sidebar: React.FC<SidebarProps> = memo(({
  session,
  activeView,
  onViewChange,
  onLogout,
  user,
  courses = [],
  adminCourses = [],
  onOpenContent,
  onSelectLesson,
  isMobileOpen = false,
  onCloseMobile,
  activeLessonId,
  onNavigateFile,
  activeCourse,
  onExpandCourse,
  isOnline = true,
  isLoadingCourses = false,
  isLoadingAdminCourses = false,
  isHiddenOnDesktop = false,
  onOpenForum,
  onOpenMaterials
}) => {
  const isStudent = session.user.role === 'STUDENT';
  const isInstructor = session.user.role === 'INSTRUCTOR';
  const isMaster = session.user.role === 'MASTER';
  const hasAdminAccess = isInstructor || isMaster;

  type SidebarMode = 'expanded' | 'collapsed' | 'hover';
  const [sidebarMode, setSidebarMode] = useState<SidebarMode>(() => {
    const saved = localStorage.getItem('sidebarMode');
    return (saved as SidebarMode) || 'expanded';
  });
  const [isHovered, setIsHovered] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('sidebarMode', sidebarMode);
  }, [sidebarMode]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsPopoverOpen(false);
      }
    };
    if (isPopoverOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isPopoverOpen]);

  const { theme } = useTheme();

  const [contentMenuOpen, setContentMenuOpen] = useState(activeView === 'content');
  const [coursesMenuOpen, setCoursesMenuOpen] = useState(activeView === 'courses');
  const [expandedCourseId, setExpandedCourseId] = useState<string>('');
  const [expandedModuleId, setExpandedModuleId] = useState<string>('');

  // Global search state for courses menu
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');

  const handleToggleCourse = useCallback((courseId: string) => {
    setExpandedCourseId(courseId);
    setExpandedModuleId('');
  }, []);

  const handleToggleModule = useCallback((moduleId: string) => {
    setExpandedModuleId(prev => prev === moduleId ? '' : moduleId);
  }, []);

  useEffect(() => {
    if (activeView === 'content') {
      setContentMenuOpen(true);
    }
    if (activeView === 'courses') {
      setCoursesMenuOpen(true);
    }
  }, [activeView]);

  const isActuallyCollapsed = isMobileOpen === true
    ? false
    : (sidebarMode === 'collapsed' || (sidebarMode === 'hover' && !isHovered));

  const { level, xpInLevel, progressPercent } = useMemo(() => {
    const l = user?.level ?? 1;
    const x = user?.xp ?? 0;
    const xInLevel = x % 1000;
    const pPercent = (xInLevel / 1000) * 100;
    return { level: l, xpInLevel: xInLevel, progressPercent: pPercent };
  }, [user?.level, user?.xp]);

  const { filteredCourses, filteredAdminCourses, query } = useMemo(() => {
    const q = globalSearchQuery.trim().toLowerCase();
    const filterFn = (c: Course) => {
      if (!q) return true;
      if (c.title.toLowerCase().includes(q)) return true;
      return c.modules?.some((m: any) =>
        m.title.toLowerCase().includes(q) ||
        m.lessons?.some((l: any) => l.title.toLowerCase().includes(q))
      ) || false;
    };

    return {
      filteredCourses: courses.filter(filterFn),
      filteredAdminCourses: adminCourses.filter(filterFn),
      query: q
    };
  }, [courses, adminCourses, globalSearchQuery]);

  const menuItems = [
    { id: 'achievements', label: 'Conquistas', icon: 'fas fa-trophy' },
    { id: 'buddy', label: 'Buddy AI', icon: 'fas fa-robot' }
  ];

  return (
    <div
      onMouseEnter={() => { if (sidebarMode === 'hover') setIsHovered(true); }}
      onMouseLeave={() => { if (sidebarMode === 'hover') setIsHovered(false); }}
      className={`
      ${isMobileOpen ? 'fixed h-[100dvh] z-[120] inset-y-0 left-0' : 'hidden'} 
      ${isHiddenOnDesktop ? '' : 'lg:block lg:relative lg:h-full lg:z-[80]'}
      lg:transition-none
      ${isActuallyCollapsed && !isHiddenOnDesktop ? 'lg:w-20' : 'lg:w-[360px]'}
      ${isMobileOpen ? 'w-[360px]' : ''}
      shrink-0 overflow-visible
    `}>
    <aside
      className={`
      flex flex-col
      w-full min-w-0 h-full
      ${isMobileOpen ? 'overflow-y-auto' : 'overflow-visible'}
      lg:overflow-visible
      bg-white/90 dark:bg-slate-900/60 backdrop-blur-xl
      border-r border-slate-200 dark:border-white/5 
      p-4 
      group
      shadow-2xl lg:shadow-none
      cursor-default lg:cursor-default
    `}>

      {/* Close Button Mobile */}
      <button
        onClick={onCloseMobile}
        aria-label="Fechar menu"
        className="absolute right-3 top-3 lg:hidden w-11 h-11 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl transition-colors z-50"
      >
        <i className="fas fa-times text-xl"></i>
      </button>

      {/* Header Container with Divisão */}
      <div className="px-1 pb-[1.4rem] mb-6 border-b border-slate-200 dark:border-white/10 shrink-0">
        <div
          onClick={() => {
            onViewChange('courses');
            onCloseMobile?.();
          }}
          className={`flex items-center gap-2 transition-colors duration-100 relative cursor-pointer group/header ${isActuallyCollapsed ? 'justify-center' : 'justify-between'}`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 min-w-[40px] bg-gradient-to-br from-indigo-600 to-teal-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 rotate-3 ring-1 ring-white/10 group-hover/header:rotate-6 transition-transform">
              <i className="fas fa-graduation-cap"></i>
            </div>
            <div className={`overflow-hidden transition-[width,opacity] duration-75 ease-linear ${isActuallyCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100 flex-1'}`}>
              <h1 className="font-black text-slate-800 dark:text-white text-[19px] leading-tight tracking-tighter uppercase whitespace-nowrap drop-shadow-md">StudySystem</h1>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest whitespace-nowrap mt-[-2px]">Sistema de Estudos</p>
            </div>
          </div>

          {/* User Level - Moved to Top Right of Header */}
          <Link
            to="/achievements"
            onClick={(e) => {
              e.stopPropagation();
              onViewChange('achievements');
            }}
            className={`
              group/level relative flex items-center justify-center shrink-0
              ${isActuallyCollapsed ? 'hidden' : 'w-9 h-9 ml-1'}
              rounded-full transition-transform hover:scale-105 cursor-pointer
            `}
            title="Ver Conquistas"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500 to-orange-600 rounded-full shadow-lg shadow-orange-500/20 ring-2 ring-white dark:ring-slate-900 transition-colors duration-100"></div>
            <span className="relative z-10 font-black text-white text-sm drop-shadow-md">{level}</span>

            {/* XP Ring around the badge */}
            <svg className="absolute -inset-[4px] w-[calc(100%+8px)] h-[calc(100%+8px)] -rotate-90 pointer-events-none opacity-50">
              <circle cx="50%" cy="50%" r="46%" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-200 dark:text-slate-700" />
              <circle cx="50%" cy="50%" r="46%" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="100" strokeDashoffset={100 - progressPercent} pathLength="100" strokeLinecap="round" className="text-amber-500 transition-[stroke-dashoffset] duration-200 ease-linear" />
            </svg>
          </Link>
        </div>
      </div>



      <nav className={`flex-1 min-h-0 space-y-1 overflow-x-hidden ${isMobileOpen ? '' : 'overflow-y-auto scrollbar-hide'} lg:overflow-y-auto lg:scrollbar-hide`}>
        {/* Global Search Box */}
        {!isActuallyCollapsed && (
          <div className="px-3 mb-4">
            <div className="relative">
              <input
                type="text"
                placeholder={hasAdminAccess && activeView === 'content' ? "Pesquisar (Administração)" : "Pesquisar resumo do curso"}
                value={globalSearchQuery}
                onChange={(e) => setGlobalSearchQuery(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="w-full h-9 pl-3 pr-8 rounded-md border border-slate-200 dark:border-white/10 bg-white shadow-sm dark:bg-slate-900/50 text-xs text-slate-700 dark:text-slate-300 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                <i className="fas fa-search text-[11px]"></i>
              </div>
            </div>
            <div className="border-t border-slate-100 dark:border-white/5 mt-4"></div>
          </div>
        )}

        {/* Menu Principal - Only for Students */}
        {isStudent && (
          <>
            {!isActuallyCollapsed && (
              <div className="px-3 mb-3">
                <div className="bg-indigo-50 dark:bg-indigo-500/10 rounded-lg px-3 py-2 flex items-center gap-2 border border-indigo-100 dark:border-indigo-500/20">
                  <i className="fas fa-layer-group text-indigo-500 text-[10px]"></i>
                  <p className="text-[11px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest whitespace-nowrap">Menu Principal</p>
                </div>
              </div>
            )}

            <Link
              to="/"
              onMouseEnter={() => import('@/components/features/dashboard/StudentDashboard')}
              onClick={(e) => {
                e.stopPropagation();
                onViewChange('dashboard');
              }}
              data-active={activeView === 'dashboard' ? 'true' : 'false'}
              className={`w-full flex items-center justify-between gap-3 px-3 py-3 rounded-xl transition-[background-color,color,box-shadow,transform] duration-100 text-base font-bold tracking-tight group relative ${activeView === 'dashboard'
                ? 'bg-gradient-to-r from-indigo-600 to-teal-600 text-white shadow-lg shadow-indigo-500/40 ring-1 ring-indigo-400/50'
                : 'text-slate-600 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-800 dark:hover:text-slate-300'
                } ${isActuallyCollapsed ? 'justify-center' : ''}`}
              title={isActuallyCollapsed ? "Dashboard" : ''}
            >
              <div className="flex items-center gap-3 min-w-0 relative z-10">
                <div className={`transition-transform duration-100 ${activeView === 'dashboard' ? 'scale-110' : 'group-hover:scale-110'}`}>
                  <i className={`fas fa-th-large w-5 text-center ${activeView === 'dashboard' ? 'text-white' : ''}`}></i>
                </div>
                <span className={`transition-[width,opacity] duration-75 ease-linear whitespace-nowrap ${isActuallyCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100'}`}>
                  Dashboard
                </span>
              </div>

              {/* Active Glow Effect */}
              {activeView === 'dashboard' && (
                <div className="absolute inset-0 bg-white/10 animate-pulse pointer-events-none rounded-xl"></div>
              )}
            </Link>

            {/* Courses Menu */}
            <div className={`${isActuallyCollapsed ? 'mt-1 pt-1' : ''}`}>
              <Link
                to="/courses"
                onMouseEnter={() => import('@/components/features/dashboard/StudentDashboard')}
                onClick={(e) => {
                  e.stopPropagation();
                  setCoursesMenuOpen(open => !open);
                  onViewChange('courses', true);
                  if (sidebarMode === 'collapsed') setSidebarMode('expanded');
                }}
                data-active={(activeView === 'courses' || activeView === 'lesson') ? 'true' : 'false'}
                className={`w-full flex items-center justify-between gap-3 px-3 py-3 rounded-xl transition-[background-color,color,box-shadow,transform] duration-100 text-[13px] font-bold uppercase tracking-tight mb-1 group relative overflow-hidden ${(activeView === 'courses' || activeView === 'lesson')
                  ? 'bg-gradient-to-r from-indigo-600 to-teal-600 text-white shadow-lg shadow-indigo-500/40 ring-1 ring-indigo-400/50'
                  : 'text-slate-600 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-800 dark:hover:text-slate-300'
                  } ${isActuallyCollapsed ? 'justify-center' : ''}`}
                title="Meus Cursos"
              >
                <div className="flex items-center gap-3 min-w-0 relative z-10">
                  <div className={`transition-transform duration-100 ${(activeView === 'courses' || activeView === 'lesson') ? 'scale-110' : 'group-hover:scale-110'}`}>
                    <i className={`fas fa-graduation-cap w-5 text-center ${(activeView === 'courses' || activeView === 'lesson') ? 'text-white drop-shadow-md' : ''}`}></i>
                  </div>
                  <span className={`truncate transition-[width,opacity] duration-75 ease-linear ${isActuallyCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100'}`}>Meus Cursos</span>
                </div>
                {!isActuallyCollapsed && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setCoursesMenuOpen(open => !open);
                    }}
                    className="relative z-20 p-1 -m-1 rounded-lg hover:bg-white/20 dark:hover:bg-white/10 transition-colors"
                  >
                    <i className={`fas fa-chevron-down text-xs transition-transform ${coursesMenuOpen ? 'rotate-180' : ''}`}></i>
                  </button>
                )}

                {/* Active Glow Effect */}
                {(activeView === 'courses' || activeView === 'lesson') && (
                  <div className="absolute inset-0 bg-white/10 animate-pulse pointer-events-none rounded-xl"></div>
                )}
              </Link>

              {!isActuallyCollapsed && coursesMenuOpen && (
                <div className="space-y-1 mb-2">
                  {isLoadingCourses && courses.length === 0 && (
                    <div className="px-3 py-2 text-[11px] text-slate-500/70 italic">Carregando cursos...</div>
                  )}
                  {!isLoadingCourses && filteredCourses.length === 0 && (
                    <div className="px-3 py-2 text-[11px] text-slate-500/70 italic">Nenhum curso</div>
                  )}
                  {filteredCourses.map((course: Course) => (
                    <CourseItem
                      key={course.id}
                      course={course}
                      isOpen={expandedCourseId === course.id || (query !== '' && filteredCourses.length < 5)}
                      isAdminMode={false}
                      expandedModuleId={expandedModuleId}
                      activeLessonId={activeLessonId}
                      activeCourse={activeCourse}
                      isLoadingModules={isLoadingCourses}
                      onToggleCourse={handleToggleCourse}
                      onToggleModule={handleToggleModule}
                      onExpandCourse={onExpandCourse}
                      onOpenContent={onOpenContent}
                      onViewChange={onViewChange}
                      onSelectLesson={onSelectLesson}
                      onCloseMobile={onCloseMobile}
                      searchQuery={globalSearchQuery}
                      onOpenForum={onOpenForum}
                      onOpenMaterials={onOpenMaterials}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Other Menu Items */}
            {menuItems.map(item => (
              <Link
                key={item.id}
                to={`/${item.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onViewChange(item.id);
                }}
                data-active={activeView === item.id ? 'true' : 'false'}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-[background-color,color,box-shadow,transform] duration-100 text-base font-bold tracking-tight group relative ${activeView === item.id
                  ? 'bg-indigo-50 dark:bg-white/10 text-indigo-600 dark:text-white shadow-lg shadow-indigo-500/10 dark:shadow-white/5 ring-1 ring-indigo-200 dark:ring-white/10'
                  : 'text-slate-600 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-800 dark:hover:text-slate-300'
                  } ${isActuallyCollapsed ? 'justify-center' : ''}`}
                title={isActuallyCollapsed ? item.label : ''}
              >
                <div className={`transition-transform duration-100 ${activeView === item.id ? 'scale-110' : 'group-hover:scale-110'}`}>
                  <i className={`${item.icon} w-5 text-center ${activeView === item.id ? 'text-indigo-400' : ''}`}></i>
                </div>
                <span className={`transition-[width,opacity] duration-75 ease-linear whitespace-nowrap ${isActuallyCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100'}`}>
                  {item.label}
                </span>
              </Link>
            ))}
          </>
        )}

        {/* Admin Links - Highlighted Section - Only for Admins (Instructor/Master) */}
        {hasAdminAccess && (
          <div className={`mt-8 ${!isActuallyCollapsed ? 'bg-slate-100/50 dark:bg-slate-800/20 rounded-2xl p-3 border border-indigo-100 dark:border-indigo-500/10' : ''}`}>
            {!isActuallyCollapsed && (
              <div className="px-1 mb-4">
                <div className="bg-indigo-50 dark:bg-indigo-500/10 rounded-lg px-3 py-2 flex items-center gap-2 border border-indigo-100 dark:border-indigo-500/20">
                  <i className="fas fa-shield-alt text-indigo-500 text-[10px]"></i>
                  <p className="text-[11px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest whitespace-nowrap">Administração</p>
                </div>
              </div>
            )}

            <div className={`${isActuallyCollapsed ? 'mt-4 border-t border-slate-200 dark:border-slate-800 pt-4' : ''}`}>
              <Link
                to="/admin/content"
                onClick={(e) => {
                  e.stopPropagation();
                  setContentMenuOpen(open => !open);
                  onViewChange('content', true);
                  if (sidebarMode === 'collapsed') setSidebarMode('expanded');
                }}
                data-active={activeView === 'content' ? 'true' : 'false'}
                className={`w-full flex items-center justify-between gap-3 px-3 py-3 rounded-xl transition-[background-color,color,box-shadow,transform] duration-100 text-base font-bold tracking-tight mb-1 group ${activeView === 'content'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                  : 'text-slate-600 dark:text-slate-500 hover:bg-white dark:hover:bg-white/5 hover:text-indigo-600 dark:hover:text-indigo-400 shadow-sm hover:shadow-md bg-white dark:bg-slate-800/50'
                  } ${isActuallyCollapsed ? 'justify-center' : ''}`}
                title="Gestão de Conteúdo"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`transition-transform duration-100 ${activeView === 'content' ? 'scale-110' : 'group-hover:scale-110'}`}>
                    <i className={`fas fa-file-alt w-5 text-center ${activeView === 'content' ? 'text-white' : ''}`}></i>
                  </div>
                  <span className={`truncate transition-[width,opacity] duration-75 ease-linear ${isActuallyCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100'}`}>Gestão de Conteúdo</span>
                </div>
                {!isActuallyCollapsed && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setContentMenuOpen(open => !open);
                    }}
                    className={`relative z-20 p-1 -m-1 rounded-lg transition-colors ${activeView === 'content' ? 'hover:bg-indigo-500/50' : 'hover:bg-slate-100 dark:hover:bg-white/10'}`}
                  >
                    <i className={`fas fa-chevron-down text-xs transition-transform ${contentMenuOpen ? 'rotate-180' : ''}`}></i>
                  </button>
                )}
              </Link>

              {!isActuallyCollapsed && contentMenuOpen && (
                <div className="space-y-1 mb-3 mt-2">
                  {isLoadingAdminCourses && adminCourses.length === 0 && (
                    <div className="px-3 py-2 text-[11px] text-slate-500/70 italic">Carregando cursos...</div>
                  )}
                  {!isLoadingAdminCourses && filteredAdminCourses.length === 0 && (
                    <div className="px-3 py-2 text-[11px] text-slate-500">Nenhum curso</div>
                  )}
                  {filteredAdminCourses.map((course: Course) => (
                    <CourseItem
                      key={course.id}
                      course={course}
                      isOpen={expandedCourseId === course.id || (query !== '' && filteredAdminCourses.length < 5)}
                      isAdminMode={true}
                      expandedModuleId={expandedModuleId}
                      activeLessonId={activeLessonId}
                      activeCourse={activeCourse}
                      isLoadingModules={isLoadingAdminCourses}
                      onToggleCourse={handleToggleCourse}
                      onToggleModule={handleToggleModule}
                      onExpandCourse={onExpandCourse}
                      onOpenContent={onOpenContent}
                      onViewChange={onViewChange}
                      onSelectLesson={onSelectLesson}
                      onCloseMobile={onCloseMobile}
                      searchQuery={globalSearchQuery}
                      onOpenForum={onOpenForum}
                      onOpenMaterials={onOpenMaterials}
                    />
                  ))}
                </div>
              )}

              <Link
                to="/admin/student-activity"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewChange('student-activity');
                }}
                data-active={activeView === 'student-activity' ? 'true' : 'false'}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-[background-color,color,box-shadow,transform] duration-100 text-base font-bold tracking-tight group relative mb-1 ${activeView === 'student-activity' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'text-slate-600 dark:text-slate-500 hover:bg-white dark:hover:bg-white/5 hover:text-indigo-600 dark:hover:text-indigo-400 shadow-sm hover:shadow-md bg-white dark:bg-slate-800/50'} ${isActuallyCollapsed ? 'justify-center' : ''}`}
                title="Acompanhamento de alunos"
              >
                <div className={`transition-transform duration-100 ${activeView === 'student-activity' ? 'scale-110' : 'group-hover:scale-110'}`}>
                  <i className={`fas fa-chart-line w-5 text-center ${activeView === 'student-activity' ? 'text-white' : ''}`}></i>
                </div>
                <span className={`transition-[width,opacity] duration-75 ease-linear whitespace-nowrap ${isActuallyCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100'}`}>
                  Acompanhamento
                </span>
              </Link>

              {/* Central do Professor (Instructor Hub) */}
              <Link
                to="/instructor/interact"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewChange('instructor-interact');
                }}
                data-active={activeView === 'instructor-interact' ? 'true' : 'false'}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-[background-color,color,box-shadow,transform] duration-100 text-base font-bold tracking-tight group relative mb-1 ${activeView === 'instructor-interact' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'text-slate-600 dark:text-slate-500 hover:bg-white dark:hover:bg-white/5 hover:text-indigo-600 dark:hover:text-indigo-400 shadow-sm hover:shadow-md bg-white dark:bg-slate-800/50'} ${isActuallyCollapsed ? 'justify-center' : ''}`}
                title="Central do Professor"
              >
                <div className={`transition-transform duration-100 ${activeView === 'instructor-interact' ? 'scale-110' : 'group-hover:scale-110'}`}>
                  <i className={`fas fa-chalkboard-teacher w-5 text-center ${activeView === 'instructor-interact' ? 'text-white' : ''}`}></i>
                </div>
                <span className={`transition-[width,opacity] duration-75 ease-linear whitespace-nowrap ${isActuallyCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100'}`}>
                  Central do Professor
                </span>
              </Link>

              {/* Master Only: User Control */}
              {isMaster && (
                <Link
                  to="/admin/users"
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewChange('users');
                  }}
                  data-active={activeView === 'users' ? 'true' : 'false'}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-[background-color,color,box-shadow,transform] duration-100 text-base font-bold tracking-tight group relative mb-1 ${activeView === 'users' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'text-slate-600 dark:text-slate-500 hover:bg-white dark:hover:bg-white/5 hover:text-indigo-600 dark:hover:text-indigo-400 shadow-sm hover:shadow-md bg-white dark:bg-slate-800/50'} ${isActuallyCollapsed ? 'justify-center' : ''}`}
                  title="Controle de Usuários"
                >
                  <div className={`transition-transform duration-100 ${activeView === 'users' ? 'scale-110' : 'group-hover:scale-110'}`}>
                    <i className={`fas fa-users w-5 text-center ${activeView === 'users' ? 'text-white' : ''}`}></i>
                  </div>
                  <span className={`transition-[width,opacity] duration-75 ease-linear whitespace-nowrap ${isActuallyCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100'}`}>
                    Controle de Usuários
                  </span>
                </Link>
              )}

              {/* Arquivos Menu with Subfolders - MASTER ONLY */}
              {isMaster && (
                <div>
                  <Link
                    to="/admin/files"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (activeView === 'files') {
                        // Only toggle menu
                      }
                      onViewChange('files');
                    }}
                    data-active={activeView === 'files' ? 'true' : 'false'}
                    className={`w-full flex items-center justify-between gap-3 px-3 py-3 rounded-xl transition-[background-color,color,box-shadow,transform] duration-100 text-base font-bold tracking-tight mb-1 group ${activeView === 'files' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'text-slate-600 dark:text-slate-500 hover:bg-white dark:hover:bg-white/5 hover:text-indigo-600 dark:hover:text-indigo-400 shadow-sm hover:shadow-md bg-white dark:bg-slate-800/50'} ${isActuallyCollapsed ? 'justify-center' : ''}`}
                    title="Gerenciar Arquivos"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`transition-transform duration-100 ${activeView === 'files' ? 'scale-110' : 'group-hover:scale-110'}`}>
                        <i className={`fas fa-folder-open w-5 text-center ${activeView === 'files' ? 'text-white' : ''}`}></i>
                      </div>
                      <span className={`transition-[width,opacity] duration-75 ease-linear whitespace-nowrap ${isActuallyCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100'}`}>
                        Arquivos
                      </span>
                    </div>
                    {!isActuallyCollapsed && activeView === 'files' && <i className="fas fa-chevron-down text-xs"></i>}
                  </Link>

                  {!isActuallyCollapsed && activeView === 'files' && (
                    <div className="ml-3 pl-4 border-l-2 border-indigo-200 dark:border-indigo-500/20 space-y-1 mb-3 mt-2">
                      {['audios', 'course-covers', 'images', 'pdfs'].map(folder => (
                        <button
                          key={folder}
                          onClick={() => onNavigateFile?.(folder)}
                          className="w-full text-left px-3 py-2 rounded-lg transition-[background-color,color,transform] text-base font-medium text-slate-600 dark:text-slate-500 hover:bg-indigo-50 dark:hover:bg-white/5 hover:text-indigo-600 dark:hover:text-indigo-400 capitalize"
                        >
                          <i className="fas fa-folder mr-2 text-indigo-400"></i>
                          {folder}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Audit Access - Only for Minor Supervision or Master */}
              {user && (isMaster || user.isMinor) && (
                <Link
                  to="/audit"
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewChange('audit');
                  }}
                  data-active={activeView === 'audit' ? 'true' : 'false'}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-[background-color,color,box-shadow,transform] duration-100 text-base font-bold tracking-tight mb-1 group ${activeView === 'audit' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'text-slate-600 dark:text-slate-500 hover:bg-white dark:hover:bg-white/5 hover:text-indigo-600 dark:hover:text-indigo-400 shadow-sm hover:shadow-md bg-white dark:bg-slate-800/50'} ${isActuallyCollapsed ? 'justify-center' : ''}`}
                  title="Auditoria"
                >
                  <div className={`transition-transform duration-100 ${activeView === 'audit' ? 'scale-110' : 'group-hover:scale-110'}`}>
                    <i className={`fas fa-eye w-5 text-center ${activeView === 'audit' ? 'text-white' : ''}`}></i>
                  </div>
                  <span className={`transition-[width,opacity] duration-75 ease-linear whitespace-nowrap ${isActuallyCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100'}`}>
                    Auditoria
                  </span>
                </Link>
              )}

              {/* Course Access Management - MASTER ONLY */}
              {isMaster && (
                <Link
                  to="/admin/access"
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewChange('access');
                  }}
                  data-active={activeView === 'access' ? 'true' : 'false'}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-[background-color,color,box-shadow,transform] duration-100 text-base font-bold tracking-tight mb-1 group ${activeView === 'access' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'text-slate-600 dark:text-slate-500 hover:bg-white dark:hover:bg-white/5 hover:text-indigo-600 dark:hover:text-indigo-400 shadow-sm hover:shadow-md bg-white dark:bg-slate-800/50'} ${isActuallyCollapsed ? 'justify-center' : ''}`}
                  title="Acesso aos Cursos"
                >
                  <div className={`transition-transform duration-100 ${activeView === 'access' ? 'scale-110' : 'group-hover:scale-110'}`}>
                    <i className={`fas fa-lock w-5 text-center ${activeView === 'access' ? 'text-white' : ''}`}></i>
                  </div>
                  <span className={`transition-[width,opacity] duration-75 ease-linear whitespace-nowrap ${isActuallyCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100'}`}>
                    Acesso aos Cursos
                  </span>
                </Link>
              )}

              {/* Question Bank */}
              <Link
                to="/admin/questionnaire"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewChange('questionnaire');
                }}
                data-active={activeView === 'questionnaire' ? 'true' : 'false'}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-[background-color,color,box-shadow,transform] duration-100 text-base font-bold tracking-tight mb-1 group ${activeView === 'questionnaire' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'text-slate-600 dark:text-slate-500 hover:bg-white dark:hover:bg-white/5 hover:text-indigo-600 dark:hover:text-indigo-400 shadow-sm hover:shadow-md bg-white dark:bg-slate-800/50'} ${isActuallyCollapsed ? 'justify-center' : ''}`}
                title="Banco de Questões"
              >
                <div className={`transition-transform duration-100 ${activeView === 'questionnaire' ? 'scale-110' : 'group-hover:scale-110'}`}>
                  <i className={`fas fa-clipboard-question w-5 text-center ${activeView === 'questionnaire' ? 'text-white' : ''}`}></i>
                </div>
                <span className={`transition-[width,opacity] duration-75 ease-linear whitespace-nowrap ${isActuallyCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100'}`}>
                  Banco de Questões
                </span>
              </Link>

              {/* Master Exclusive: System Health & Settings */}
              {isMaster && (
                <>
                  <Link
                    to="/admin/health"
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewChange('system-health');
                    }}
                    data-active={activeView === 'system-health' ? 'true' : 'false'}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-[background-color,color,box-shadow,transform] duration-100 text-base font-bold tracking-tight mb-1 group ${activeView === 'system-health' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'text-slate-600 dark:text-slate-500 hover:bg-white dark:hover:bg-white/5 hover:text-indigo-600 dark:hover:text-indigo-400 shadow-sm hover:shadow-md bg-white dark:bg-slate-800/50'} ${isActuallyCollapsed ? 'justify-center' : ''}`}
                    title="Saúde do Sistema"
                  >
                    <div className={`transition-transform duration-100 ${activeView === 'system-health' ? 'scale-110' : 'group-hover:scale-110'}`}>
                      <i className={`fas fa-heartbeat w-5 text-center ${activeView === 'system-health' ? 'text-white' : ''}`}></i>
                    </div>
                    <span className={`transition-[width,opacity] duration-75 ease-linear whitespace-nowrap ${isActuallyCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100'}`}>
                      Saúde do Sistema
                    </span>
                  </Link>

                  <Link
                    to="/admin/settings"
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewChange('settings');
                    }}
                    data-active={activeView === 'settings' ? 'true' : 'false'}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-[background-color,color,box-shadow,transform] duration-100 text-base font-bold tracking-tight mb-1 group ${activeView === 'settings' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'text-slate-600 dark:text-slate-500 hover:bg-white dark:hover:bg-white/5 hover:text-indigo-600 dark:hover:text-indigo-400 shadow-sm hover:shadow-md bg-white dark:bg-slate-800/50'} ${isActuallyCollapsed ? 'justify-center' : ''}`}
                    title="Configuração do Suporte"
                  >
                    <div className={`transition-transform duration-100 ${activeView === 'settings' ? 'scale-110' : 'group-hover:scale-110'}`}>
                      <i className={`fas fa-cogs w-5 text-center ${activeView === 'settings' ? 'text-white' : ''}`}></i>
                    </div>
                    <span className={`transition-[width,opacity] duration-75 ease-linear whitespace-nowrap ${isActuallyCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100'}`}>
                      Configuração do Suporte
                    </span>
                  </Link>
                </>
              )}

            </div>
          </div>
        )}
      </nav>

      <div className={`mt-auto pt-6 space-y-2 border-t border-slate-200 dark:border-white/5 shrink-0 ${isActuallyCollapsed ? 'flex flex-col items-center' : ''}`}>

        {/* Collapse Toggle (Footer) */}
        {!isMobileOpen && (
          <div className="relative w-full flex justify-start px-3" ref={popoverRef}>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsPopoverOpen(!isPopoverOpen);
              }}
              aria-label="Controle da Barra Lateral"
              className={`
                flex items-center shrink-0
                h-11 rounded-xl
                text-slate-500 dark:text-slate-400
                hover:bg-slate-100 dark:hover:bg-white/5
                hover:text-slate-800 dark:hover:text-slate-200
                transition-colors duration-100 group border border-transparent
                ${isActuallyCollapsed ? 'justify-center' : 'justify-start px-3'}
                w-full
                ${isPopoverOpen ? 'bg-slate-200 dark:bg-white/10 text-slate-900 dark:text-white border-slate-300 dark:border-white/20' : ''}
              `}
              title="Controle da Barra Lateral"
            >
              <div className="group-hover:scale-110 transition-transform duration-100">
                <i className="fas fa-bars-staggered text-sm"></i>
              </div>
            </button>

            {/* Popover */}
            {isPopoverOpen && (
              <div className={`absolute w-[240px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl p-2.5 z-[100] text-sm transform-gpu transition-[opacity,transform] duration-100 ${isActuallyCollapsed ? 'left-full bottom-0 ml-3 origin-bottom-left' : 'bottom-full mb-3 left-3 origin-bottom-left'}`}>
                <div className="px-2 pt-1 pb-3 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 mb-2">
                   Comportamento da Barra Lateral
                </div>

                <button
                  onClick={(e) => { e.stopPropagation(); setSidebarMode('expanded'); setIsPopoverOpen(false); }}
                  className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-3 transition-colors ${sidebarMode === 'expanded' ? 'bg-indigo-50/80 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400 font-bold' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 font-medium'}`}
                >
                  <div className={`w-4 h-4 rounded-full border flex flex-shrink-0 items-center justify-center ${sidebarMode === 'expanded' ? 'border-indigo-500 dark:border-indigo-400' : 'border-slate-300 dark:border-slate-600'}`}>
                    {sidebarMode === 'expanded' && <div className="w-2 h-2 rounded-full bg-indigo-500 dark:bg-indigo-400"></div>}
                  </div>
                  Sempre Aberta
                </button>

                <button
                  onClick={(e) => { e.stopPropagation(); setSidebarMode('collapsed'); setIsPopoverOpen(false); }}
                  className={`w-full mt-1 text-left px-3 py-2.5 rounded-lg flex items-center gap-3 transition-colors ${sidebarMode === 'collapsed' ? 'bg-indigo-50/80 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400 font-bold' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 font-medium'}`}
                >
                  <div className={`w-4 h-4 rounded-full border flex flex-shrink-0 items-center justify-center ${sidebarMode === 'collapsed' ? 'border-indigo-500 dark:border-indigo-400' : 'border-slate-300 dark:border-slate-600'}`}>
                    {sidebarMode === 'collapsed' && <div className="w-2 h-2 rounded-full bg-indigo-500 dark:bg-indigo-400"></div>}
                  </div>
                  Sempre Fechada
                </button>

                <button
                  onClick={(e) => { e.stopPropagation(); setSidebarMode('hover'); setIsPopoverOpen(false); }}
                  className={`w-full mt-1 text-left px-3 py-2.5 rounded-lg flex items-center gap-3 transition-colors ${sidebarMode === 'hover' ? 'bg-indigo-50/80 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400 font-bold' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 font-medium'}`}
                >
                  <div className={`w-4 h-4 rounded-full border flex flex-shrink-0 items-center justify-center ${sidebarMode === 'hover' ? 'border-indigo-500 dark:border-indigo-400' : 'border-slate-300 dark:border-slate-600'}`}>
                    {sidebarMode === 'hover' && <div className="w-2 h-2 rounded-full bg-indigo-500 dark:bg-indigo-400"></div>}
                  </div>
                  Abrir ao passar o mouse
                </button>
              </div>
            )}
          </div>
        )}
      </div>

    </aside >
    </div>
  );
});

export default Sidebar;
