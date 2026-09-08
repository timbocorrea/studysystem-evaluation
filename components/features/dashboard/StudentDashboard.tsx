import React, { useEffect, useState } from 'react';
import { Course, User } from '@/domain/entities';
import WeeklySummary from '@/components/features/dashboard/WeeklySummary';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import CourseCard from '@/components/features/dashboard/CourseCard';
import DashboardSkeleton from '@/components/skeletons/DashboardSkeleton';
import RecentActivity from '@/components/features/dashboard/RecentActivity';
import LazyImage from '@/components/ui/LazyImage';
import { useCourse } from '@/contexts/CourseContext';

interface StudentDashboardProps {
  user: User;
  courses: Course[];
  isLoading?: boolean;
  onCourseClick: (id: string) => void;
  onManageCourse?: (id: string) => void;
  onManageContent?: () => void;
  showEnrollButton?: boolean;
  enrolledCourseIds?: string[];
  sectionTitle?: string;
  showDashboardAnalytics?: boolean;
}

const computeCourseProgress = (course: any) => {
  const modules = course.modules || [];
  const lessons = modules.flatMap((m: any) => m.lessons);
  const total = lessons.length;
  const completed = lessons.filter((l: any) => l.isCompleted).length;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
  return { total, completed, percent };
};

const StudentDashboard: React.FC<StudentDashboardProps> = ({
  user,
  courses,
  isLoading = false,
  onCourseClick,
  onManageCourse,
  onManageContent,
  showEnrollButton = false,
  enrolledCourseIds = [],
  sectionTitle = "Cursos da Plataforma",
  showDashboardAnalytics = true
}) => {
  const [viewMode, setViewMode] = React.useState<'cards' | 'minimal' | 'list'>(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      return 'minimal';
    }
    return 'cards';
  });

  const shouldShowDashboardAnalytics = showDashboardAnalytics && user.role === 'STUDENT';

  // Real XP History Data (Last 7 days)
  const { courseService } = useCourse();
  const [xpHistory, setXpHistory] = useState<any[]>([]);

  useEffect(() => {
    if (!shouldShowDashboardAnalytics || !user?.id) return;
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    courseService.getWeeklyXpHistory(user.id)
      .then((data: any[]) => {
        const formatted = data.map((entry: any) => {
          const [dd, mm] = entry.date.split('/');
          const year = new Date().getFullYear();
          const dateObj = new Date(year, parseInt(mm) - 1, parseInt(dd));
          const dayName = days[dateObj.getDay()] || '';
          const minutes = Math.round(entry.xp / 10 * 1.2);
          return {
            date: dayName,
            fullDate: `${dayName} ${dd}/${mm}`,
            day: dd,
            month: mm,
            xp: entry.xp,
            minutes: minutes
          };
        });
        setXpHistory(formatted);
      })
      .catch((err: any) => {
        console.error('Failed to load XP history:', err);
        setXpHistory([]);
      });
  }, [user?.id, courseService, shouldShowDashboardAnalytics]);

  const courseProgressData = React.useMemo(
    () =>
      courses.map((course) => {
        const { percent } = computeCourseProgress(course);
        return { courseId: course.id, title: course.title, progress: percent };
      }),
    [courses]
  );

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto relative">
      <div className="noise-overlay" />
      {/* Header - Welcome Section */}
      {showDashboardAnalytics && <DashboardHeader user={user} />}

      {/* Main Content Grid (2 Columns for Dashboard, Full Width for Courses) */}
      <div className={`grid grid-cols-1 ${shouldShowDashboardAnalytics ? 'xl:grid-cols-3' : 'xl:grid-cols-1'} gap-8 ${showDashboardAnalytics ? 'mt-8' : 'mt-2'}`}>

        {/* LEFT COLUMN: Graphical Data & Recent Activity (Only on Dashboard) */}
        {shouldShowDashboardAnalytics && (
          <div className="xl:col-span-1">
            <div className="sticky top-8 space-y-6">
              <div>
                <WeeklySummary
                  xpHistory={xpHistory}
                  courseProgress={courseProgressData}
                />
              </div>
              <div>
                <RecentActivity user={user} />
              </div>
            </div>
          </div>
        )}

        {/* RIGHT COLUMN: Courses */}
        <div className={shouldShowDashboardAnalytics ? 'xl:col-span-2' : 'xl:col-span-1'}>
          <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h3 className="text-xl font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-3">
                <i className="fas fa-graduation-cap text-indigo-500"></i>
                {sectionTitle}
              </h3>

              <div className="flex items-center gap-4 self-end md:self-auto">
                <div className="flex bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/5 p-1 rounded-xl backdrop-blur-sm gap-1">
                  <button
                    onClick={() => setViewMode('cards')}
                    className={`min-w-[44px] min-h-[44px] p-2.5 rounded-lg transition-all flex items-center justify-center ${viewMode === 'cards' ? 'bg-indigo-50 dark:bg-white/10 text-indigo-600 dark:text-white shadow-lg ring-1 ring-indigo-200 dark:ring-white/10' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/5'}`}
                    title="Visualização em Cards"
                  >
                    <i className="fas fa-th-large"></i>
                  </button>
                  <button
                    onClick={() => setViewMode('minimal')}
                    className={`min-w-[44px] min-h-[44px] p-2.5 rounded-lg transition-all flex items-center justify-center ${viewMode === 'minimal' ? 'bg-indigo-50 dark:bg-white/10 text-indigo-600 dark:text-white shadow-lg ring-1 ring-indigo-200 dark:ring-white/10' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/5'}`}
                    title="Visualização Minimalista"
                  >
                    <i className="fas fa-th"></i>
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`min-w-[44px] min-h-[44px] p-2.5 rounded-lg transition-all flex items-center justify-center ${viewMode === 'list' ? 'bg-indigo-50 dark:bg-white/10 text-indigo-600 dark:text-white shadow-lg ring-1 ring-indigo-200 dark:ring-white/10' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/5'}`}
                    title="Visualização em Lista"
                  >
                    <i className="fas fa-list"></i>
                  </button>
                </div>
              </div>
            </div>

            {isLoading ? (
              <DashboardSkeleton count={6} />
            ) : courses.length === 0 ? (
              <div className="bg-slate-100 dark:bg-black/20 backdrop-blur-md rounded-3xl border border-slate-200 dark:border-white/5 p-10 text-center">
                <p className="text-slate-500 dark:text-slate-400 font-bold">Nenhum curso disponível ainda.</p>
                {user.role === 'INSTRUCTOR' && (
                  <p className="text-sm text-slate-500 mt-2">
                    Crie um curso em <span className="font-black text-indigo-400">Gestão de Conteúdo</span>.
                  </p>
                )}
              </div>
            ) : (
              <div
                className={`gap-6 p-1 overflow-y-auto max-h-[1050px] scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600 scrollbar-track-transparent pr-2 ${viewMode === 'list' ? 'flex flex-col' : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3'}`}
              >
                {courses.map(course => {
                  const progressItem = courseProgressData.find(p => p.courseId === course.id);
                  const percent = progressItem?.progress ?? 0;
                  const isEnrolled = enrolledCourseIds.includes(course.id);
                  const safeCourseImageUrl = course.imageUrl?.replace(/"/g, '%22');
                  const courseBackgroundStyle: React.CSSProperties | undefined = safeCourseImageUrl
                    ? {
                        backgroundImage: `linear-gradient(90deg, rgba(2,6,23,0.78), rgba(15,23,42,0.66)), url("${safeCourseImageUrl}")`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        backgroundRepeat: 'no-repeat'
                      }
                    : undefined;

                  if (viewMode === 'list') {
                    return (
                      <div
                        key={course.id}
                        onClick={() => onCourseClick(course.id)}
                        style={courseBackgroundStyle}
                        className="bg-slate-950 dark:bg-black/20 backdrop-blur-md rounded-2xl p-4 border border-white/10 shadow-lg shadow-slate-950/20 hover:shadow-xl hover:border-indigo-400/40 transition-all group flex items-center gap-6 cursor-pointer relative overflow-hidden"
                      >
                        <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-slate-800 relative z-10 group-hover:scale-105 transition-transform duration-300">
                          {course.imageUrl ? (
                            <LazyImage src={course.imageUrl} alt={course.title} className="w-full h-full object-cover opacity-90 group-hover:opacity-100" aspectRatio="1/1" />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-indigo-500/20 to-cyan-500/20 flex items-center justify-center text-white/50">
                              <i className="fas fa-book-open text-xs"></i>
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0 relative z-10">
                          <div className="flex items-center gap-3 mb-1">
                            {isEnrolled && (
                              <span className="bg-emerald-300/70 text-[#002a15] border border-emerald-400/50 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wide">
                                Inscrito
                              </span>
                            )}
                            <h4 className="text-sm font-black text-white truncate drop-shadow-md group-hover:text-indigo-200">
                              {course.title}
                            </h4>
                          </div>
                        </div>

                        <div className="w-32 hidden sm:block relative z-10">
                          <div className="flex justify-between text-[10px] font-bold text-white/80 mb-1 relative z-10">
                            <span>{percent}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-white/25 rounded-full overflow-hidden">
                            <div 
                              className="h-full transition-all duration-500" 
                              style={{ 
                                width: `${percent}%`, 
                                backgroundColor: course.color || '#10b981' 
                              }}
                            ></div>
                          </div>
                        </div>

                        <div className="flex-shrink-0 relative z-10">
                          <button className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/5 text-indigo-600 flex items-center justify-center">
                            <i className="fas fa-play"></i>
                          </button>
                        </div>
                      </div>
                    );
                  }

                  if (viewMode === 'minimal') {
                    return (
                      <div
                        key={course.id}
                        onClick={() => onCourseClick(course.id)}
                        style={courseBackgroundStyle}
                        className="bg-slate-950 dark:bg-black/20 backdrop-blur-md rounded-2xl p-6 border border-white/10 shadow-lg shadow-slate-950/20 hover:border-indigo-400/40 cursor-pointer transition-all group flex flex-col h-full relative overflow-hidden"
                      >
                        <div className="flex items-start justify-between mb-4 relative z-10">
                          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl bg-slate-100 dark:bg-white/5 text-slate-500 overflow-hidden">
                            {course.imageUrl ? (
                              <LazyImage src={course.imageUrl} alt={course.title} className="w-full h-full object-cover" aspectRatio="1/1" />
                            ) : (<i className="fas fa-book-open"></i>)}
                          </div>
                        </div>
                        <h4 className="font-black text-white text-base mb-2 group-hover:text-indigo-200 relative z-10 drop-shadow-md">
                          {course.title}
                        </h4>
                        <div className="mt-auto space-y-3 pt-4 border-t border-white/20 relative z-10">
                          <div className="w-full h-1.5 bg-white/25 rounded-full overflow-hidden">
                            <div 
                              className="h-full transition-all duration-500" 
                              style={{ 
                                width: `${percent}%`, 
                                backgroundColor: course.color || '#10b981' 
                              }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={course.id}>
                      <CourseCard
                        course={course}
                        isEnrolled={isEnrolled}
                        progress={percent}
                        onClick={() => onCourseClick(course.id)}
                        onManage={user.role === 'INSTRUCTOR' ? () => onManageCourse?.(course.id) : undefined}
                        useInteractiveHoverButton={true}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;