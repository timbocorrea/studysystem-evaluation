import React from 'react';
import { Course } from '@/domain/entities';
import { ShimmerButton } from '@/components/ui/shimmer-button';
import { InteractiveHoverButton } from '@/components/ui/interactive-hover-button';

import LazyImage from '@/components/ui/LazyImage';

interface CourseCardProps {
    course: Course;
    isEnrolled: boolean;
    progress?: number;
    onClick: () => void;
    onManage?: () => void;
    useInteractiveHoverButton?: boolean;
}

const CourseCard: React.FC<CourseCardProps> = ({
    course,
    isEnrolled,
    progress = 0,
    onClick,
    onManage,
    useInteractiveHoverButton = false
}) => {
    const totalModules = course.modules?.length || 0;
    const totalLessons = course.modules?.reduce((sum, mod) => sum + (mod.lessons?.length || 0), 0) || 0;

    return (
        <div
            className="group glass-card rounded-2xl overflow-hidden transition-all duration-300 cursor-pointer flex flex-col h-full relative hover:transform-none lg:hover:-translate-y-1 lg:hover:shadow-[0_0_30px_-5px_rgba(99,102,241,0.6)] lg:hover:border-indigo-500/80 lg:dark:hover:shadow-[0_0_30px_-5px_rgba(99,102,241,0.4)] lg:dark:hover:border-indigo-500/80"
            onClick={onClick}
        >
            {/* Course Image */}
            <div
                className="relative h-48 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-900 dark:to-slate-800 overflow-hidden flex-shrink-0"
            >
                {course.imageUrl ? (
                    <>
                        <LazyImage
                            src={course.imageUrl}
                            alt={course.title}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 opacity-90 group-hover:opacity-100"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80" />
                    </>
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-white/5">
                        <i className="fas fa-graduation-cap text-white/20 text-6xl"></i>
                    </div>
                )}

                {/* Enrolled Badge */}
                {isEnrolled && (
                    <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-emerald-300/70 text-[#002a15] border border-emerald-400/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.3)] flex items-center gap-1.5 font-bold text-xs z-10 backdrop-blur-xl">
                        <i className="fas fa-check-circle text-[#002a15]"></i>
                        <span>Inscrito</span>
                    </div>
                )}

            </div>

            {/* Course Content */}
            <div className="p-5 flex flex-col flex-1 relative">
                {/* Progress Bar Moved Here */}
                {isEnrolled && progress > 0 && (
                    <div className="mb-4">
                        <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 mb-1 font-bold uppercase tracking-wider">
                            <span>Progresso</span>
                            <span className="text-slate-700 dark:text-slate-300">{progress}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-200 dark:bg-white/5 rounded-full overflow-hidden">
                            <div
                                className="h-full transition-all duration-500 rounded-full"
                                style={{ 
                                    width: `${progress}%`, 
                                    backgroundColor: course.color || '#10b981',
                                    boxShadow: `0 0 10px ${(course.color || '#10b981')}66`
                                }}
                            ></div>
                        </div>
                    </div>
                )}
                <h3 className="text-lg font-black text-slate-800 dark:text-white mb-2 line-clamp-2 leading-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors drop-shadow-sm">
                    {course.title}
                </h3>

                <p className="text-xs text-slate-600 dark:text-slate-400 mb-4 line-clamp-2 h-8 flex-shrink-0 leading-relaxed font-medium">
                    {course.description || 'Sem descrição disponível.'}
                </p>

                {/* Stats */}
                <div className="flex items-center gap-4 mb-5 text-[11px] font-bold text-slate-600 dark:text-slate-500 uppercase tracking-wide mt-auto">
                    <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-white/5 px-2 py-1 rounded-md border border-slate-200 dark:border-white/5">
                        <i className="fas fa-layer-group text-slate-500 dark:text-slate-400"></i>
                        <span>{totalModules} {totalModules === 1 ? 'Módulo' : 'Módulos'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-white/5 px-2 py-1 rounded-md border border-slate-200 dark:border-white/5">
                        <i className="fas fa-play-circle text-slate-500 dark:text-slate-400"></i>
                        <span>{totalLessons} {totalLessons === 1 ? 'Aula' : 'Aulas'}</span>
                    </div>
                </div>

                {/* Action Button */}
                <div className="flex items-center gap-2 mt-auto pt-4 border-t border-slate-200 dark:border-white/5">
                    {useInteractiveHoverButton ? (
                        <div className="flex-1" onClick={(e) => { e.stopPropagation(); onClick(); }}>
                            <InteractiveHoverButton className={`w-full ${isEnrolled ? "bg-indigo-600 text-white" : ""}`}>
                                {isEnrolled ? "Continuar" : "Inscrever-se"}
                            </InteractiveHoverButton>
                        </div>
                    ) : (
                        <ShimmerButton
                            onClick={(e) => {
                                e.stopPropagation();
                                onClick();
                            }}
                            className="flex-1"
                        >
                            <span className="relative z-10 flex items-center justify-center gap-2 text-white font-bold text-xs uppercase tracking-wider">
                                {isEnrolled ? (
                                    <>
                                        <i className="fas fa-play"></i>
                                        Continuar
                                    </>
                                ) : (
                                    <>
                                        <i className="fas fa-plus"></i>
                                        Inscrever-se
                                    </>
                                )}
                            </span>
                        </ShimmerButton>
                    )}

                    {onManage && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onManage();
                            }}
                            className="px-4 py-3 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white border border-slate-300 dark:border-white/5 transition-colors"
                            title="Gerenciar curso"
                        >
                            <i className="fas fa-cog"></i>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CourseCard;
