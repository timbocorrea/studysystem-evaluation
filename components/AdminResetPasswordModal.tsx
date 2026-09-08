import React, { useState } from 'react';
import { AdminService } from '../services/AdminService';
import { toast } from 'sonner';

type Props = {
    user: { id: string; name: string; email: string };
    adminService: AdminService;
    onClose: () => void;
    onSuccess: () => void;
};

const AdminResetPasswordModal: React.FC<Props> = ({ user, adminService, onClose, onSuccess }) => {
    const [newPassword, setNewPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword.length < 6) {
            toast.error('A senha deve ter pelo menos 6 caracteres.');
            return;
        }

        try {
            setLoading(true);
            await adminService.resetUserPassword(user.id, newPassword);
            toast.success(`Senha de ${user.name} resetada com sucesso!`);
            onSuccess();
        } catch (error) {
            toast.error(`Erro ao resetar senha: ${(error as Error).message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                    <h3 className="text-xl font-black text-slate-800 dark:text-white">Resetar Senha</h3>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white flex items-center justify-center transition-colors"
                    >
                        <i className="fas fa-times"></i>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="flex items-center gap-4 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-2xl">
                        <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center text-lg">
                            <i className="fas fa-key"></i>
                        </div>
                        <div>
                            <p className="font-bold text-slate-800 dark:text-white text-sm">Definir Senha Temporária</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                O usuário {user.name} será obrigado a trocar esta senha no próximo login.
                            </p>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">
                            Nova Senha
                        </label>
                        <input
                            type="text"
                            value={newPassword}
                            onChange={e => setNewPassword(e.target.value)}
                            placeholder="Digite a nova senha..."
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-mono"
                            autoFocus
                        />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 rounded-xl font-bold text-sm bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading || newPassword.length < 6}
                            className="flex-1 py-3 rounded-xl font-bold text-sm bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? <i className="fas fa-spinner fa-spin"></i> : 'Confirmar Reset'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AdminResetPasswordModal;
