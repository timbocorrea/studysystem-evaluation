import React, { useEffect, useState } from 'react';
import { XpLogRecord } from '../domain/admin';
import { AdminService } from '../services/AdminService';

interface AdminStudentHistoryProps {
    userId: string;
    adminService: AdminService;
}

export const AdminStudentHistory: React.FC<AdminStudentHistoryProps> = ({ userId, adminService }) => {
    const [history, setHistory] = useState<XpLogRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                setLoading(true);
                const data = await adminService.getXpHistory(userId);
                setHistory(data);
            } catch (err: any) {
                setError(err.message || 'Erro ao carregar histórico.');
            } finally {
                setLoading(false);
            }
        };

        if (userId) {
            fetchHistory();
        }
    }, [userId, adminService]);

    if (loading) return <div className="text-slate-400 dark:text-slate-500 text-sm py-4">Carregando histórico...</div>;
    if (error) return <div className="text-red-500 dark:text-red-400 text-sm py-4">{error}</div>;
    if (history.length === 0) return <div className="text-slate-400 dark:text-slate-500 text-sm italic py-4">Nenhum registro encontrado.</div>;

    return (
        <div className="mt-4">
            <h3 className="text-md font-black text-slate-800 dark:text-white mb-3">Histórico de Progressão</h3>
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 shadow-sm">
                <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800 text-left">
                    <thead className="bg-slate-50 dark:bg-slate-800/50">
                        <tr>
                            <th className="px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Data</th>
                            <th className="px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Ação</th>
                            <th className="px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">XP</th>
                            <th className="px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Descrição</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                        {history.map((log) => (
                            <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                                    {new Date(log.created_at).toLocaleString('pt-BR')}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-xs text-indigo-600 dark:text-cyan-400 font-black tracking-widest">
                                    {log.action_type}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-emerald-600 dark:text-emerald-400 font-bold">
                                    +{log.amount} XP
                                </td>
                                <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400 font-medium max-w-xs truncate" title={log.description ?? undefined}>
                                    {log.description}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
