import React, { useEffect, useState } from 'react';
import { AdminService } from '@/services/AdminService';
import { toast } from 'sonner';
import { ProfileRecord, CourseRecord } from '@/domain/admin';
import { AdminStudentHistory } from '@/components/AdminStudentHistory';
import { UserAuditHistory } from '@/components/UserAuditHistory';
import { UserOverviewTab } from '@/components/features/admin/users/tabs/UserOverviewTab';
import { UserCoursesTab } from '@/components/features/admin/users/tabs/UserCoursesTab';

interface UserDetailsModalProps {
    user: ProfileRecord;
    adminService: AdminService;
    adminId: string;
    onClose: () => void;
    onRefresh: () => void;
    onApprove: (user: ProfileRecord) => void;
    onReject: (user: ProfileRecord) => void;
    onManageAccess?: (user: ProfileRecord) => void;
}

const UserDetailsModal: React.FC<UserDetailsModalProps> = ({ user, adminService, adminId, onClose, onRefresh, onApprove, onReject, onManageAccess }) => {
    const [activeTab, setActiveTab] = useState<'overview' | 'progress' | 'audit'>('overview');
    const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
    const [msgTitle, setMsgTitle] = useState('Aviso do Professor');
    const [msgBody, setMsgBody] = useState('');
    const [isSending, setIsSending] = useState(false);

    const handleSendMessage = async () => {
        if (!msgBody.trim()) {
            toast.error('A mensagem não pode estar vazia');
            return;
        }

        try {
            setIsSending(true);
            await adminService.sendNotification(
                user.id,
                adminId,
                msgTitle,
                msgBody,
                'direct_message'
            );
            toast.success('Mensagem enviada com sucesso!');
            setIsMessageModalOpen(false);
            setMsgBody('');
        } catch (error) {
            console.error('Error sending notification:', error);
            toast.error('Erro ao enviar mensagem.');
        } finally {
            setIsSending(false);
        }
    };

    const getStatusBadge = () => {
        const status = (user as any).approval_status || 'approved';

        if (status === 'pending') {
            return <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-bold">⏳ Pendente</span>;
        } else if (status === 'approved') {
            return <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold">✓ Aprovado</span>;
        } else if (status === 'rejected') {
            return <span className="px-3 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-bold">✕ Rejeitado</span>;
        }
        return null;
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-end md:items-center justify-center md:p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
            role="dialog"
            aria-modal="true"
            aria-labelledby="user-details-modal-title"
        >
            <div className="bg-white dark:bg-slate-900 w-full max-w-4xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 max-h-[90vh] flex flex-col rounded-t-3xl md:rounded-3xl">
                {/* Drag Handle - Mobile Only */}
                <div className="md:hidden flex justify-center py-3 bg-gradient-to-r from-indigo-500/10 to-cyan-500/10">
                    <div className="w-12 h-1.5 bg-white/20 rounded-full" />
                </div>

                {/* Header */}
                <div className="px-6 pt-6 pb-0 md:pt-6 md:px-6 border-b border-slate-100 dark:border-white/5 bg-gradient-to-r from-indigo-500/5 to-cyan-500/5 relative overflow-hidden">
                    <div className="absolute inset-0 bg-indigo-500/5"></div>
                    <div className="relative z-10 flex justify-between items-start mb-6">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-center text-2xl font-black shadow-sm">
                                {(user.name || user.email).charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-slate-800 dark:text-white">{user.name || 'Sem nome'}</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400">{user.email}</p>
                                <div className="mt-2">{getStatusBadge()}</div>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white flex items-center justify-center transition-colors active:scale-95"
                        >
                            <i className="fas fa-times text-lg"></i>
                        </button>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-6 relative z-10">
                        <button
                            onClick={() => setActiveTab('overview')}
                            className={`pb-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'overview' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                        >
                            <i className="fas fa-id-card mr-2"></i>Visão Geral
                        </button>
                        <button
                            onClick={() => setActiveTab('progress')}
                            className={`pb-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'progress' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                        >
                            <i className="fas fa-chart-line mr-2"></i>Progresso (XP)
                        </button>
                        <button
                            onClick={() => setActiveTab('audit')}
                            className={`pb-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'audit' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                        >
                            <i className="fas fa-history mr-2"></i>Auditoria
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-0">
                    {/* OVERVIEW TAB */}
                    {activeTab === 'overview' && (
                        <div className="p-6">
                            <UserOverviewTab user={user} />
                            <UserCoursesTab userId={user.id} adminService={adminService} onRefresh={onRefresh} />
                        </div>
                    )}

                    {/* PROGRESS (XP) HISTORY TAB */}
                    {activeTab === 'progress' && (
                        <div className="p-6">
                            <div className="bg-white dark:bg-black/20 border border-slate-200 dark:border-white/5 rounded-2xl overflow-hidden">
                                <div className="p-4 bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/5">
                                    <h4 className="font-black text-slate-800 dark:text-white flex items-center gap-2">
                                        <i className="fas fa-chart-line text-indigo-400"></i>
                                        Histórico de Progressão de XP
                                    </h4>
                                </div>
                                <div className="p-4">
                                    <AdminStudentHistory userId={user.id} adminService={adminService} />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* AUDIT HISTORY TAB */}
                    {activeTab === 'audit' && (
                        <div className="h-full">
                            <UserAuditHistory userId={user.id} />
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/5 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
                    <div className="flex flex-wrap gap-2 text-nowrap">
                        {(user as any).approval_status === 'approved' && (
                            <button
                                onClick={() => onReject(user)}
                                className="px-5 py-3 min-h-[44px] rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 font-bold text-sm hover:bg-red-500/20 transition-colors flex items-center justify-center gap-2 active:scale-95"
                            >
                                <i className="fas fa-ban"></i>
                                Bloquear
                            </button>
                        )}
                        {(user.role === 'INSTRUCTOR' || user.role === 'MASTER') && onManageAccess && (
                            <button
                                onClick={() => onManageAccess(user)}
                                className="px-5 py-3 min-h-[44px] rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-bold text-sm hover:bg-indigo-500/20 transition-colors flex items-center justify-center gap-2 active:scale-95"
                            >
                                <i className="fas fa-lock text-xs"></i>
                                Gerenciar Acesso
                            </button>
                        )}
                        <button
                            onClick={() => setIsMessageModalOpen(true)}
                            className="px-5 py-3 min-h-[44px] rounded-xl bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 font-bold text-sm hover:bg-slate-200 dark:hover:bg-white/20 transition-colors flex items-center justify-center gap-2 active:scale-95"
                        >
                            <i className="fas fa-paper-plane"></i>
                            Enviar Mensagem
                        </button>
                        {((user as any).approval_status === 'rejected' || (user as any).approval_status === 'pending') && (
                            <button
                                onClick={() => onApprove(user)}
                                className="px-5 py-3 min-h-[44px] rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-sm hover:bg-emerald-500/20 transition-colors flex items-center justify-center gap-2 active:scale-95"
                            >
                                <i className="fas fa-check-circle"></i>
                                {(user as any).approval_status === 'pending' ? 'Aprovar' : 'Desbloquear'}
                            </button>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="px-6 py-3 min-h-[44px] rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 font-bold text-sm transition-colors active:scale-95"
                    >
                        Fechar
                    </button>
                </div>

                {/* MODAL DE ENVIO DE MENSAGEM */}
                {isMessageModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-300">
                            <div className="p-6 border-b border-slate-100 dark:border-white/5 flex justify-between items-center">
                                <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Enviar Mensagem</h3>
                                <button onClick={() => setIsMessageModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                                    <i className="fas fa-times"></i>
                                </button>
                            </div>
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Assunto</label>
                                    <input 
                                        type="text" 
                                        value={msgTitle}
                                        onChange={e => setMsgTitle(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Mensagem</label>
                                    <textarea 
                                        value={msgBody}
                                        onChange={e => setMsgBody(e.target.value)}
                                        rows={4}
                                        placeholder="Digite sua mensagem para o aluno..."
                                        className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all resize-none"
                                    />
                                </div>
                            </div>
                            <div className="p-6 bg-slate-50 dark:bg-white/5 flex gap-3">
                                <button 
                                    onClick={() => setIsMessageModalOpen(false)}
                                    className="flex-1 px-4 py-3 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold transition-all"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    onClick={handleSendMessage}
                                    disabled={isSending}
                                    className="flex-1 px-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black shadow-lg shadow-indigo-600/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isSending ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-paper-plane"></i>}
                                    Enviar Agora
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div >
    );
};
export default UserDetailsModal;
