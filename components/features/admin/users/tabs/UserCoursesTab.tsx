import React, { useState, useEffect } from 'react';
import { AdminService } from '../../../../../services/AdminService';
import { CourseRecord, ProfileRecord } from '../../../../../domain/admin';

interface UserCoursesTabProps {
    userId: string;
    adminService: AdminService;
    onRefresh: () => void;
}

export const UserCoursesTab: React.FC<UserCoursesTabProps> = ({ userId, adminService, onRefresh }) => {
    const [assignedCourses, setAssignedCourses] = useState<CourseRecord[]>([]);
    const [allCourses, setAllCourses] = useState<CourseRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isEditingCourses, setIsEditingCourses] = useState(false);
    const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
    const [saving, setSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const [user, setUser] = useState<ProfileRecord | null>(null);

    useEffect(() => {
        const load = async () => {
            const profiles = await adminService.listProfiles();
            const p = profiles.find(u => u.id === userId);
            if (p) setUser(p);
        };
        load();
        loadUserCourses();
    }, [userId]);

    const loadUserCourses = async () => {
        try {
            setLoading(true);
            setError('');

            const assignedIds = await adminService.getUserCourseAssignments(userId);
            setSelectedCourseIds(assignedIds);

            const courses = await adminService.listCourses();
            setAllCourses(courses);

            const assigned = courses.filter(c => assignedIds.includes(c.id));
            setAssignedCourses(assigned);
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveCourses = async () => {
        try {
            setSaving(true);
            setError('');

            const profiles = await adminService.listProfiles();
            const admin = profiles.find(p => p.role === 'INSTRUCTOR');
            if (!admin) throw new Error('Nenhum administrador encontrado');

            await adminService.assignCoursesToUser(userId, selectedCourseIds, admin.id);

            setIsEditingCourses(false);
            await loadUserCourses();
            onRefresh();
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setSaving(false);
        }
    };

    const toggleCourse = (courseId: string) => {
        setSelectedCourseIds(prev =>
            prev.includes(courseId)
                ? prev.filter(id => id !== courseId)
                : [...prev, courseId]
        );
    };

    const filteredCourses = allCourses.filter(course =>
        course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (course.description && course.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="bg-white dark:bg-black/20 border border-slate-200 dark:border-white/5 rounded-2xl overflow-hidden mt-4">
            {error && (
                <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm p-4 flex items-center gap-2">
                    <i className="fas fa-exclamation-circle"></i>
                    <span>{error}</span>
                </div>
            )}
            <div className="p-4 bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/5 flex justify-between items-center">
                <h4 className="font-black text-slate-800 dark:text-white flex items-center gap-2">
                    <i className="fas fa-graduation-cap text-indigo-600 dark:text-indigo-400"></i>
                    Cursos Atribuídos ({assignedCourses.length})
                </h4>
                {!isEditingCourses && (
                    <button
                        onClick={() => setIsEditingCourses(true)}
                        className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold transition-colors flex items-center gap-2 border border-indigo-400/20"
                    >
                        <i className="fas fa-edit"></i>
                        Editar Cursos
                    </button>
                )}
            </div>

            <div className="p-4">
                {loading ? (
                    <div className="text-center py-8 text-slate-500">
                        <i className="fas fa-circle-notch animate-spin text-2xl mb-2"></i>
                        <p className="text-sm">Carregando cursos...</p>
                    </div>
                ) : (
                    <>
                        {user?.role !== 'STUDENT' && (
                            <div className="mb-4 p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/10 flex items-start gap-3">
                                <i className="fas fa-info-circle text-indigo-400 mt-0.5"></i>
                                <div className="space-y-1">
                                    <p className="text-[11px] font-bold text-indigo-300 uppercase tracking-widest">Controles Granulares</p>
                                    <p className="text-xs text-slate-400 leading-relaxed">
                                        Para este cargo, recomendamos usar o botão <strong>Gerenciar Acesso</strong> na parte inferior dos detalhes para liberar módulos e aulas específicas.
                                    </p>
                                </div>
                            </div>
                        )}
                        {isEditingCourses ? (
                            // Modo de edição
                            <div className="space-y-3">
                                <div className="relative mb-4">
                                    <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-600"></i>
                                    <input
                                        type="text"
                                        placeholder="Buscar cursos..."
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                        className="w-full pl-12 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600"
                                    />
                                </div>
                                {filteredCourses.map(course => {
                                    const isSelected = selectedCourseIds.includes(course.id);
                                    return (
                                        <label
                                            key={course.id}
                                            className={`flex items-center gap-3 p-4 min-h-[52px] rounded-xl border cursor-pointer transition-all active:scale-[0.98] ${isSelected
                                                ? 'border-indigo-500/50 bg-indigo-50 dark:bg-indigo-500/10 shadow-sm'
                                                : 'border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-black/20 hover:bg-slate-100 dark:hover:bg-white/5 hover:border-indigo-500/30'
                                                }`}
                                        >
                                            <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors shrink-0 ${isSelected
                                                ? 'bg-indigo-600 dark:bg-indigo-500 border-indigo-600 dark:border-indigo-500 text-white'
                                                : 'border-slate-300 dark:border-white/20 bg-white dark:bg-black/40'
                                                }`}>
                                                {isSelected && <i className="fas fa-check text-xs"></i>}
                                            </div>
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => toggleCourse(course.id)}
                                                className="hidden"
                                            />
                                            <div className="flex-1">
                                                <p className="text-sm font-bold text-slate-800 dark:text-white">{course.title}</p>
                                                {course.description && (
                                                    <p className="text-xs text-slate-400">{course.description}</p>
                                                )}
                                            </div>
                                            {isSelected && (
                                                <i className="fas fa-check-circle text-indigo-400"></i>
                                            )}
                                        </label>
                                    );
                                })}
                            </div>
                        ) : assignedCourses.length === 0 ? (
                            <div className="text-center py-8 text-slate-500">
                                <i className="fas fa-inbox text-3xl mb-2"></i>
                                <p className="text-sm">Nenhum curso atribuído</p>
                            </div>
                        ) : (
                            // Modo de visualização
                            <div className="space-y-2">
                                {assignedCourses.map(course => (
                                    <div
                                        key={course.id}
                                        className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5"
                                    >
                                        <i className="fas fa-book text-indigo-400"></i>
                                        <div className="flex-1">
                                            <p className="text-sm font-bold text-slate-800 dark:text-white">{course.title}</p>
                                            {course.description && (
                                                <p className="text-xs text-slate-500 dark:text-slate-400">{course.description}</p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Botões de ação quando editando */}
            {isEditingCourses && (
                <div className="p-4 border-t border-white/5 flex gap-3">
                    <button
                        onClick={() => {
                            setIsEditingCourses(false);
                            loadUserCourses();
                        }}
                        disabled={saving}
                        className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 font-bold text-sm hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-800 dark:hover:text-white transition-colors disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSaveCourses}
                        disabled={saving}
                        className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 border border-indigo-400/20"
                    >
                        {saving && <i className="fas fa-circle-notch animate-spin"></i>}
                        <i className="fas fa-save"></i>
                        Salvar Alterações
                    </button>
                </div>
            )}
        </div>
    );
};
