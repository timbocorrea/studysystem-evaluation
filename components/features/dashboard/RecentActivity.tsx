import React, { useEffect, useState } from 'react';
import { auditService } from '@/services/AuditService';
import { User } from '@/domain/entities';
import Skeleton from '@/components/ui/Skeleton';

interface RecentActivityProps {
    user: User;
}

interface ActivityLog {
    id: string;
    path: string;
    page_title: string;
    resource_title?: string;
    created_at: string;
}

const RecentActivity: React.FC<RecentActivityProps> = ({ user }) => {
    const [activities, setActivities] = useState<ActivityLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchRecentActivity = async () => {
            if (!user?.id) return;

            setLoading(true);
            setError(null);
            try {
                // Utilizando o AuditService para buscar os últimos 5 logs (limit(5) garantido)
                const data = await auditService.getRecentActivity(user.id);
                // Garantimos no front-end os últimos 5
                setActivities(data.slice(0, 5));
            } catch (err) {
                console.error('Failed to load recent activity', err);
                setError('Falha ao carregar as atividades recentes.');
            } finally {
                setLoading(false);
            }
        };

        fetchRecentActivity();
    }, [user.id]);

    const getFriendlyPageName = (path: string, currentTitle: string, resourceTitle?: string) => {
        if (path === '/' || path === '') return 'Dashboard';
        if (path === '/courses') return 'Meus Cursos';
        if (path === '/achievements') return 'Conquistas';
        if (path === '/profile') return 'Meu Perfil';

        if (path.startsWith('/course/')) {
            return resourceTitle ? `Sala de Aula: ${resourceTitle}` : 'Sala de Aula';
        }

        if (currentTitle.startsWith('/')) {
            if (currentTitle.includes('course')) return 'Sala de Aula';
            return currentTitle;
        }

        return currentTitle;
    };

    const getIconForPath = (path: string) => {
        if (path.startsWith('/course/')) return 'fa-book-open text-indigo-400';
        if (path === '/courses') return 'fa-graduation-cap text-emerald-400';
        if (path === '/achievements') return 'fa-trophy text-amber-400';
        if (path === '/profile') return 'fa-user text-cyan-400';
        return 'fa-mouse-pointer text-slate-400';
    };

    if (loading) {
        return (
            <div className="bg-white/90 dark:bg-slate-900/80 shadow-md backdrop-blur-md rounded-2xl p-4 border border-slate-200 dark:border-white/5">
                <Skeleton width="w-1/3" height="h-4" className="mb-4" />
                <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="flex gap-3 items-center">
                            <Skeleton width="w-8" height="h-8" rounded="rounded-lg" />
                            <div className="flex-1 space-y-2">
                                <Skeleton width="w-3/4" height="h-3" />
                                <Skeleton width="w-1/4" height="h-2" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-white/90 dark:bg-slate-900/80 shadow-md backdrop-blur-md rounded-2xl p-4 border border-red-200 dark:border-red-900/20 text-center">
                <i className="fas fa-exclamation-triangle text-red-500 text-2xl mb-2"></i>
                <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p>
            </div>
        );
    }

    return (
        <div className="bg-white/90 dark:bg-slate-900/80 shadow-md backdrop-blur-md rounded-2xl p-4 border border-slate-200 dark:border-white/5">
            <h3 className="text-xs font-bold text-slate-600 dark:text-slate-300 mb-4 uppercase tracking-wider flex items-center gap-2">
                <i className="fas fa-history text-indigo-400"></i>
                Atividade Recente
            </h3>

            {activities.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 text-slate-500/50">
                    <i className="fas fa-shoe-prints text-2xl mb-2 opacity-30"></i>
                    <p className="text-xs font-medium">Nenhum rastro encontrado ainda.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {activities.map((activity) => {
                        const date = new Date(activity.created_at);
                        const isToday = date.toDateString() === new Date().toDateString();
                        const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                        const dateStr = date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

                        return (
                            <div key={activity.id} className="flex items-start gap-3 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group">
                                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-white/5 flex items-center justify-center shrink-0 border border-slate-200 dark:border-white/10 group-hover:bg-white dark:group-hover:bg-white/10 transition-colors">
                                    <i className={`fas ${getIconForPath(activity.path)} text-sm`}></i>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-slate-800 dark:text-white truncate">
                                        {getFriendlyPageName(activity.path, activity.page_title, activity.resource_title)}
                                    </p>
                                    <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium mt-0.5">
                                        <span>{isToday ? 'Hoje' : dateStr}</span>
                                        <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600"></span>
                                        <span>{timeStr}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default RecentActivity;
