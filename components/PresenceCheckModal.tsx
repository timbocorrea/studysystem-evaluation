import React, { useEffect, useState } from 'react';
import { activityMonitor } from '../services/ActivityMonitor';

export const PresenceCheckModal: React.FC = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [countdown, setCountdown] = useState(60);

    useEffect(() => {
        activityMonitor.onPresenceCheckRequest(() => {
            setIsVisible(true);
            setCountdown(60); // 60 seconds to confirm or we could just leave it open
        });
        return () => {
            activityMonitor.offPresenceCheckRequest();
        };
    }, []);

    // Optional: Auto-hide or auto-logoff if countdown hits zero?
    // For now, user requested "aparecer uma notificação discreta".
    // Netflix pauses. We just want to audit correctly.
    // If they don't click, they are effectively Idle in the logs until they do.

    const handleConfirm = () => {
        setIsVisible(false);
        activityMonitor.confirmPresence();
    };

    if (!isVisible) return null;

    return (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-4 fade-in duration-300">
            <div className="bg-slate-900/90 backdrop-blur-md border border-indigo-500/50 text-white p-4 rounded-xl shadow-2xl shadow-indigo-500/20 max-w-sm flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center flex-shrink-0 animate-pulse">
                    <i className="fas fa-eye text-indigo-400"></i>
                </div>
                <div className="flex-1">
                    <h3 className="font-bold text-sm">Você ainda está aí?</h3>
                    <p className="text-xs text-slate-400 mt-1">Detectamos inatividade enquanto a mídia toca.</p>
                </div>
                <button
                    onClick={handleConfirm}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors whitespace-nowrap shadow-lg shadow-indigo-600/20"
                >
                    Estou aqui
                </button>
            </div>
        </div>
    );
};
