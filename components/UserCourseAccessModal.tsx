import React, { useEffect, useState } from 'react';
import { AdminService } from '../services/AdminService';
import { ProfileRecord } from '../domain/admin';
import { Course } from '../domain/entities';
import { supabaseClient as supabase } from '../services/Dependencies';

interface Props {
    user: ProfileRecord;
    adminService: AdminService;
    onClose: () => void;
    onSuccess: () => void;
}

const UserCourseAccessModal: React.FC<Props> = ({ user, adminService, onClose, onSuccess }) => {
    const [courses, setCourses] = useState<Course[]>([]);
    const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
    const [selectedLessonIds, setSelectedLessonIds] = useState<string[]>([]);
    const [expandedCourseIds, setExpandedCourseIds] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const load = async () => {
            try {
                setLoading(true);
                const [allCourses, courseAssignments, instructorLessonAssignments] = await Promise.all([
                    adminService.listCoursesOutline(),
                    adminService.getUserCourseAssignments(user.id),
                    adminService.listInstructorLessonAssignments(user.id)
                ]);

                setCourses(allCourses);
                setSelectedCourseIds(courseAssignments);
                setSelectedLessonIds(instructorLessonAssignments);

                // Expand courses that have lesson assignments
                const coursesToExpand = allCourses
                    .filter(c => c.modules.some(m => m.lessons.some(l => instructorLessonAssignments.includes(l.id))))
                    .map(c => c.id);
                setExpandedCourseIds(coursesToExpand);
            } catch (err: any) {
                setError(`Erro ao carregar dados: ${err.message}`);
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [user.id, adminService]);

    const toggleCourse = (courseId: string) => {
        const isSelected = selectedCourseIds.includes(courseId);
        if (isSelected) {
            // Unselecting course: remove course and all its lessons
            setSelectedCourseIds(prev => prev.filter(id => id !== courseId));
            const course = courses.find(c => c.id === courseId);
            if (course) {
                const courseLessonIds = course.modules.flatMap(m => m.lessons.map(l => l.id));
                setSelectedLessonIds(prev => prev.filter(id => !courseLessonIds.includes(id)));
            }
        } else {
            // Selecting course: add course and all its lessons by default (convenience)
            setSelectedCourseIds(prev => [...prev, courseId]);
            const course = courses.find(c => c.id === courseId);
            if (course) {
                const courseLessonIds = course.modules.flatMap(m => m.lessons.map(l => l.id));
                setSelectedLessonIds(prev => Array.from(new Set([...prev, ...courseLessonIds])));
            }
        }
    };

    const toggleLesson = (lessonId: string, courseId: string) => {
        const isSelected = selectedLessonIds.includes(lessonId);
        if (isSelected) {
            setSelectedLessonIds(prev => prev.filter(id => id !== lessonId));
        } else {
            setSelectedLessonIds(prev => [...prev, lessonId]);
            // If selecting a lesson, ensure the course is selected too
            if (!selectedCourseIds.includes(courseId)) {
                setSelectedCourseIds(prev => [...prev, courseId]);
            }
        }
    };

    const toggleModuleLessons = (courseId: string, moduleId: string) => {
        const course = courses.find(c => c.id === courseId);
        const module = course?.modules.find(m => m.id === moduleId);
        if (!module) return;

        const allLessonIds = module.lessons.map(l => l.id);
        const allSelected = allLessonIds.every(id => selectedLessonIds.includes(id));

        if (allSelected) {
            setSelectedLessonIds(prev => prev.filter(id => !allLessonIds.includes(id)));
        } else {
            setSelectedLessonIds(prev => [...new Set([...prev, ...allLessonIds])]);
            if (!selectedCourseIds.includes(courseId)) {
                setSelectedCourseIds(prev => [...prev, courseId]);
            }
        }
    };

    const toggleCourseLessons = (courseId: string) => {
        const course = courses.find(c => c.id === courseId);
        if (!course) return;

        const allLessonIds = course.modules.flatMap(m => m.lessons).map(l => l.id);
        const allSelected = allLessonIds.every(id => selectedLessonIds.includes(id));

        if (allSelected) {
            setSelectedLessonIds(prev => prev.filter(id => !allLessonIds.includes(id)));
        } else {
            setSelectedLessonIds(prev => [...new Set([...prev, ...allLessonIds])]);
            if (!selectedCourseIds.includes(courseId)) {
                setSelectedCourseIds(prev => [...prev, courseId]);
            }
        }
    };

    const toggleExpand = (courseId: string) => {
        setExpandedCourseIds(prev =>
            prev.includes(courseId) ? prev.filter(id => id !== courseId) : [...prev, courseId]
        );
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            setError('');

            const currentUser = (await supabase.auth.getUser()).data.user;
            if (!currentUser) throw new Error("Você não está autenticado.");

            // 1. Save Course Assignments (Enrollments)
            const initialCourseAssignments = await adminService.getUserCourseAssignments(user.id);
            const coursesToAdd = selectedCourseIds.filter(id => !initialCourseAssignments.includes(id));
            const coursesToRemove = initialCourseAssignments.filter(id => !selectedCourseIds.includes(id));

            const coursePromises = [];
            if (coursesToAdd.length > 0) {
                coursePromises.push(adminService.assignCoursesToUser(user.id, coursesToAdd, currentUser.id));
            }
            coursesToRemove.forEach(id => {
                coursePromises.push(adminService.removeUserCourseAssignment(user.id, id));
            });

            // 2. Save Lesson Assignments (Granular Permissions)
            const initialLessonAssignments = await adminService.listInstructorLessonAssignments(user.id);
            const lessonsToAdd = selectedLessonIds.filter(id => !initialLessonAssignments.includes(id));
            const lessonsToRemove = initialLessonAssignments.filter(id => !selectedLessonIds.includes(id));

            const lessonPromises = [];
            if (lessonsToAdd.length > 0) {
                lessonPromises.push(adminService.assignLessonsToInstructor(user.id, lessonsToAdd));
            }
            lessonsToRemove.forEach(id => {
                lessonPromises.push(adminService.removeInstructorLessonAssignment(user.id, id));
            });

            await Promise.all([...coursePromises, ...lessonPromises]);

            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err?.message || 'Erro ao salvar alterações');
            setSaving(false);
        }
    };

    const filteredCourses = courses.filter(c =>
        c.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center md:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#0a0e14]/95 backdrop-blur-xl w-full max-w-2xl shadow-2xl overflow-hidden border border-white/10 flex flex-col max-h-[90vh] rounded-t-3xl md:rounded-3xl">
                <div className="md:hidden flex justify-center py-3">
                    <div className="w-12 h-1.5 bg-white/20 rounded-full" />
                </div>

                <div className="px-6 pb-4 md:p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
                    <div>
                        <h3 className="text-xl font-black text-white flex items-center gap-2">
                            <i className="fas fa-user-shield text-indigo-400"></i>
                            Controle de Edição (Granular)
                        </h3>
                        <p className="text-sm text-slate-400 mt-1">
                            Defina quais aulas o professor <strong>{user.name}</strong> pode editar.
                        </p>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-400 Transition flex items-center justify-center">
                        <i className="fas fa-times"></i>
                    </button>
                </div>

                <div className="p-4 border-b border-white/5">
                    <div className="relative group">
                        <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors"></i>
                        <input
                            type="text"
                            placeholder="Buscar cursos..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white focus:ring-2 focus:ring-indigo-500/50"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-black/20">
                    {loading ? (
                        <div className="text-center py-12 text-slate-500">
                            <i className="fas fa-spinner fa-spin text-3xl mb-4 text-indigo-500"></i>
                            <p className="font-medium animate-pulse">Mapeando estrutura dos cursos...</p>
                        </div>
                    ) : (
                        <>
                            {filteredCourses.map(course => {
                                const isCourseSelected = selectedCourseIds.includes(course.id);
                                const isExpanded = expandedCourseIds.includes(course.id);
                                const totalLessons = course.modules.flatMap(m => m.lessons).length;
                                const selectedLessonsInCourse = course.modules.flatMap(m => m.lessons).filter(l => selectedLessonIds.includes(l.id)).length;

                                return (
                                    <div key={course.id} className={`rounded-2xl border transition-all overflow-hidden ${isCourseSelected ? 'border-indigo-500/30 bg-indigo-500/5' : 'border-white/5 bg-white/5'}`}>
                                        <div className="flex items-center gap-3 p-4">
                                            <div 
                                                onClick={() => toggleCourse(course.id)}
                                                className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center cursor-pointer transition-all ${isCourseSelected ? 'bg-indigo-600 border-indigo-600 shadow-lg shadow-indigo-600/30' : 'border-white/20 hover:border-white/40'}`}
                                            >
                                                {isCourseSelected && <i className="fas fa-check text-[10px] text-white"></i>}
                                            </div>
                                            
                                            <div className="flex-1 min-w-0" onClick={() => toggleExpand(course.id)}>
                                                <h4 className="font-bold text-slate-100 truncate">{course.title}</h4>
                                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mt-0.5">
                                                    {selectedLessonsInCourse} de {totalLessons} aulas liberadas
                                                </p>
                                            </div>

                                            <button 
                                                onClick={() => toggleExpand(course.id)}
                                                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${isExpanded ? 'bg-white/10 text-white rotate-180' : 'text-slate-500 hover:text-slate-300'}`}
                                            >
                                                <i className="fas fa-chevron-down text-xs"></i>
                                            </button>
                                        </div>

                                        {isExpanded && (
                                            <div className="px-4 pb-4 space-y-4 animate-in slide-in-from-top-2 duration-300">
                                                <div className="flex justify-start px-2">
                                                    <button 
                                                        onClick={() => toggleCourseLessons(course.id)}
                                                        className="text-[10px] font-black text-indigo-400 uppercase tracking-widest hover:text-indigo-300 flex items-center gap-1.5"
                                                    >
                                                        <i className="fas fa-tasks"></i>
                                                        {(course.modules.flatMap(m=>m.lessons).every(l=>selectedLessonIds.includes(l.id))) ? 'Desmarcar Todas as Aulas' : 'Liberar Todas as Aulas'}
                                                    </button>
                                                </div>

                                                {course.modules.length === 0 ? (
                                                    <p className="text-xs text-slate-500 italic px-4">Este curso não possui módulos.</p>
                                                ) : (
                                                    course.modules.sort((a,b) => a.position - b.position).map(module => (
                                                        <div key={module.id} className="space-y-2 border-t border-white/5 pt-4 first:border-0 first:pt-0">
                                                            <div className="flex items-center justify-between px-2">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-1 h-3 bg-indigo-500/50 rounded-full"></div>
                                                                    <span className="text-[11px] font-black text-slate-300 uppercase tracking-widest">{module.title}</span>
                                                                </div>
                                                                <button 
                                                                    onClick={() => toggleModuleLessons(course.id, module.id)}
                                                                    className="text-[9px] font-black text-indigo-500/60 uppercase tracking-wider hover:text-indigo-400"
                                                                >
                                                                    {(module.lessons.every(l=>selectedLessonIds.includes(l.id))) ? 'Limpar Módulo' : 'Liberar Módulo'}
                                                                </button>
                                                            </div>
                                                            <div className="grid grid-cols-1 gap-1">
                                                                {module.lessons.sort((a,b) => a.position - b.position).map(lesson => {
                                                                    const isLessonSelected = selectedLessonIds.includes(lesson.id);
                                                                    return (
                                                                        <label 
                                                                            key={lesson.id} 
                                                                            className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${isLessonSelected ? 'bg-indigo-500/10 border-indigo-500/20' : 'bg-black/20 border-white/5 hover:bg-white/5'}`}
                                                                        >
                                                                            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${isLessonSelected ? 'bg-indigo-500 border-indigo-500' : 'border-white/20'}`}>
                                                                                {isLessonSelected && <i className="fas fa-check text-[8px] text-white"></i>}
                                                                            </div>
                                                                            <input 
                                                                                type="checkbox" 
                                                                                className="hidden" 
                                                                                checked={isLessonSelected}
                                                                                onChange={() => toggleLesson(lesson.id, course.id)}
                                                                            />
                                                                            <span className="text-xs text-slate-300 font-medium">{lesson.title}</span>
                                                                        </label>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                            {filteredCourses.length === 0 && (
                                <div className="text-center py-12">
                                    <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/10">
                                        <i className="fas fa-search text-2xl text-slate-600"></i>
                                    </div>
                                    <p className="text-slate-500 font-bold">Nenhum curso encontrado.</p>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {error && (
                    <div className="px-6 py-3 bg-red-500/10 border-t border-red-500/20 text-red-400 text-xs font-bold text-center flex items-center justify-center gap-2">
                        <i className="fas fa-exclamation-triangle"></i>
                        {error}
                    </div>
                )}

                <div className="p-6 border-t border-white/5 bg-white/5 flex justify-end gap-3">
                    <button onClick={onClose} className="px-6 py-2.5 rounded-xl text-slate-400 hover:bg-white/10 font-bold text-sm transition-colors">
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving || loading}
                        className="px-8 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50 flex items-center gap-2 active:scale-95"
                    >
                        {saving ? <><i className="fas fa-circle-notch animate-spin"></i> Salvando...</> : 'Confirmar Acessos'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UserCourseAccessModal;
