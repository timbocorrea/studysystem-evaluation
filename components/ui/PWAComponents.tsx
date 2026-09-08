import React, { useState, useEffect } from 'react';
import usePWA from '../../hooks/usePWA';
import { hapticActions } from '../../utils/haptics';

/**
 * InstallPrompt - Custom PWA install prompt banner
 */
export const InstallPrompt: React.FC = () => {
    const { canInstall, promptInstall, isInstalled } = usePWA();
    const [dismissed, setDismissed] = useState(false);
    const [isInstalling, setIsInstalling] = useState(false);

    // Check if user has dismissed before
    useEffect(() => {
        const wasDismissed = localStorage.getItem('pwa-install-dismissed');
        if (wasDismissed) {
            const dismissedTime = parseInt(wasDismissed, 10);
            // Show again after 7 days
            if (Date.now() - dismissedTime < 7 * 24 * 60 * 60 * 1000) {
                setDismissed(true);
            }
        }
    }, []);

    const handleInstall = async () => {
        setIsInstalling(true);
        hapticActions.tap();
        const success = await promptInstall();
        setIsInstalling(false);

        if (success) {
            hapticActions.success();
        }
    };

    const handleDismiss = () => {
        setDismissed(true);
        localStorage.setItem('pwa-install-dismissed', Date.now().toString());
    };

    if (!canInstall || dismissed || isInstalled) {
        return null;
    }

    return (
        <div
            className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-50 transition-all duration-300"
        >
            <div className="bg-gradient-to-r from-indigo-600 to-cyan-600 rounded-2xl p-4 shadow-2xl border border-white/20">
                <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                        <i className="fas fa-download text-xl text-white"></i>
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-white text-sm">Instalar StudySystem</h3>
                        <p className="text-xs text-white/80 mt-1">
                            Adicione à tela inicial para acesso rápido, mesmo offline!
                        </p>
                        <div className="flex gap-2 mt-3">
                            <button
                                onClick={handleInstall}
                                disabled={isInstalling}
                                className="flex-1 py-2 px-4 bg-white text-indigo-600 font-bold text-xs rounded-xl hover:bg-white/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isInstalling ? (
                                    <i className="fas fa-circle-notch animate-spin"></i>
                                ) : (
                                    <>
                                        <i className="fas fa-plus"></i>
                                        Instalar
                                    </>
                                )}
                            </button>
                            <button
                                onClick={handleDismiss}
                                className="py-2 px-3 text-white/80 hover:text-white text-xs font-medium transition-colors"
                            >
                                Depois
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

/**
 * OfflineIndicator - Shows when app is offline
 */
export const OfflineIndicator: React.FC = () => {
    const { isOnline } = usePWA();

    return (
        <>
            {!isOnline && (
                <div
                    className="fixed top-0 left-0 right-0 z-[9999] bg-amber-500 text-amber-950 py-2 px-4 flex items-center justify-center gap-2 text-sm font-bold transition-all duration-300"
                >
                    <i className="fas fa-wifi-slash"></i>
                    <span>Você está offline. Algumas funcionalidades podem não estar disponíveis.</span>
                </div>
            )}
        </>
    );
};

/**
 * UpdatePrompt - Shows when a new version is available
 */
export const UpdatePrompt: React.FC = () => {
    const { needsUpdate, updateApp } = usePWA();

    if (!needsUpdate) {
        return null;
    }

    return (
        <div
            className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-50 transition-all duration-300"
        >
            <div className="bg-emerald-600 rounded-2xl p-4 shadow-2xl border border-white/20">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                        <i className="fas fa-sparkles text-white"></i>
                    </div>
                    <div className="flex-1">
                        <h3 className="font-bold text-white text-sm">Atualização disponível!</h3>
                        <p className="text-xs text-white/80">Uma nova versão está pronta.</p>
                    </div>
                    <button
                        onClick={() => {
                            hapticActions.success();
                            updateApp();
                        }}
                        className="py-2 px-4 bg-white text-emerald-600 font-bold text-xs rounded-xl hover:bg-white/90 transition-colors"
                    >
                        Atualizar
                    </button>
                </div>
            </div>
        </div>
    );
};

/**
 * PWAProvider - Wrapper that includes all PWA UI components
 */
export const PWAProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return (
        <>
            <OfflineIndicator />
            {children}
            <InstallPrompt />
            <UpdatePrompt />
        </>
    );
};

export default PWAProvider;
