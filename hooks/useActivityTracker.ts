import { useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { auditService, AuditEvent, InteractionStats } from '../services/AuditService';
import { activityMonitor } from '../services/ActivityMonitor';

const FLUSH_INTERVAL_MS = 120000; // 120 seconds batching
const HEARTBEAT_INTERVAL_MS = 30000; // 30 seconds for media
const IDLE_THRESHOLD_MS = 10000;

export const useActivityTracker = (resourceTitle?: string) => {
    const location = useLocation();
    const sessionIdRef = useRef<string>(crypto.randomUUID());
    const pathRef = useRef<string>(location.pathname);
    const resourceTitleRef = useRef<string | undefined>(resourceTitle);

    // Batching State
    const eventQueueRef = useRef<AuditEvent[]>([]);
    const statsDeltaRef = useRef<InteractionStats>({
        total_time: 0,
        active_time: 0,
        idle_time: 0,
        video_time: 0,
        audio_time: 0,
        scroll_depth: 0,
        mouse_clicks: 0,
        keypresses: 0
    });

    const lastActivityRef = useRef<number>(Date.now());
    const lastFlushRef = useRef<number>(Date.now());

    // Helpers
    const getPageTitle = (path: string) => {
        if (path === '/') return 'Dashboard';
        if (path.includes('/courses')) return 'Cursos';
        if (path.includes('/lesson')) return 'Aula';
        return path;
    };

    const flushLogs = useCallback(async (isFinal = false) => {
        if (eventQueueRef.current.length === 0 && statsDeltaRef.current.total_time === 0) return;

        const events = [...eventQueueRef.current];
        const stats = { ...statsDeltaRef.current };

        // Clear local state before sync to avoid race conditions with next events
        eventQueueRef.current = [];
        statsDeltaRef.current = {
            total_time: 0,
            active_time: 0,
            idle_time: 0,
            video_time: 0,
            audio_time: 0,
            scroll_depth: 0,
            mouse_clicks: 0,
            keypresses: 0
        };

        const params = {
            sessionId: sessionIdRef.current,
            path: pathRef.current,
            pageTitle: getPageTitle(pathRef.current),
            resourceTitle: resourceTitleRef.current,
            newEvents: events,
            statsDelta: stats
        };

        if (isFinal && typeof navigator.sendBeacon === 'function') {
            // For final flush on unload, use sendBeacon if possible
            // Note: sendBeacon doesn't support headers/POST easily with JSON 
            // without Blob, but we'll try to sync via AuditService normally first
            // inside beforeunload. If it fails, we lose it, but visibilitychange is better.
            await auditService.syncBatch(params);
        } else {
            await auditService.syncBatch(params);
        }

        lastFlushRef.current = Date.now();
    }, []);

    // Sync resourceTitleRef with prop
    useEffect(() => {
        resourceTitleRef.current = resourceTitle;
    }, [resourceTitle]);

    // Track path changes
    useEffect(() => {
        if (pathRef.current !== location.pathname) {
            // Flush previous session data
            flushLogs();

            // New session ID for new path? Or keep the same? 
            // In smart batching, usually we change session_id or just change path in the same session.
            // Let's create a new session_id per page visit for clarity in detailed view.
            sessionIdRef.current = crypto.randomUUID();
            pathRef.current = location.pathname;
        }
    }, [location.pathname, flushLogs]);

    // Performance/Event Listeners
    useEffect(() => {
        const handleInteraction = (type: 'click' | 'key' | 'scroll') => {
            lastActivityRef.current = Date.now();
            if (type === 'click') statsDeltaRef.current.mouse_clicks++;
            if (type === 'key') statsDeltaRef.current.keypresses++;
            if (type === 'scroll') {
                const depth = Math.round((window.scrollY + window.innerHeight) / document.documentElement.scrollHeight * 100);
                statsDeltaRef.current.scroll_depth = Math.max(statsDeltaRef.current.scroll_depth, depth);
            }
        };

        const onClick = () => handleInteraction('click');
        const onKey = () => handleInteraction('key');
        const onScroll = () => handleInteraction('scroll');
        const onMouseMove = () => { lastActivityRef.current = Date.now(); };

        window.addEventListener('click', onClick);
        window.addEventListener('keydown', onKey);
        window.addEventListener('scroll', onScroll);
        window.addEventListener('mousemove', onMouseMove);

        const interval = setInterval(() => {
            const now = Date.now();
            const isIdle = (now - lastActivityRef.current) > IDLE_THRESHOLD_MS;
            const isMediaPlaying = activityMonitor.isMediaPlaying;

            statsDeltaRef.current.total_time += 1;

            if (!isIdle || isMediaPlaying) {
                statsDeltaRef.current.active_time += 1;
            } else {
                statsDeltaRef.current.idle_time += 1;
            }

            // Flush check
            if (now - lastFlushRef.current >= FLUSH_INTERVAL_MS) {
                flushLogs();
            }
        }, 1000);

        return () => {
            window.removeEventListener('click', onClick);
            window.removeEventListener('keydown', onKey);
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('mousemove', onMouseMove);
            clearInterval(interval);
        };
    }, [flushLogs]);

    // Reliable unload
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                flushLogs();
            }
        };

        const handleBeforeUnload = () => {
            void flushLogs(true);
        };

        window.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [flushLogs]);

    // Heartbeat logic integration with ActivityMonitor
    useEffect(() => {
        // Expose a way for media players to report heartbeats
        const handleHeartbeat = (data: { type: string; duration: number }) => {
            if (data.type === 'video') statsDeltaRef.current.video_time += data.duration;
            if (data.type === 'audio') statsDeltaRef.current.audio_time += data.duration;

            eventQueueRef.current.push({
                type: 'heartbeat',
                timestamp: new Date().toISOString(),
                description: `Media heartbeat: ${data.type}`,
                metadata: { mediaType: data.type, duration: data.duration }
            });
        };

        // We can use a custom event or a registration in ActivityMonitor
        (window as any).__reportMediaHeartbeat = handleHeartbeat;

        return () => {
            delete (window as any).__reportMediaHeartbeat;
        };
    }, []);
};
