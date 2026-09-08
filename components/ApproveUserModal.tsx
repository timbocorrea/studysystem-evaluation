import React, { useEffect, useState } from 'react';
import { AdminService } from '../services/AdminService';
import { CourseRecord } from '../domain/admin';
import { hapticActions } from '../utils/haptics';

interface ApproveUserModalProps {
    user: {
        id: string;
        name: string;
        email: string;
    };
    adminId: string;
    adminService: AdminService;
    onClose: () => void;
    onSuccess: () => void;
}

const ApproveUserModal: React.FC<ApproveUserModalProps> = ({ user, adminId, adminService, onClose, onSuccess }) => {
    const [courses, setCourses] = useState<CourseRecord[]>([]);
    const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [instructions, setInstructions] = useState('');

    useEffect(() => {
        const loadCourses = async () => {
            try {
                setLoading(true);
                const courseList = await adminService.listCourses();
                setCourses(courseList);
            } catch (e) {
                setError((e as Error).message);
            } finally {
                setLoading(false);
            }
        };
        loadCourses();
    }, [adminService]);

    const toggleCourse = (courseId: string) => {
        setSelectedCourseIds(prev =>
            prev.includes(courseId)
                ? prev.filter(id => id !== courseId)
                : [...prev, courseId]
        );
    };

    const handleApprove = async () => {
        // Validação: pelo menos um curso deve ser selecionado
        if (selectedCourseIds.length === 0) {
            setError('Selecione pelo menos um curso para atribuir ao usuário.');
            return;
        }

        try {
            setSubmitting(true);
            setError('');

            // Aprovar usuário
            await adminService.approveUser(user.id, adminId);

            // Atribuir cursos
            await adminService.assignCoursesToUser(user.id, selectedCourseIds, adminId);

            // Preparar e abrir cliente de email
            const subject = encodeURIComponent("Acesso Aprovado - StudySystem");
            const body = encodeURIComponent(
                `Olá ${user.name},\n\n` +
                `Seu acesso à plataforma StudySystem foi aprovado!\n\n` +
                `${instructions}\n\n` +
                `Atenciosamente,\n` +
                `Equipe Administrativa`
            );

            window.open(`mailto:${user.email}?subject=${subject}&body=${body}`, '_blank');

            onSuccess();
            onClose();
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-end md:items-center justify-center md:p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
            role="dialog"
            aria-modal="true"
            aria-labelledby="approve-modal-title"
        >
            <div className="bg-white dark:bg-slate-900 w-full max-w-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 max-h-[90vh] flex flex-col rounded-t-3xl md:rounded-3xl">
                {/* Drag Handle - Mobile Only */}
                <div className="md:hidden flex justify-center py-3">
                    <div className="w-12 h-1.5 bg-white/20 rounded-full" />
                </div>

                {/* Header */}
                <div className="px-6 pb-4 md:p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-gradient-to-r from-emerald-500/5 to-teal-500/5 relative overflow-hidden">
                    <div className="absolute inset-0 bg-emerald-500/5 dark:bg-emerald-500/10"></div>
                    <div className="relative z-10">
                        <h3 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                            <i className="fas fa-user-check text-emerald-600 dark:text-emerald-400"></i>
                            Aprovar Usuário
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            Selecione os cursos e envie as instruções de acesso.
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="relative z-10 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
                    >
                        <i className="fas fa-times"></i>
                    </button>
                </div>

                {/* User Info */}
                <div className="px-6 py-4 bg-slate-50 dark:bg-white/5 border-b border-slate-100 dark:border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 flex items-center justify-center shadow-sm">
                            <i className="fas fa-user text-xl"></i>
                        </div>
                        <div>
                            <p className="font-bold text-slate-800 dark:text-white">{user.name || 'Sem nome'}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-xl flex items-center gap-2 backdrop-blur-md">
                            <i className="fas fa-exclamation-circle"></i>
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Email Instructions */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">
                            Instruções por Email (Opcional)
                        </label>
                        <textarea
                            value={instructions}
                            onChange={(e) => setInstructions(e.target.value)}
                            placeholder="Digite aqui as instruções que serão enviadas para o aluno..."
                            className="w-full h-24 p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 resize-none placeholder:text-slate-400 dark:placeholder:text-slate-600 transition-all"
                        />
                        <p className="text-[10px] text-slate-500 mt-1">
                            Este texto será inserido no corpo do email que será aberto no seu cliente padrão.
                        </p>
                    </div>

                    {/* Courses List */}
                    <div>
                        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3">
                            Atribuir Cursos ({selectedCourseIds.length} selecionados)
                        </p>

                        {loading ? (
                            <div className="text-center py-8 text-slate-500">
                                <i className="fas fa-circle-notch animate-spin text-2xl mb-2"></i>
                                <p className="text-sm">Carregando cursos...</p>
                            </div>
                        ) : courses.length === 0 ? (
                            <div className="text-center py-8 text-slate-500">
                                <i className="fas fa-inbox text-3xl mb-2"></i>
                                <p className="text-sm">Nenhum curso cadastrado</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {courses.map(course => (
                                    <label
                                        key={course.id}
                                        className={`flex items-center gap-3 p-4 min-h-[52px] rounded-xl border cursor-pointer transition-all active:scale-[0.98] ${selectedCourseIds.includes(course.id)
                                            ? 'border-emerald-500/50 bg-emerald-50 dark:bg-emerald-500/10 shadow-sm'
                                            : 'border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-black/20 hover:bg-slate-100 dark:hover:bg-white/5 hover:border-emerald-500/30'
                                            }`}
                                    >
                                        <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors shrink-0 ${selectedCourseIds.includes(course.id)
                                            ? 'bg-emerald-600 dark:bg-emerald-500 border-emerald-600 dark:border-emerald-500 text-white'
                                            : 'border-slate-300 dark:border-white/20 bg-white dark:bg-black/40'
                                            }`}>
                                            {selectedCourseIds.includes(course.id) && <i className="fas fa-check text-xs"></i>}
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={selectedCourseIds.includes(course.id)}
                                            onChange={() => toggleCourse(course.id)}
                                            className="hidden"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-slate-800 dark:text-white truncate">
                                                {course.title}
                                            </p>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer - Actions */}
                <div className="p-6 border-t border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/5">
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={submitting}
                            className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 font-bold text-sm hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-800 dark:hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                hapticActions.success();
                                handleApprove();
                            }}
                            disabled={submitting || loading || selectedCourseIds.length === 0}
                            className="flex-1 py-3 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-500 shadow-lg shadow-emerald-600/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 border border-emerald-400/20"
                        >
                            {submitting && <i className="fas fa-circle-notch animate-spin"></i>}
                            <i className="fas fa-envelope"></i>
                            Aprovar e Enviar Email
                        </button>
                    </div>
                </div>
            </div>
        </div >
    );
};

export default ApproveUserModal;
