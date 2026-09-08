import React from 'react';
import { Course } from '../domain/entities';

interface CourseEnrollmentModalProps {
    course: Course;
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    isLoading?: boolean;
}

const CourseEnrollmentModal: React.FC<CourseEnrollmentModalProps> = ({
    course,
    isOpen,
    onClose,
    onConfirm,
    isLoading = false
}) => {
    if (!isOpen) return null;

    const totalLessons = course.modules.reduce((sum, module) => sum + module.lessons.length, 0);
    const totalDuration = course.modules.reduce((sum, module) =>
        sum + module.lessons.reduce((lessonSum, lesson) => lessonSum + lesson.durationSeconds, 0), 0
    );

    const formatDuration = (seconds: number) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        if (hours > 0) return `${hours}h ${minutes}min`;
        return `${minutes}min`;
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            ></div>

            {/* Modal */}
            <div className="flex min-h-full items-center justify-center p-4">
                <div
                    className="relative bg-[#0a0e14]/90 backdrop-blur-xl rounded-3xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden transform transition-all border border-white/10"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="bg-gradient-to-br from-indigo-600 to-teal-600 p-6 text-white flex-shrink-0 relative overflow-hidden">
                        <div className="absolute inset-0 bg-black/10 backdrop-blur-[1px]"></div>
                        <div className="relative z-10">
                            <button
                                onClick={onClose}
                                className="absolute top-0 right-0 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                            >
                                <i className="fas fa-times text-sm"></i>
                            </button>

                            <div className="flex items-start gap-3">
                                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0 shadow-inner border border-white/10">
                                    <i className="fas fa-graduation-cap text-2xl"></i>
                                </div>
                                <div className="flex-1">
                                    <h2 className="text-xl font-black mb-1 drop-shadow-md">{course.title}</h2>
                                    <p className="text-indigo-100 text-xs leading-relaxed font-medium opacity-90">
                                        {course.description || 'Expanda seus conhecimentos com este curso completo!'}
                                    </p>
                                </div>
                            </div>

                            {/* Quick Stats */}
                            <div className="grid grid-cols-3 gap-3 mt-4">
                                <div className="bg-black/20 backdrop-blur-md rounded-lg p-2 text-center border border-white/10">
                                    <div className="text-lg font-black">{course.modules.length}</div>
                                    <div className="text-[10px] text-indigo-100/70 uppercase tracking-wider font-bold">Módulos</div>
                                </div>
                                <div className="bg-black/20 backdrop-blur-md rounded-lg p-2 text-center border border-white/10">
                                    <div className="text-lg font-black">{totalLessons}</div>
                                    <div className="text-[10px] text-indigo-100/70 uppercase tracking-wider font-bold">Aulas</div>
                                </div>
                                <div className="bg-black/20 backdrop-blur-md rounded-lg p-2 text-center border border-white/10">
                                    <div className="text-lg font-black">{formatDuration(totalDuration)}</div>
                                    <div className="text-[10px] text-indigo-100/70 uppercase tracking-wider font-bold">Duração</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Content - Scrollable */}
                    <div className="overflow-y-auto flex-1 min-h-0 p-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                        <h3 className="text-lg font-black text-white mb-3 flex items-center gap-2">
                            <i className="fas fa-list-ul text-indigo-400"></i>
                            Conteúdo Programático
                        </h3>

                        <div className="space-y-3">
                            {course.modules.map((module, moduleIndex) => (
                                <div
                                    key={module.id}
                                    className="border border-white/5 rounded-xl overflow-hidden bg-white/5"
                                >
                                    {/* Module Header */}
                                    <div className="bg-white/5 p-3 flex items-center gap-3">
                                        <div className="w-6 h-6 rounded-md bg-indigo-500 text-white flex items-center justify-center text-xs font-black shadow-lg shadow-indigo-500/20">
                                            {moduleIndex + 1}
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-bold text-sm text-slate-200 leading-tight">{module.title}</h4>
                                            <p className="text-[10px] text-slate-400 mt-0.5">
                                                {module.lessons.length} {module.lessons.length === 1 ? 'aula' : 'aulas'}
                                            </p>
                                        </div>
                                        <div className="text-[10px] font-bold text-slate-500">
                                            {formatDuration(module.lessons.reduce((sum, l) => sum + l.durationSeconds, 0))}
                                        </div>
                                    </div>

                                    {/* Lessons */}
                                    <div className="divide-y divide-white/5">
                                        {module.lessons.map((lesson, lessonIndex) => (
                                            <div
                                                key={lesson.id}
                                                className="p-3 hover:bg-white/5 transition-colors flex items-center gap-3"
                                            >
                                                <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[10px] text-slate-400">
                                                    {lessonIndex + 1}
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-xs font-medium text-slate-300 leading-tight">
                                                        {lesson.title}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2 text-[10px] text-slate-500">
                                                    {lesson.videoUrl && <i className="fas fa-video"></i>}
                                                    {lesson.audioUrl && <i className="fas fa-headphones"></i>}
                                                    <span>{formatDuration(lesson.durationSeconds)}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {course.modules.length === 0 && (
                            <div className="text-center py-6 text-slate-500">
                                <i className="fas fa-inbox text-3xl mb-2 opacity-30"></i>
                                <p className="text-sm">Conteúdo em desenvolvimento</p>
                            </div>
                        )}
                    </div>

                    {/* Footer - Actions */}
                    <div className="border-t border-white/10 p-4 bg-black/20 backdrop-blur-sm flex-shrink-0">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={onClose}
                                disabled={isLoading}
                                className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-sm font-bold hover:bg-white/10 transition-colors disabled:opacity-50"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={onConfirm}
                                disabled={isLoading}
                                className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-sm font-black uppercase tracking-wider shadow-lg shadow-emerald-500/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ring-1 ring-white/10"
                            >
                                {isLoading ? (
                                    <>
                                        <i className="fas fa-circle-notch animate-spin"></i>
                                        Inscrevendo...
                                    </>
                                ) : (
                                    <>
                                        <i className="fas fa-user-plus"></i>
                                        Confirmar
                                    </>
                                )}
                            </button>
                        </div>

                        <p className="text-center text-xs text-slate-500 mt-4">
                            <i className="fas fa-info-circle mr-1"></i>
                            Acesso vitalício após a inscrição
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CourseEnrollmentModal;
