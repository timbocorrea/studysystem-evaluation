import React, { useState, useEffect, useCallback } from 'react';
import { auditService } from '../services/AuditService';
import { AuditLogEntry } from '../services/AuditService';
import VirtualList from './ui/VirtualList';
import { AuditSessionDetailModal } from './AuditSessionDetailModal';

import { useInfiniteScroll } from '../hooks/useInfiniteScroll';

interface UserAuditHistoryProps {
    userId: string;
}

export const UserAuditHistory: React.FC<UserAuditHistoryProps> = ({ userId }) => {
    const { data: rawLogs, loadMore, loading: isLoading, hasMore } = useInfiniteScroll('audit_logs', {
        pageSize: 20,
        filter: { user_id: userId },
        select: 'id, created_at, path, page_title, resource_title, total_duration_seconds, active_duration_seconds'
    });
    const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);
    const [isDetailLoading, setIsDetailLoading] = useState(false);

    // Initial load
    useEffect(() => {
        loadMore(true);
    }, [userId, loadMore]);

    const logs: AuditLogEntry[] = React.useMemo(() => rawLogs.map((row: any) => ({
        id: row.id,
        timestamp: row.created_at,
        path: row.path,
        pageTitle: row.page_title,
        resourceTitle: row.resource_title,
        total_duration_seconds: row.total_duration_seconds,
        active_duration_seconds: row.active_duration_seconds,
        interaction_stats: row.interaction_stats || {},
        events: row.events || [],
        device: 'Unknown'
    })), [rawLogs]);

    const handleLoadMore = () => {
        loadMore();
    };

    const handleRowClick = async (logId: string) => {
        setIsDetailLoading(true);
        const fullDetail = await auditService.getSessionDetail(logId);
        if (fullDetail) {
            setSelectedLog(fullDetail);
        }
        setIsDetailLoading(false);
    };

    const formatDuration = (seconds: number | undefined) => {
        if (!seconds && seconds !== 0) return '0s';
        if (seconds < 60) return `${seconds}s`;
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}m ${secs}s`;
    };

    const getScoreBadge = (score: number) => {
        if (score >= 80) return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
        if (score >= 50) return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
        return 'bg-red-500/10 text-red-600 border-red-500/20';
    };

    const renderLogItem = (log: AuditLogEntry, index: number) => {
        // Obter apenas o nome do path (ex: /course/123/lesson/456 -> lesson)
        const pathSegments = log.path.split('/').filter(Boolean);
        const type = pathSegments.length > 0 ? pathSegments[0] : 'dashboard';

        const score = log.total_duration_seconds > 0
            ? Math.round(((log.active_duration_seconds || 0) / log.total_duration_seconds) * 100)
            : 0;

        return (
            <div
                onClick={() => handleRowClick(log.id)}
                className={`flex items-center gap-4 px-4 py-3 border-b border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer transition-colors ${isDetailLoading ? 'opacity-50 pointer-events-none' : ''}`}
            >
                {/* Ícone por tipo */}
                <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center shrink-0">
                    <i className={`fas ${type === 'course' ? 'fa-play-circle text-indigo-500' :
                        type === 'dashboard' ? 'fa-home text-emerald-500' :
                            'fa-mouse-pointer text-slate-500'
                        }`}></i>
                </div>

                {/* Detalhes principales */}
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-800 dark:text-white truncate">
                        {log.resourceTitle || log.pageTitle || log.path}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                        <span>{new Date(log.timestamp).toLocaleString('pt-BR')}</span>
                        <span>•</span>
                        <span className="truncate max-w-[150px]">{log.path}</span>
                    </div>
                </div>

                {/* Tempo e Score */}
                <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                        {formatDuration(log.total_duration_seconds)}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getScoreBadge(score)}`}>
                        {score}% Ativo
                    </span>
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col h-[500px]">
            {/* Header */}
            <div className="flex justify-between items-center p-4 bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/5">
                <h4 className="font-black text-slate-800 dark:text-white flex items-center gap-2">
                    <i className="fas fa-list-alt text-indigo-400"></i>
                    Logs de Acesso e Estudo
                </h4>
                <div className="text-xs text-slate-500">
                    Total carregado: {logs.length}
                </div>
            </div>

            {/* Lista Virtualizada */}
            <div className="flex-1 overflow-hidden relative">
                <VirtualList
                    items={logs}
                    itemHeight={68} // Altura aproximada do renderLogItem
                    renderItem={renderLogItem}
                    isLoading={isLoading && logs.length === 0}
                    loadingCount={8}
                    className="h-full absolute inset-0"
                    emptyMessage="Nenhum log de atividade encontrado para este usuário."
                />
            </div>

            {/* Load More Trigger */}
            {hasMore && (
                <div className="p-3 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/5 flex justify-center sticky bottom-0 z-10">
                    <button
                        onClick={handleLoadMore}
                        disabled={isLoading}
                        className="px-4 py-2 text-sm font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                        {isLoading ? <i className="fas fa-circle-notch animate-spin"></i> : <i className="fas fa-chevron-down"></i>}
                        {isLoading ? 'Carregando...' : 'Carregar Mais'}
                    </button>
                </div>
            )}

            {/* Modal de Detalhes da Sessão */}
            {selectedLog && (
                <AuditSessionDetailModal
                    log={selectedLog}
                    onClose={() => setSelectedLog(null)}
                />
            )}
        </div>
    );
};
