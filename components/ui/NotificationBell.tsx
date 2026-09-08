import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotifications } from '@/contexts/NotificationContext';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const NotificationBell: React.FC = () => {
    const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotifications();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleDropdown = () => setIsOpen(!isOpen);

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={toggleDropdown}
                className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors relative"
                title="Notificações"
            >
                <i className="fas fa-bell"></i>
                <AnimatePresence>
                    {unreadCount > 0 && (
                        <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                            className="absolute top-1 right-1 sm:top-1.5 sm:right-1.5 w-3.5 h-3.5 sm:w-4 sm:h-4 bg-red-500 text-white text-[9px] sm:text-[10px] font-black flex items-center justify-center rounded-full border-2 border-white dark:border-slate-900 shadow-sm"
                        >
                            {unreadCount > 9 ? '+9' : unreadCount}
                        </motion.span>
                    )}
                </AnimatePresence>
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-x-2 top-16 sm:absolute sm:inset-x-auto sm:right-0 sm:top-auto sm:mt-3 sm:w-80 md:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-[100] overflow-hidden"
                    >
                        {/* Header */}
                        <div className="px-5 py-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-slate-50/50 dark:bg-white/5">
                            <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">Notificações</h3>
                            {unreadCount > 0 && (
                                <button
                                    onClick={markAllAsRead}
                                    className="text-[10px] font-bold text-indigo-500 hover:text-indigo-400 uppercase tracking-widest transition-colors"
                                >
                                    Ler Tudo
                                </button>
                            )}
                        </div>

                        {/* List */}
                        <div className="max-h-[70vh] overflow-y-auto custom-scrollbar">
                            {notifications.length === 0 ? (
                                <div className="p-10 text-center">
                                    <div className="w-16 h-16 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <i className="fas fa-bell-slash text-slate-400 dark:text-slate-600 text-xl"></i>
                                    </div>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium italic">Nenhuma notificação por aqui.</p>
                                </div>
                            ) : (
                                notifications.map((notif) => (
                                    <div
                                        key={notif.id}
                                        className={`group relative p-4 border-b border-slate-100 dark:border-white/5 transition-colors hover:bg-slate-50 dark:hover:bg-white/5 ${!notif.isRead ? 'bg-indigo-500/5 ring-1 ring-inset ring-indigo-500/10' : ''}`}
                                        onClick={() => markAsRead(notif.id)}
                                    >
                                        <div className="flex gap-3">
                                            <div className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center shadow-sm ${notif.type === 'forum_reply'
                                                ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400'
                                                : notif.type === 'direct_message'
                                                    ? 'bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400'
                                                    : 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                                                }`}>
                                                <i className={`fas ${notif.type === 'forum_reply' ? 'fa-comments' : notif.type === 'direct_message' ? 'fa-envelope' : 'fa-info-circle'}`}></i>
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-start justify-between gap-2">
                                                    <h4 className={`text-sm font-bold truncate leading-none mb-1 ${notif.isRead ? 'text-slate-700 dark:text-slate-200' : 'text-slate-900 dark:text-white'}`}>
                                                        {notif.title}
                                                    </h4>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            deleteNotification(notif.id);
                                                        }}
                                                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-400 transition-all"
                                                    >
                                                        <i className="fas fa-times text-[10px]"></i>
                                                    </button>
                                                </div>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-snug mb-2 pr-4">{notif.message}</p>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] text-slate-400 dark:text-white/30 font-medium">
                                                        {formatDistanceToNow(notif.createdAt, { addSuffix: true, locale: ptBR })}
                                                    </span>
                                                    {notif.link && (
                                                        <a
                                                            href={notif.link}
                                                            className="text-[10px] font-black text-indigo-500 hover:underline flex items-center gap-1"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            Ver Mais <i className="fas fa-arrow-right text-[8px]"></i>
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        {!notif.isRead && (
                                            <div className="absolute top-4 right-4 w-2 h-2 bg-indigo-500 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.5)]"></div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Footer */}
                        {notifications.length > 0 && (
                            <div className="p-3 bg-slate-50 dark:bg-white/5 text-center">
                                <button
                                    onClick={() => {
                                        setIsOpen(false);
                                        // TODO: Navegar para página de notificações se existir
                                    }}
                                    className="text-xs font-black text-slate-500 dark:text-slate-400 hover:text-indigo-500 transition-colors uppercase tracking-widest"
                                >
                                    Ver todas as notificações
                                </button>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default NotificationBell;
