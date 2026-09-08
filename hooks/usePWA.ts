import { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
    readonly platforms: string[];
    readonly userChoice: Promise<{
        outcome: 'accepted' | 'dismissed';
        platform: string;
    }>;
    prompt(): Promise<void>;
}

interface PWAStatus {
    isInstallable: boolean;
    isInstalled: boolean;
    isOnline: boolean;
    needsUpdate: boolean;
}

/**
 * usePWA - PWA installation and status hook
 * 
 * Features:
 * - Detect if PWA is installable
 * - Show custom install prompt
 * - Track installation status
 * - Handle offline/online status
 * - Detect updates
 */
export function usePWA() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [status, setStatus] = useState<PWAStatus>({
        isInstallable: false,
        isInstalled: false,
        isOnline: navigator.onLine,
        needsUpdate: false
    });

    // Listen for beforeinstallprompt event
    useEffect(() => {
        const handler = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
            setStatus(prev => ({ ...prev, isInstallable: true }));
        };

        window.addEventListener('beforeinstallprompt', handler);

        // Check if already installed
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches
            || (window.navigator as any).standalone === true;

        if (isStandalone) {
            setStatus(prev => ({ ...prev, isInstalled: true }));
        }

        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    // Listen for app installed event
    useEffect(() => {
        const handler = () => {
            setDeferredPrompt(null);
            setStatus(prev => ({
                ...prev,
                isInstalled: true,
                isInstallable: false
            }));
        };

        window.addEventListener('appinstalled', handler);
        return () => window.removeEventListener('appinstalled', handler);
    }, []);

    // Listen for online/offline status
    useEffect(() => {
        const handleOnline = () => setStatus(prev => ({ ...prev, isOnline: true }));
        const handleOffline = () => setStatus(prev => ({ ...prev, isOnline: false }));

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Listen for service worker updates
    useEffect(() => {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.ready.then(registration => {
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    if (newWorker) {
                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                setStatus(prev => ({ ...prev, needsUpdate: true }));
                            }
                        });
                    }
                });
            });
        }
    }, []);

    // Prompt installation
    const promptInstall = useCallback(async (): Promise<boolean> => {
        if (!deferredPrompt) return false;

        try {
            await deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;

            if (outcome === 'accepted') {
                setDeferredPrompt(null);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Install prompt error:', error);
            return false;
        }
    }, [deferredPrompt]);

    // Reload to update
    const updateApp = useCallback(() => {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.ready.then(registration => {
                registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
            });
        }
        window.location.reload();
    }, []);

    return {
        ...status,
        promptInstall,
        updateApp,
        canInstall: status.isInstallable && !status.isInstalled
    };
}

export default usePWA;
