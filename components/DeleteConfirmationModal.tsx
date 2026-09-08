import React, { useState } from 'react';
import { hapticActions } from '../utils/haptics';

interface DeleteConfirmationModalProps {
    userCount: number;
    onConfirm: () => void;
    onCancel: () => void;
}

const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({ userCount, onConfirm, onCancel }) => {
    const [confirmationText, setConfirmationText] = useState('');
    const [step, setStep] = useState<1 | 2>(1);
    const requiredText = 'CONFIRMAR EXCLUSÃO';

    const handleFirstConfirmation = () => {
        hapticActions.warning();
        setStep(2);
    };

    const handleFinalConfirmation = () => {
        if (confirmationText === requiredText) {
            onConfirm();
        }
    };

    const isValid = confirmationText === requiredText;

    return (
        <div
            className="fixed inset-0 z-50 flex items-end md:items-center justify-center md:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-modal-title"
            aria-describedby="delete-modal-description"
        >
            <div className="bg-[#0a0e14]/95 backdrop-blur-xl w-full max-w-lg shadow-2xl overflow-hidden border-2 border-red-500/50 rounded-t-3xl md:rounded-3xl max-h-[90vh] overflow-y-auto">
                {/* Drag Handle - Mobile Only */}
                <div className="md:hidden flex justify-center py-3 bg-gradient-to-r from-red-600/20 to-orange-600/20">
                    <div className="w-12 h-1.5 bg-white/20 rounded-full" />
                </div>

                {/* Header */}
                <div className="px-6 pb-4 md:p-6 bg-gradient-to-r from-red-600/20 to-orange-600/20 text-white relative overflow-hidden">
                    <div className="absolute inset-0 bg-red-500/10"></div>
                    <div className="relative z-10 flex items-center gap-3">
                        <div className="w-14 h-14 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center backdrop-blur-sm shadow-[0_0_20px_rgba(239,68,68,0.3)]">
                            <i className="fas fa-exclamation-triangle text-2xl text-red-400"></i>
                        </div>
                        <div>
                            <h3 className="text-xl font-black">⚠️ CONFIRMAÇÃO DE EXCLUSÃO</h3>
                            <p className="text-sm text-red-300/80">Ação irreversível - Passo {step} de 2</p>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {step === 1 ? (
                        <>
                            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                                <p className="text-sm font-bold text-red-300 mb-2">
                                    ⚠️ ATENÇÃO: Esta ação é permanente e irreversível!
                                </p>
                                <p className="text-sm text-red-200/80">
                                    Você está prestes a <strong>EXCLUIR {userCount} usuário(s)</strong> do sistema.
                                    Todos os dados, progresso, certificados e histórico serão permanentemente removidos.
                                </p>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-start gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
                                    <i className="fas fa-ban text-red-400 mt-1"></i>
                                    <div>
                                        <p className="text-sm font-bold text-white">Dados Perdidos</p>
                                        <p className="text-xs text-slate-400">
                                            Todo o progresso, XP, conquistas e histórico de aprendizado
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
                                    <i className="fas fa-user-times text-red-400 mt-1"></i>
                                    <div>
                                        <p className="text-sm font-bold text-white">Conta Removida</p>
                                        <p className="text-xs text-slate-400">
                                            O usuário não poderá mais fazer login
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
                                    <i className="fas fa-database text-red-400 mt-1"></i>
                                    <div>
                                        <p className="text-sm font-bold text-white">Sem Recuperação</p>
                                        <p className="text-xs text-slate-400">
                                            Não é possível desfazer esta ação
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                                <p className="text-xs text-amber-300">
                                    💡 <strong>Alternativa recomendada:</strong> Considere usar a função "Bloquear" ao invés de excluir.
                                    O bloqueio impede o acesso mas preserva os dados para consulta futura.
                                </p>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                                <p className="text-sm font-bold text-red-300 mb-3">
                                    🔒 Confirmação Final Necessária
                                </p>
                                <p className="text-sm text-red-200/80 mb-4">
                                    Para confirmar a exclusão de <strong>{userCount} usuário(s)</strong>,
                                    digite exatamente o texto abaixo:
                                </p>
                                <div className="bg-black/60 p-3 rounded-lg mb-4 border border-white/10">
                                    <code className="text-red-400 font-mono text-sm font-bold">{requiredText}</code>
                                </div>
                                <input
                                    type="text"
                                    value={confirmationText}
                                    onChange={e => setConfirmationText(e.target.value)}
                                    placeholder="Digite o texto de confirmação..."
                                    className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-sm font-mono text-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 transition-all placeholder:text-slate-600"
                                    autoFocus
                                />
                                {confirmationText && !isValid && (
                                    <p className="text-xs text-red-400 mt-2 flex items-center gap-1">
                                        <i className="fas fa-times-circle"></i>
                                        Texto incorreto. Digite exatamente como mostrado acima.
                                    </p>
                                )}
                                {isValid && (
                                    <p className="text-xs text-emerald-400 mt-2 flex items-center gap-1">
                                        <i className="fas fa-check-circle"></i>
                                        Texto correto. Você pode prosseguir.
                                    </p>
                                )}
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-white/5 bg-white/5">
                    <div className="flex gap-3">
                        <button
                            onClick={onCancel}
                            className="flex-1 py-3 rounded-xl border border-white/10 text-slate-400 font-bold text-sm hover:bg-white/5 hover:text-white transition-colors"
                        >
                            <i className="fas fa-arrow-left mr-2"></i>
                            Cancelar e Voltar
                        </button>
                        {step === 1 ? (
                            <button
                                onClick={handleFirstConfirmation}
                                className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold text-sm hover:bg-red-500 shadow-lg shadow-red-600/30 transition-all flex items-center justify-center gap-2 border border-red-400/20"
                            >
                                <i className="fas fa-arrow-right"></i>
                                Continuar (Passo 1/2)
                            </button>
                        ) : (
                            <button
                                onClick={() => {
                                    hapticActions.error();
                                    handleFinalConfirmation();
                                }}
                                disabled={!isValid}
                                className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold text-sm hover:bg-red-500 shadow-lg shadow-red-600/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 border border-red-400/20 active:scale-95"
                            >
                                <i className="fas fa-trash-alt"></i>
                                EXCLUIR PERMANENTEMENTE
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DeleteConfirmationModal;
