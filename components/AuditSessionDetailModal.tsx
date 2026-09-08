
import React from 'react';
import { AuditLogEntry } from '../services/AuditService';
import { AnimatedDuration } from './ui/animated-duration';

interface AuditSessionDetailModalProps {
    log: AuditLogEntry;
    onClose: () => void;
}

export const AuditSessionDetailModal: React.FC<AuditSessionDetailModalProps> = ({ log, onClose }) => {
    const stats = log.interaction_stats;
    const events = log.events || [];

    // Helper to format time
    const formatTime = (seconds: number) => {
        if (!seconds) return '0s';
        if (seconds < 60) return `${seconds}s`;
        return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white dark:bg-[#0a0e14] border border-slate-200 dark:border-white/10 w-full max-w-2xl max-h-[90vh] rounded-3xl overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-slate-50/50 dark:bg-white/[0.02]">
                    <div>
                        <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">
                            Detalhes da Sessão
                        </h2>
                        <p className="text-xs font-medium text-slate-500 mt-0.5">
                            ID: {log.id.slice(0, 8)}... • {new Date(log.timestamp).toLocaleString()}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-full hover:bg-slate-200 dark:hover:bg-white/10 flex items-center justify-center text-slate-500 transition-colors"
                    >
                        <i className="fas fa-times"></i>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                    {/* Page Info */}
                    <div className="bg-indigo-500/5 border border-indigo-500/10 p-4 rounded-2xl flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-indigo-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                            <i className="fas fa-graduation-cap"></i>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest leading-none mb-1">Página Acessada</p>
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white leading-tight">
                                {log.resourceTitle || log.pageTitle}
                            </h3>
                            <p className="text-xs text-slate-500 font-mono truncate max-w-[400px]">{log.path}</p>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5">
                            <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Tempo Total</p>
                            <p className="text-lg font-black text-slate-800 dark:text-white">
                                <AnimatedDuration seconds={log.total_duration_seconds} />
                            </p>
                        </div>
                        <div className="p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10">
                            <p className="text-[10px] font-bold text-emerald-500 uppercase mb-1">Vídeo/Áudio</p>
                            <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                                {formatTime((stats.video_time || 0) + (stats.audio_time || 0))}
                            </p>
                        </div>
                        <div className="p-4 bg-amber-500/5 rounded-2xl border border-amber-500/10">
                            <p className="text-[10px] font-bold text-amber-500 uppercase mb-1">Scroll Máx.</p>
                            <p className="text-lg font-black text-amber-600 dark:text-amber-400">
                                {stats.scroll_depth || 0}%
                            </p>
                        </div>
                        <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5">
                            <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Cliques</p>
                            <p className="text-lg font-black text-slate-800 dark:text-white">
                                {stats.mouse_clicks || 0}
                            </p>
                        </div>
                    </div>

                    {/* Timeline */}
                    <div>
                        <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                            <i className="fas fa-stream text-indigo-500"></i>
                            Linha do Tempo de Atividade
                        </h4>
                        <div className="space-y-4 border-l-2 border-slate-100 dark:border-white/5 ml-2 pl-6 py-2">
                            {events.length === 0 ? (
                                <p className="text-xs italic text-slate-500 pl-2">Nenhum evento registrado nesta sessão.</p>
                            ) : events.map((event, idx) => (
                                <div key={idx} className="relative group">
                                    <div className="absolute -left-[31px] top-1 w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-white/20 group-hover:bg-indigo-500 transition-colors"></div>
                                    <p className="text-[10px] font-mono text-slate-400 mb-1">
                                        {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                    </p>
                                    <div className="p-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 rounded-xl">
                                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                            {event.description}
                                        </p>
                                        {event.metadata && (
                                            <div className="mt-2 flex gap-2 flex-wrap text-[10px]">
                                                {Object.entries(event.metadata).map(([key, val]) => (
                                                    <span key={key} className="bg-indigo-500/10 text-indigo-500 px-1.5 py-0.5 rounded-md font-medium border border-indigo-500/10">
                                                        {key}: {String(val)}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer / Summary Warnings */}
                <div className="p-4 bg-slate-50 dark:bg-white/[0.02] border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
                    <div className="flex gap-2">
                        {stats.video_time > 300 && stats.scroll_depth < 10 && (
                            <div className="flex items-center gap-1.5 text-red-500 text-[10px] font-bold bg-red-500/10 px-2 py-1 rounded-full border border-red-500/10">
                                <i className="fas fa-exclamation-triangle"></i>
                                Assistiu vídeo mas não scrollou o conteúdo
                            </div>
                        )}
                        {stats.total_time > 600 && stats.mouse_clicks === 0 && (
                            <div className="flex items-center gap-1.5 text-amber-500 text-[10px] font-bold bg-amber-500/10 px-2 py-1 rounded-full border border-amber-500/10">
                                <i className="fas fa-info-circle"></i>
                                Atividade passiva prolongada
                            </div>
                        )}
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium">Dispositivo: {log.device}</p>
                </div>
            </div>
        </div>
    );
};
