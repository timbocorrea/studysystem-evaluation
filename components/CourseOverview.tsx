import React, { useState } from 'react';
import { Course, Module, Lesson } from '../domain/entities';
import LessonForumModal from './features/classroom/LessonForumModal';
import LessonMaterialsModal from './features/classroom/LessonMaterialsModal';
import { AchievementsList } from './AchievementsList';

interface CourseOverviewProps {
    user: any;
    activeCourse: Course | null;
    onSelectLesson: (lesson: Lesson, tab?: 'materials' | 'forum') => void;
    onSelectModule: (module: Module) => void;
    onOpenForum?: (lesson: { id: string, title: string }) => void;
    onOpenMaterials?: (lesson: { id: string, title: string }) => void;
}

const CourseOverview: React.FC<CourseOverviewProps> = ({ user, activeCourse, onSelectLesson, onSelectModule, onOpenForum, onOpenMaterials }) => {
    const [activeTab, setActiveTab] = useState<'overview' | 'curriculum' | 'achievements'>('overview');
    const [expandedModuleId, setExpandedModuleId] = useState<string | null>(null);

    if (!activeCourse) {
        return (
            <div className="flex items-center justify-center h-64 text-slate-400 font-light tracking-wide animate-pulse">
                Selecione um curso para iniciar a jornada.
            </div>
        );
    }

    const visibleModules = (activeCourse.modules || []).map((module) => ({
        ...module,
        lessons: (module.lessons || []).filter((lesson) => (lesson as any).is_active !== false)
    })) as Module[];

    const totalLessons = visibleModules.reduce((acc, m) => acc + (m.lessons?.length || 0), 0);
    const completedLessons = visibleModules.reduce((acc, m) => acc + (m.lessons?.filter(l => l.isCompleted).length || 0), 0);
    const overallProgress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

    const formatDate = (date: Date | null) => {
        if (!date) return null;
        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const tabs = [
        { id: 'overview' as const, label: 'Visão Geral', icon: 'fas fa-info-circle' },
        { id: 'curriculum' as const, label: 'Currículo', icon: 'fas fa-list-ol' },
        { id: 'achievements' as const, label: 'Conquistas', icon: 'fas fa-trophy' },
    ];

    const metadataItems = [
        activeCourse.estimatedHours && { icon: 'fas fa-clock', label: `${activeCourse.estimatedHours} HORAS`, color: 'text-blue-500' },
        activeCourse.level && { icon: 'fas fa-signal', label: activeCourse.level.toUpperCase(), color: 'text-emerald-500' },
        activeCourse.language && { icon: 'fas fa-language', label: activeCourse.language.toUpperCase(), color: 'text-amber-500' },
        activeCourse.teachingType && { icon: 'fas fa-chalkboard-teacher', label: activeCourse.teachingType.toUpperCase(), color: 'text-purple-500' },
        { icon: 'fas fa-book-open', label: `${activeCourse.modules?.length || 0} MÓDULOS`, color: 'text-indigo-500' },
        { icon: 'fas fa-file-alt', label: `${totalLessons} AULAS`, color: 'text-teal-500' },
    ].filter(Boolean) as { icon: string; label: string; color: string }[];

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-in fade-in duration-500">

            {/* ═══ HERO HEADER ═══ */}
            <header className="relative overflow-hidden rounded-2xl border border-slate-200/60 dark:border-white/10 shadow-xl">
                {/* Cover Image or Gradient */}
                <div className="relative h-64 md:h-80">
                    {activeCourse.imageUrl ? (
                        <img
                            src={activeCourse.imageUrl}
                            alt={activeCourse.title}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-indigo-600 via-blue-600 to-teal-500" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

                    {/* Title Overlay */}
                    <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
                        <div className="flex items-end justify-between gap-4">
                            <div className="flex-1 min-w-0">
                                <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight leading-tight drop-shadow-lg">
                                    {activeCourse.title}
                                </h1>
                                {(activeCourse.instructorName || activeCourse.startDate) && (
                                    <div className="flex items-center gap-4 mt-2 text-sm text-white/80">
                                        {activeCourse.instructorName && (
                                            <span className="flex items-center gap-1.5">
                                                <i className="fas fa-user-tie text-xs" />
                                                {activeCourse.instructorName}
                                            </span>
                                        )}
                                        {activeCourse.startDate && (
                                            <span className="flex items-center gap-1.5">
                                                <i className="fas fa-calendar-alt text-xs" />
                                                {formatDate(activeCourse.startDate)}
                                                {activeCourse.endDate && ` — ${formatDate(activeCourse.endDate)}`}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Progress Badge */}
                            <div className="hidden md:flex flex-col items-center bg-white/15 backdrop-blur-md rounded-xl px-5 py-3 border border-white/20">
                                <span className="text-3xl font-black text-white">{overallProgress}%</span>
                                <span className="text-[10px] font-bold text-white/70 uppercase tracking-widest">Concluído</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="h-1 bg-slate-200 dark:bg-slate-800">
                    <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-teal-500 transition-all duration-1000 ease-out"
                        style={{ width: `${overallProgress}%` }}
                    />
                </div>
            </header>

            {/* ═══ METADATA CHIPS ═══ */}
            <div className="flex flex-wrap gap-3">
                {metadataItems.map((item, i) => (
                    <div
                        key={i}
                        className="flex items-center gap-2 bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/10 rounded-xl px-4 py-2.5 shadow-sm hover:shadow-md transition-shadow"
                    >
                        <i className={`${item.icon} text-sm ${item.color}`} />
                        <span className="text-[11px] font-black text-slate-700 dark:text-slate-300 tracking-widest">{item.label}</span>
                    </div>
                ))}
            </div>

            {/* ═══ TABS ═══ */}
            <div className="flex gap-1 bg-slate-100 dark:bg-slate-900/50 rounded-xl p-1 border border-slate-200/60 dark:border-white/5">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold tracking-wide transition-all ${activeTab === tab.id
                            ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-white shadow-sm'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                            }`}
                    >
                        <i className={`${tab.icon} text-xs`} />
                        <span className="hidden sm:inline">{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* ═══ TAB CONTENT ═══ */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

                {/* LEFT COLUMN (2/3) */}
                <div className="xl:col-span-2 space-y-6">

                    {/* OVERVIEW TAB */}
                    {activeTab === 'overview' && (
                        <div className="space-y-6 animate-in fade-in duration-300">
                            {/* Description */}
                            {activeCourse.description && (
                                <div className="bg-white dark:bg-slate-900/60 border border-slate-200/60 dark:border-white/10 rounded-2xl p-6 shadow-sm">
                                    <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest mb-3 flex items-center gap-2">
                                        <i className="fas fa-align-left text-indigo-500 text-xs" />
                                        Sobre este curso
                                    </h3>
                                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-line">
                                        {activeCourse.description}
                                    </p>
                                </div>
                            )}

                            {/* What you'll learn - Module Overview */}
                            <div className="bg-white dark:bg-slate-900/60 border border-slate-200/60 dark:border-white/10 rounded-2xl p-6 shadow-sm">
                                <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <i className="fas fa-graduation-cap text-indigo-500 text-xs" />
                                    O que você vai aprender
                                </h3>
                                <div className="space-y-2">
                                    {visibleModules.map((module, i) => {
                                        const totalM = module.lessons.length;
                                        const completedM = module.lessons.filter(l => l.isCompleted).length;
                                        const pct = totalM > 0 ? Math.round((completedM / totalM) * 100) : 0;

                                        return (
                                            <div key={module.id} className="group">
                                                <button
                                                    onClick={() => setExpandedModuleId(expandedModuleId === module.id ? null : module.id)}
                                                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                                                >
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black shrink-0 transition-colors ${pct === 100
                                                        ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400'
                                                        : 'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400'
                                                        }`}>
                                                        {pct === 100 ? <i className="fas fa-check" /> : i + 1}
                                                    </div>
                                                    <span className="flex-1 text-left text-sm font-bold text-slate-700 dark:text-slate-200 tracking-wide">
                                                        {module.title}
                                                    </span>
                                                    <span className="text-[10px] font-black text-slate-400 mr-2">{completedM}/{totalM}</span>
                                                    <i className={`fas fa-chevron-down text-xs text-slate-400 transition-transform ${expandedModuleId === module.id ? 'rotate-180' : ''}`} />
                                                </button>

                                                {expandedModuleId === module.id && module.lessons.length > 0 && (
                                                    <div className="ml-11 mt-1 mb-2 space-y-1 animate-in fade-in slide-in-from-top-2 duration-200">
                                                        {module.lessons.map((lesson) => (
                                                            <div
                                                                key={lesson.id}
                                                                onClick={() => onSelectLesson(lesson)}
                                                                className="w-full flex flex-wrap items-start sm:items-center gap-x-3 gap-y-2 px-3 py-2 rounded-lg text-left hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors group/lesson cursor-pointer"
                                                            >
                                                                <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${lesson.isCompleted
                                                                    ? 'bg-emerald-500 text-white'
                                                                    : 'border-2 border-slate-300 dark:border-slate-600'
                                                                    }`}>
                                                                    {lesson.isCompleted && <i className="fas fa-check text-[8px]" />}
                                                                </div>
                                                                <span className={`text-xs font-medium flex-1 min-w-0 ${lesson.isCompleted
                                                                    ? 'text-slate-400 line-through'
                                                                    : 'text-slate-600 dark:text-slate-300 group-hover/lesson:text-indigo-600 dark:group-hover/lesson:text-indigo-400'
                                                                    }`}>
                                                                    {lesson.title}
                                                                </span>
                                                                
                                                                <div className="flex w-full flex-wrap items-center gap-2 pl-8 sm:ml-2 sm:w-auto sm:flex-nowrap sm:pl-0">
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            onOpenMaterials?.({ id: lesson.id, title: lesson.title });
                                                                        }}
                                                                        className="p-1.5 px-3 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-[9px] font-black uppercase tracking-widest text-indigo-500 dark:text-indigo-400 transition-all flex items-center gap-2 border border-indigo-500/20"
                                                                        title="Materiais de Apoio"
                                                                    >
                                                                      <i className="fas fa-file-download text-[10px]" />
                                                                      <span>Materiais</span>
                                                                    </button>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            onOpenForum?.({ id: lesson.id, title: lesson.title });
                                                                        }}
                                                                        className="p-1.5 px-3 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-[9px] font-black uppercase tracking-widest text-indigo-500 dark:text-indigo-400 transition-all flex items-center gap-2 border border-indigo-500/20"
                                                                        title="Fórum da Aula"
                                                                    >
                                                                      <i className="fas fa-comments text-[10px]" />
                                                                      <span>Fórum</span>
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* CURRICULUM TAB */}
                    {activeTab === 'curriculum' && (
                        <div className="space-y-4 animate-in fade-in duration-300">
                            <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest flex items-center gap-2">
                                <i className="fas fa-list-ol text-indigo-500 text-xs" />
                                Módulos do Curso
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {visibleModules.map((module: Module, index: number) => {
                                    const totalM = module.lessons.length;
                                    const completedM = module.lessons.filter(l => l.isCompleted).length;
                                    const progressPercent = totalM > 0 ? Math.round((completedM / totalM) * 100) : 0;

                                    return (
                                        <div
                                            key={module.id}
                                            className="group relative flex flex-col h-[420px] overflow-hidden rounded-2xl border border-slate-200/50 dark:border-white/10 bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl shadow-lg transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 animate-in fade-in zoom-in-95 fill-mode-backwards"
                                            style={{ animationDelay: `${index * 80}ms` }}
                                        >
                                            {/* Module Header */}
                                            <div className="p-5 border-b border-slate-100/50 dark:border-white/5 flex-shrink-0">
                                                <div className="flex justify-between items-start mb-2">
                                                    <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 tracking-wide uppercase line-clamp-2">
                                                        {module.title}
                                                    </h3>
                                                    <div className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full text-[10px] font-bold text-slate-500 dark:text-slate-400 flex-shrink-0 ml-2">
                                                        {completedM}/{totalM}
                                                    </div>
                                                </div>
                                                <div className="w-full h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                                    <div className="h-full bg-indigo-500 rounded-full transition-all duration-1000 ease-out" style={{ width: `${progressPercent}%` }} />
                                                </div>
                                                <div className="mt-1 text-right text-[9px] font-bold text-indigo-500">{progressPercent}% CONCLUÍDO</div>
                                            </div>

                                            {/* Lessons List */}
                                            <div className="flex-1 p-4 space-y-1.5 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600 scrollbar-track-transparent">
                                                {module.lessons?.map((lesson: Lesson) => (
                                                        <div
                                                            key={lesson.id}
                                                            onClick={() => onSelectLesson(lesson)}
                                                            className="w-full text-left group/lesson px-3 py-2 rounded-lg border border-transparent hover:border-indigo-500/20 bg-white/50 dark:bg-slate-800/30 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-all flex flex-wrap items-start sm:items-center gap-x-2.5 gap-y-2 cursor-pointer"
                                                        >
                                                            <div className={`w-5 h-5 flex-shrink-0 flex items-center justify-center rounded-full transition-all ${lesson.isCompleted
                                                                ? 'bg-emerald-500 text-white'
                                                                : 'bg-slate-200 dark:bg-white/10 text-slate-400 group-hover/lesson:bg-indigo-500 group-hover/lesson:text-white'
                                                                }`}>
                                                                {lesson.isCompleted
                                                                    ? <i className="fas fa-check text-[8px]" />
                                                                    : <i className="fas fa-play text-[8px] ml-0.5" />
                                                                }
                                                            </div>
                                                            <span className={`text-xs font-medium flex-1 min-w-0 ${lesson.isCompleted
                                                                ? 'text-slate-400 line-through'
                                                                : 'text-slate-600 dark:text-slate-300 group-hover/lesson:text-indigo-600 dark:group-hover/lesson:text-indigo-400'
                                                                }`}>
                                                                {lesson.title}
                                                            </span>
                                                            <div className="flex w-full flex-wrap items-center gap-1.5 pl-8 sm:w-auto sm:flex-nowrap sm:pl-0">
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        onOpenMaterials?.({ id: lesson.id, title: lesson.title });
                                                                    }}
                                                                    className="p-1 px-2 rounded-md hover:bg-white/10 text-[8px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-500 transition-colors"
                                                                    title="Materiais"
                                                                >
                                                                    <i className="fas fa-file-download" />
                                                                </button>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        onOpenForum?.({ id: lesson.id, title: lesson.title });
                                                                    }}
                                                                    className="p-1 px-2 rounded-md hover:bg-white/10 text-[8px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-500 transition-colors"
                                                                    title="Fórum"
                                                                >
                                                                    <i className="fas fa-comments" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                ))}
                                                {(!module.lessons || module.lessons.length === 0) && (
                                                    <div className="text-center py-6 text-slate-400 text-xs italic">Nenhuma aula neste módulo</div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* ACHIEVEMENTS TAB */}
                    {activeTab === 'achievements' && (
                        <div className="space-y-4 animate-in fade-in duration-300">
                            <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest flex items-center gap-2">
                                <i className="fas fa-trophy text-amber-500 text-xs" />
                                Conquistas
                            </h3>
                            <AchievementsList user={user} course={activeCourse} columns="2" />
                        </div>
                    )}
                </div>

                {/* RIGHT COLUMN (1/3) - Sidebar */}
                <div className="xl:col-span-1 space-y-4">

                    {/* Quick Stats Card */}
                    <div className="bg-white dark:bg-slate-900/60 border border-slate-200/60 dark:border-white/10 rounded-2xl p-5 shadow-sm space-y-4">
                        <h4 className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Progresso Geral</h4>

                        {/* Circular Progress */}
                        <div className="flex items-center justify-center py-2">
                            <div className="relative w-28 h-28">
                                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                                    <circle cx="18" cy="18" r="15.5" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-200 dark:text-slate-800" />
                                    <circle
                                        cx="18" cy="18" r="15.5" fill="none" stroke="currentColor" strokeWidth="2.5"
                                        strokeDasharray="97.4" strokeDashoffset={97.4 - (97.4 * overallProgress / 100)}
                                        strokeLinecap="round"
                                        className="text-indigo-500 transition-all duration-1000 ease-out"
                                    />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-2xl font-black text-slate-800 dark:text-white">{overallProgress}%</span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 text-center">
                                <div className="text-lg font-black text-slate-800 dark:text-white">{completedLessons}</div>
                                <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Concluídas</div>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 text-center">
                                <div className="text-lg font-black text-slate-800 dark:text-white">{totalLessons - completedLessons}</div>
                                <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Restantes</div>
                            </div>
                        </div>
                    </div>

                    {/* Instructor Card */}
                    {activeCourse.instructorName && (
                        <div className="bg-white dark:bg-slate-900/60 border border-slate-200/60 dark:border-white/10 rounded-2xl p-5 shadow-sm">
                            <h4 className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3">Instrutor</h4>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-teal-500 flex items-center justify-center text-white font-black text-sm shadow-lg">
                                    {activeCourse.instructorName.charAt(0).toUpperCase()}
                                </div>
                                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{activeCourse.instructorName}</span>
                            </div>
                        </div>
                    )}

                    {/* Course Details Card */}
                    {(activeCourse.language || activeCourse.level || activeCourse.estimatedHours) && (
                        <div className="bg-white dark:bg-slate-900/60 border border-slate-200/60 dark:border-white/10 rounded-2xl p-5 shadow-sm space-y-3">
                            <h4 className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">Detalhes</h4>
                            {activeCourse.estimatedHours && (
                                <div className="flex items-center gap-3 text-sm">
                                    <i className="fas fa-clock text-blue-500 w-4 text-center" />
                                    <span className="text-slate-600 dark:text-slate-300">{activeCourse.estimatedHours} horas de conteúdo</span>
                                </div>
                            )}
                            {activeCourse.level && (
                                <div className="flex items-center gap-3 text-sm">
                                    <i className="fas fa-signal text-emerald-500 w-4 text-center" />
                                    <span className="text-slate-600 dark:text-slate-300">{activeCourse.level}</span>
                                </div>
                            )}
                            {activeCourse.language && (
                                <div className="flex items-center gap-3 text-sm">
                                    <i className="fas fa-language text-amber-500 w-4 text-center" />
                                    <span className="text-slate-600 dark:text-slate-300">{activeCourse.language}</span>
                                </div>
                            )}
                            {activeCourse.teachingType && (
                                <div className="flex items-center gap-3 text-sm">
                                    <i className="fas fa-chalkboard-teacher text-purple-500 w-4 text-center" />
                                    <span className="text-slate-600 dark:text-slate-300">{activeCourse.teachingType}</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Achievements Preview (sidebar) */}
                    <div className="bg-white dark:bg-slate-900/60 border border-slate-200/60 dark:border-white/10 rounded-2xl p-5 shadow-sm">
                        <h4 className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3">Conquistas</h4>
                        <AchievementsList user={user} course={activeCourse} columns="1" />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CourseOverview;
