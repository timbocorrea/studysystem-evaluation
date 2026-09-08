import React, { useState } from 'react';
import { AdminService } from '../services/AdminService';
import { hapticActions } from '../utils/haptics';

interface RejectUserModalProps {
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

const RejectUserModal: React.FC<RejectUserModalProps> = ({ user, adminId, adminService, onClose, onSuccess }) => {
    const [reason, setReason] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleReject = async () => {
        try {
            setSubmitting(true);
            setError('');

            await adminService.rejectUser(user.id, adminId, reason.trim() || undefined);

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
            aria-labelledby="reject-modal-title"
        >
            <div className="bg-white dark:bg-slate-900 w-full max-w-lg shadow-2xl overflow-hidden border border-red-200 dark:border-red-500/30 rounded-t-3xl md:rounded-3xl">
                {/* Drag Handle - Mobile Only */}
                <div className="md:hidden flex justify-center py-3">
                    <div className="w-12 h-1.5 bg-white/20 rounded-full" />
                </div>

                {/* Header */}
                <div className="px-6 pb-4 md:p-6 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-gradient-to-r from-red-500/5 to-orange-500/5 relative overflow-hidden">
                    <div className="absolute inset-0 bg-red-500/5"></div>
                    <div className="relative z-10">
                        <h3 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                            <i className="fas fa-user-times text-red-600 dark:text-red-400"></i>
                            Rejeitar Usuário
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            Confirme a rejeição de <strong className="text-red-600 dark:text-red-300">{user.name || user.email}</strong>
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
                        <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/30 flex items-center justify-center shadow-sm">
                            <i className="fas fa-user text-xl"></i>
                        </div>
                        <div>
                            <p className="font-bold text-slate-800 dark:text-white">{user.name || 'Sem nome'}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-xl flex items-center gap-2 backdrop-blur-md">
                            <i className="fas fa-exclamation-circle"></i>
                            <span>{error}</span>
                        </div>
                    )}

                    <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl p-4">
                        <div className="flex items-start gap-3">
                            <i className="fas fa-exclamation-triangle text-amber-600 dark:text-amber-400 mt-1"></i>
                            <div>
                                <p className="text-sm font-bold text-amber-800 dark:text-amber-200">Atenção!</p>
                                <p className="text-xs text-amber-700/80 dark:text-amber-300/80 mt-1">
                                    Este usuário não poderá acessar a plataforma. Essa ação pode ser revertida posteriormente.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">
                            Motivo da Rejeição (Opcional)
                        </label>
                        <textarea
                            value={reason}
                            onChange={e => setReason(e.target.value)}
                            placeholder="Ex: Informações incompletas, perfil não aprovado pela coordenação..."
                            rows={4}
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 resize-none placeholder:text-slate-400 dark:placeholder:text-slate-600 transition-all"
                        />
                        <p className="mt-2 text-[10px] text-slate-500">
                            O motivo será registrado internamente (não é enviado ao usuário por email).
                        </p>
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
                                hapticActions.warning();
                                handleReject();
                            }}
                            disabled={submitting}
                            className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold text-sm hover:bg-red-500 shadow-lg shadow-red-600/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 border border-red-400/20"
                        >
                            {submitting && <i className="fas fa-circle-notch animate-spin"></i>}
                            <i className="fas fa-ban"></i>
                            Confirmar Rejeição
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RejectUserModal;
