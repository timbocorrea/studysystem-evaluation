import React from 'react';
import { ProfileRecord } from '../../../../../domain/admin';

interface UserOverviewTabProps {
    user: ProfileRecord;
}

export const UserOverviewTab: React.FC<UserOverviewTabProps> = ({ user }) => {
    const formatDate = (dateString: string | undefined) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Nível de Acesso */}
            <div className="bg-slate-50 dark:bg-black/20 p-4 rounded-xl border border-slate-100 dark:border-white/5">
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">
                    Nível de Acesso
                </p>
                <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-lg text-sm font-black border ${
                        user.role === 'MASTER'
                            ? 'bg-purple-50 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-500/30'
                            : user.role === 'INSTRUCTOR'
                                ? 'bg-cyan-50 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-500/30'
                                : 'bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-500/30'
                        }`}>
                        {user.role === 'MASTER' ? '👑 Master' : user.role === 'INSTRUCTOR' ? '👨‍🏫 Professor' : '👨‍🎓 Aluno'}
                    </span>
                </div>
            </div>

            {/* XP e Nível */}
            <div className="bg-slate-50 dark:bg-black/20 p-4 rounded-xl border border-slate-100 dark:border-white/5">
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">
                    Progresso
                </p>
                <div className="flex items-center gap-4">
                    <div>
                        <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400">LVL {user.current_level || 1}</p>
                    </div>
                    <div>
                        <p className="text-sm text-slate-600 dark:text-slate-300">
                            <span className="font-bold text-slate-800 dark:text-white">{(user.xp_total || 0).toLocaleString()}</span> XP
                        </p>
                    </div>
                </div>
            </div>

            {/* Último Acesso */}
            <div className="bg-slate-50 dark:bg-black/20 p-4 rounded-xl border border-slate-100 dark:border-white/5">
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">
                    <i className="fas fa-clock mr-1"></i> Último Acesso
                </p>
                <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                    {formatDate((user as any).updated_at)}
                </p>
            </div>

            {/* Data de Aprovação */}
            <div className="bg-slate-50 dark:bg-black/20 p-4 rounded-xl border border-slate-100 dark:border-white/5">
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">
                    <i className="fas fa-check-circle mr-1"></i> Data de Aprovação
                </p>
                <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                    {formatDate((user as any).approved_at)}
                </p>
            </div>
        </div>
    );
};
