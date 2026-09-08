import React from 'react';
interface PendingApprovalScreenProps {
    userEmail: string;
    onLogout: () => void;
}

const PendingApprovalScreen: React.FC<PendingApprovalScreenProps> = ({ userEmail, onLogout }) => {
    return (
        <div className="h-screen flex items-center justify-center bg-[#050810] px-4 overflow-hidden relative">
            {/* Dynamic Background */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-[120px] mix-blend-screen animate-pulse-slow"></div>
                <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-orange-500/10 rounded-full blur-[120px] mix-blend-screen animate-pulse-slow delay-1000"></div>
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03]"></div>
            </div>

            <div
                className="w-full max-w-md relative z-10"
            >
                <div className="text-center mb-8">
                    <div
                        className="w-20 h-20 bg-gradient-to-tr from-amber-500 to-orange-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-orange-500/20 hover:scale-110 hover:rotate-12 transition-transform duration-300"
                    >
                        <i className="fas fa-clock text-white text-3xl drop-shadow-md"></i>
                    </div>
                    <h1 className="text-3xl font-extrabold text-white tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                        Aguardando Aprovação
                    </h1>
                    <p className="text-slate-400 mt-2 text-base font-medium">Sua conta foi criada com sucesso!</p>
                </div>

                <div className="bg-slate-900/40 backdrop-blur-2xl border border-white/5 p-8 rounded-[24px] shadow-2xl relative overflow-hidden">
                    {/* Subtle glassy border highlight */}
                    <div className="absolute inset-0 border border-white/5 rounded-[24px] pointer-events-none"></div>

                    <div className="space-y-6">
                        <div className="text-center">
                            <p className="text-slate-400 text-sm leading-relaxed">
                                No momento, sua conta está aguardando revisão de um administrador.
                                Você receberá um e-mail assim que seu acesso for liberado.
                            </p>
                        </div>

                        {/* Info do usuário */}
                        <div className="bg-slate-950/50 rounded-xl p-4 border border-slate-700/50 flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0 border border-amber-500/30">
                                <i className="fas fa-user-clock text-amber-500"></i>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
                                    Status Pendente
                                </p>
                                <p className="text-sm font-bold text-slate-200 truncate">
                                    {userEmail}
                                </p>
                            </div>
                        </div>

                        {/* Informações adicionais */}
                        <div className="space-y-3 pt-2">
                            <div className="flex items-start gap-3 bg-slate-800/20 p-3 rounded-lg border border-slate-800/50">
                                <i className="fas fa-hourglass-half text-indigo-400 mt-0.5 text-sm"></i>
                                <p className="text-xs text-slate-400 leading-relaxed">
                                    <strong className="text-slate-300 block mb-0.5">Prazo de Análise</strong>
                                    Geralmente processamos aprovações em até 24 horas úteis.
                                </p>
                            </div>
                            <div className="flex items-start gap-3 bg-slate-800/20 p-3 rounded-lg border border-slate-800/50">
                                <i className="fas fa-envelope-open-text text-indigo-400 mt-0.5 text-sm"></i>
                                <p className="text-xs text-slate-400 leading-relaxed">
                                    <strong className="text-slate-300 block mb-0.5">Fique Atento</strong>
                                    Verifique sua caixa de entrada e spam para notificações.
                                </p>
                            </div>
                        </div>

                        {/* Botão de logout */}
                        <button
                            onClick={onLogout}
                            className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3.5 rounded-xl shadow-lg border border-slate-700 transition-all flex items-center justify-center gap-2 mt-4 text-sm group"
                        >
                            <i className="fas fa-sign-out-alt group-hover:-translate-x-1 transition-transform"></i>
                            Voltar para o Login
                        </button>
                    </div>
                </div>

                {/* Footer */}
                <p className="text-center mt-8 text-[11px] text-slate-600 font-medium">
                    Precisa de acesso imediato? <span className="text-slate-500 hover:text-slate-400 cursor-pointer transition-colors">Contate o suporte</span>
                </p>
            </div>
        </div>
    );
};

export default PendingApprovalScreen;
