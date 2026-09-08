/**
 * cacheManager.ts
 *
 * Utility to clear browser caches (CacheStorage + Service Workers)
 * on logout, ensuring users always get the latest deploy.
 */

/**
 * Deletes all CacheStorage entries (Workbox precache, runtime caches, etc.)
 */
async function clearCacheStorage(): Promise<void> {
    if (!('caches' in window)) return;

    try {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
        console.log(`[CacheManager] Cleared ${cacheNames.length} cache(s):`, cacheNames);
    } catch (err) {
        console.warn('[CacheManager] Failed to clear CacheStorage:', err);
    }
}

/**
 * Unregisters all active Service Workers
 */
async function unregisterServiceWorkers(): Promise<void> {
    if (!('serviceWorker' in navigator)) return;

    try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map(reg => reg.unregister()));
        console.log(`[CacheManager] Unregistered ${registrations.length} Service Worker(s)`);
    } catch (err) {
        console.warn('[CacheManager] Failed to unregister Service Workers:', err);
    }
}

/**
 * Clears ephemeral session data while preserving Supabase auth keys.
 * Supabase stores its session under keys starting with "sb-" — these are preserved.
 */
function clearSessionData(): void {
    try {
        // Clear all sessionStorage (Dropbox tokens, temp state, etc.)
        sessionStorage.clear();

        // Clear non-Supabase localStorage entries selectively
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (
                key &&
                !key.startsWith('sb-')
            ) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));

        console.log(`[CacheManager] Cleared sessionStorage + ${keysToRemove.length} localStorage key(s)`);
    } catch (err) {
        console.warn('[CacheManager] Failed to clear session data:', err);
    }
}

/**
 * Full cache purge: CacheStorage + Service Workers + session data.
 * Call this on logout to ensure the next login gets a fresh build.
 */
export async function clearBrowserCache(): Promise<void> {
    console.log('[CacheManager] Starting full browser cache cleanup...');

    await Promise.all([
        clearCacheStorage(),
        unregisterServiceWorkers(),
    ]);

    clearSessionData();

    console.log('[CacheManager] Cache cleanup complete');
}

/**
 * Automatically clears the PWA cache and Service Workers on the first visit
 * to the login page during a given session, forcing a fresh download.
 * Uses a sessionStorage flag to prevent infinite reload loops.
 * 
 * @returns true if cache was cleared and page is reloading, false otherwise.
 */
export async function forceClearCacheOnLogin(): Promise<boolean> {
    if (sessionStorage.getItem('login_cache_cleared') === 'true') {
        return false;
    }

    console.log('[CacheManager] Auto-clearing cache on Login mount...');
    sessionStorage.setItem('login_cache_cleared', 'true');

    await Promise.all([
        clearCacheStorage(),
        unregisterServiceWorkers()
    ]);

    console.log('[CacheManager] Cache busted. Reloading page...');
    window.location.reload();
    return true;
}
