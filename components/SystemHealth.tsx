import React, { useEffect, useState } from 'react';
import { AdminService } from '../services/AdminService';
import { SystemStats } from '../domain/admin';

interface SystemHealthProps {
    adminService: AdminService;
}

export const SystemHealth: React.FC<SystemHealthProps> = ({ adminService }) => {
    const [stats, setStats] = useState<SystemStats | null>(null);
    const [usage, setUsage] = useState<{ egress_bytes: number; storage_bytes: number; db_size_bytes: number; is_mock: boolean } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        try {
            setLoading(true);
            const [data, usageData] = await Promise.all([
                adminService.getSystemStats(),
                adminService.getNetworkUsage()
            ]);
            console.log('SystemHealth received system stats:', data); // Debug log
            console.log('SystemHealth received network usage:', usageData); // Debug log
            setStats(data);
            setUsage(usageData);
        } catch (err: any) {
            setError(err.message || 'Erro ao carregar estatísticas do sistema');
        } finally {
            setLoading(false);
        }
    };

    const formatBytes = (bytes: number | undefined | null) => {
        if (bytes === undefined || bytes === null || isNaN(bytes) || bytes < 0) return '0 B';
        if (bytes === 0) return '0 B';
        // Handle explicit string case if needed, though types say number
        // @ts-ignore
        if (typeof bytes === 'string') return bytes;

        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    if (loading) return (
        <div className="flex justify-center items-center h-64 text-slate-500">
            <i className="fas fa-spinner fa-spin text-3xl mr-3"></i>
            <span className="text-lg">Verificando saúde do sistema...</span>
        </div>
    );

    if (error) return (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-6 rounded-xl text-center">
            <i className="fas fa-exclamation-triangle text-3xl mb-2"></i>
            <p>{error}</p>
            <button onClick={loadStats} className="mt-4 px-4 py-2 bg-red-100 hover:bg-red-200 dark:bg-red-800 dark:hover:bg-red-700 rounded-lg transition-colors">
                Tentar Novamente
            </button>
        </div>
    );

    const getDashboardUrl = () => {
        const url = import.meta.env.VITE_SUPABASE_URL;
        if (!url) return 'https://supabase.com/dashboard';
        try {
            const projectRef = url.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
            if (projectRef) {
                return `https://supabase.com/dashboard/project/${projectRef}/settings/billing/usage`;
            }
        } catch (e) {
            console.error('Error parsing Supabase URL', e);
        }
        return 'https://supabase.com/dashboard';
    };

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 dark:text-white mb-2">
                        Saúde do Sistema
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400">
                        Métricas de uso e limites da plataforma
                    </p>
                </div>
                <a
                    href={getDashboardUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
                >
                    <i className="fas fa-external-link-alt"></i>
                    <span>Ver Painel Supabase</span>
                </a>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {/* Database Size */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <i className="fas fa-database text-6xl text-indigo-500"></i>
                    </div>
                    <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                        Banco de Dados
                    </h3>
                    <p className="text-4xl font-black text-slate-800 dark:text-white mb-1">
                        {stats?.db_size || 'N/A'}
                    </p>
                    <p className="text-xs text-green-600 dark:text-green-400 font-medium flex items-center">
                        <i className="fas fa-check-circle mr-1"></i> Operacional
                    </p>
                    <p className="text-xs text-green-600 dark:text-green-400 font-medium flex items-center">
                        <i className="fas fa-check-circle mr-1"></i> Operacional
                    </p>
                </div>

                {/* Egress Usage (New) */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <i className="fas fa-network-wired text-6xl text-emerald-500"></i>
                    </div>
                    <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                        Saída de Rede (Egress)
                    </h3>
                    <div className="text-4xl font-black text-slate-800 dark:text-white mb-1">
                        {usage?.egress_bytes === -1 ? (
                            <span className="text-lg text-gray-500">Ver Dashboard</span>
                        ) : (
                            formatBytes(usage?.egress_bytes || 0)
                        )}
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 mt-2 mb-1">
                        <div
                            className={`h-2.5 rounded-full ${(usage?.egress_bytes || 0) > 4 * 1024 * 1024 * 1024 ? 'bg-red-500' :
                                (usage?.egress_bytes || 0) > 2.5 * 1024 * 1024 * 1024 ? 'bg-yellow-500' : 'bg-emerald-500'
                                }`}
                            style={{ width: `${Math.min(100, ((usage?.egress_bytes || 0) / (5 * 1024 * 1024 * 1024)) * 100)}%` }}
                        ></div>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 flex justify-between">
                        {usage?.egress_bytes === -1 ? (
                            <span>Métrica via API indisponível</span>
                        ) : (
                            <span>{((usage?.egress_bytes || 0) / (5 * 1024 * 1024 * 1024) * 100).toFixed(1)}% do limite Free (5GB)</span>
                        )}
                        {usage?.is_mock && <span className="text-amber-500 font-bold">(Simulado)</span>}
                    </p>
                </div >

                {/* Storage Size */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <i className="fas fa-hdd text-6xl text-blue-500"></i>
                    </div>
                    <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                        Armazenamento de Arquivos
                    </h3>
                    <p className="text-4xl font-black text-slate-800 dark:text-white mb-1">
                        {formatBytes(stats?.storage_size_bytes)}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-500">
                        {stats?.file_count} arquivos totais
                    </p>
                </div>

                {/* Users Count */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <i className="fas fa-users text-6xl text-cyan-500"></i>
                    </div>
                    <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                        Usuários Totais
                    </h3>
                    <p className="text-4xl font-black text-slate-800 dark:text-white mb-1">
                        {stats?.user_count}
                    </p>
                    <p className="text-xs text-cyan-600 dark:text-cyan-400 font-medium">
                        Alunos e Instrutores
                    </p>
                </div>
            </div>

            {/* Content Stats Table */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                    <h3 className="font-bold text-slate-800 dark:text-white">
                        Conteúdo da Plataforma
                    </h3>
                </div>
                <div className="p-6">
                    <div className="flex items-center justify-between py-4 border-b border-slate-100 dark:border-slate-800 last:border-0">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 flex items-center justify-center">
                                <i className="fas fa-graduation-cap"></i>
                            </div>
                            <div>
                                <p className="font-semibold text-slate-800 dark:text-white">Cursos</p>
                                <p className="text-xs text-slate-500">Cursos ativos na plataforma</p>
                            </div>
                        </div>
                        <span className="text-lg font-bold text-slate-800 dark:text-white">{stats?.course_count}</span>
                    </div>

                    <div className="flex items-center justify-between py-4 border-b border-slate-100 dark:border-slate-800 last:border-0">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                                <i className="fas fa-book-open"></i>
                            </div>
                            <div>
                                <p className="font-semibold text-slate-800 dark:text-white">Aulas</p>
                                <p className="text-xs text-slate-500">Total de aulas publicadas</p>
                            </div>
                        </div>
                        <span className="text-lg font-bold text-slate-800 dark:text-white">{stats?.lesson_count}</span>
                    </div>
                </div>
            </div >

            <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl flex items-start gap-3 text-blue-800 dark:text-blue-300">
                <i className="fas fa-info-circle mt-1"></i>
                <div className="text-sm">
                    <p className="font-bold mb-1">Nota sobre Limites do Supabase (Plano Free)</p>
                    <ul className="list-disc ml-4 space-y-1">
                        <li>Banco de Dados: 500MB</li>
                        <li>Armazenamento: 1GB</li>
                        <li>Tráfego de Saída: 5GB/mês (verifique no painel oficial)</li>
                    </ul>
                    <p className="mt-2 text-xs opacity-75">
                        Métricas de rede (Tráfego/Egress) e Auth não são acessíveis via SQL. Utilize o botão acima para acessar o relatório oficial no Supabase.
                    </p>
                </div>
            </div>
        </div >
    );
};
