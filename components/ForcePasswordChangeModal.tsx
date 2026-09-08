import React, { useState } from 'react';
import { AuthService } from '../services/AuthService';
import { toast } from 'sonner';

type Props = {
    authService: AuthService;
    onSuccess: () => void;
};

const ForcePasswordChangeModal: React.FC<Props> = ({ authService, onSuccess }) => {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (newPassword.length < 6) {
            toast.error('A senha deve ter pelo menos 6 caracteres.');
            return;
        }

        if (newPassword !== confirmPassword) {
            toast.error('As senhas não coincidem.');
            return;
        }

        try {
            setLoading(true);
            await authService.completePasswordReset(newPassword);
            toast.success('Senha atualizada com sucesso!');
            onSuccess();
        } catch (error) {
            toast.error(`Erro ao atualizar senha: ${(error as Error).message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-300">

                {/* Header */}
                <div className="bg-amber-500 p-6 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                        <i className="fas fa-lock text-3xl text-white"></i>
                    </div>
                    <h2 className="text-2xl font-black text-white mb-2">
                        Troca de Senha Obrigatória
                    </h2>
                    <p className="text-sm text-white/90 font-medium">
                        Você está usando uma senha temporária. Por segurança, defina uma nova senha.
                    </p>
                </div>

                {/* Content */}
                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">
                                Nova Senha
                            </label>
                            <div className="relative">
                                <i className="fas fa-key absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={e => setNewPassword(e.target.value)}
                                    placeholder="Mínimo 6 caracteres"
                                    className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all font-bold"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">
                                Confirmar Nova Senha
                            </label>
                            <div className="relative">
                                <i className="fas fa-check-circle absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={e => setConfirmPassword(e.target.value)}
                                    placeholder="Repita a nova senha"
                                    className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all font-bold"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-lg shadow-lg shadow-amber-500/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <i className="fas fa-spinner fa-spin"></i> Atualizando...
                            </>
                        ) : (
                            <>
                                <i className="fas fa-save"></i> Salvar Nova Senha
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ForcePasswordChangeModal;
