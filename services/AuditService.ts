import { createSupabaseClient } from './supabaseClient';
import { SupabaseClient } from '@supabase/supabase-js';

export interface InteractionStats {
    total_time: number;
    active_time: number;
    idle_time: number;
    video_time: number;
    audio_time: number;
    scroll_depth: number;
    mouse_clicks: number;
    keypresses: number;
}

export interface AuditEvent {
    type: string;
    timestamp: string;
    description: string;
    metadata?: any;
}

export interface AuditLogEntry {
    id: string;
    timestamp: string;
    path: string;
    pageTitle: string;
    resourceTitle?: string;
    total_duration_seconds: number;
    active_duration_seconds?: number;
    interaction_stats: InteractionStats;
    events: AuditEvent[];
    device: string;
}

class AuditService {
    private static instance: AuditService;
    private supabase: SupabaseClient;
    private cachedLogs: any[] = [];

    private constructor() {
        this.supabase = createSupabaseClient();
    }

    public static getInstance(): AuditService {
        if (!AuditService.instance) {
            AuditService.instance = new AuditService();
        }
        return AuditService.instance;
    }

    /**
     * Sends a batch of events and stats to the server via RPC
     */
    public async syncBatch(params: {
        sessionId: string;
        path: string;
        pageTitle: string;
        resourceTitle?: string;
        newEvents: AuditEvent[];
        statsDelta: Partial<InteractionStats>;
    }) {
        try {
            const { data, error } = await this.supabase.rpc('append_audit_log', {
                p_session_id: params.sessionId,
                p_path: params.path,
                p_page_title: params.pageTitle,
                p_resource_title: params.resourceTitle || null,
                p_new_events: params.newEvents,
                p_stats_delta: params.statsDelta
            });

            if (error) {
                console.error('[AuditService] RPC Error:', error);
                // Fallback to local storage or retry logic could go here
                return null;
            }
            return data;
        } catch (err) {
            console.error('[AuditService] Sync failed:', err);
            return null;
        }
    }

    /**
     * Compatibility method for summary list.
     * Selects only basic info, excluding heavy JSONB fields (events, interaction_stats).
     * Implements mandatory pagination and optional user filtering.
     */
    public async getLogs(page = 0, limit = 20, userId?: string): Promise<AuditLogEntry[]> {
        const from = page * limit;
        const to = from + limit - 1;

        let query = this.supabase
            .from('audit_logs')
            .select('id, created_at, path, page_title, resource_title, total_duration_seconds, active_duration_seconds')
            .order('created_at', { ascending: false })
            .range(from, to);

        if (userId) {
            query = query.eq('user_id', userId);
        }

        const { data, error } = await query;

        if (error) {
            console.error('[AuditService] Failed to fetch logs:', error);
            return [];
        }

        return (data || []).map(row => ({
            id: row.id,
            timestamp: row.created_at,
            path: row.path,
            pageTitle: row.page_title,
            resourceTitle: row.resource_title,
            total_duration_seconds: row.total_duration_seconds,
            active_duration_seconds: row.active_duration_seconds,
            interaction_stats: {} as InteractionStats, // Summary doesn't have this
            events: [], // Summary doesn't have this
            device: 'Unknown'
        }));
    }

    /**
     * Gets the 5 most recent activities for a given user.
     * Used by the Student Dashboard RecentActivity widget.
     */
    public async getRecentActivity(userId: string) {
        const { data, error } = await this.supabase
            .from('audit_logs')
            .select('id, path, page_title, resource_title, created_at')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(5);

        if (error) {
            console.error('[AuditService] Failed to fetch recent activity:', error);
            return [];
        }

        return data || [];
    }

    /**
     * Fetches details for a specific session (on-demand)
     */
    public async getSessionDetail(sessionId: string): Promise<AuditLogEntry | null> {
        const { data, error } = await this.supabase
            .from('audit_logs')
            .select('id, created_at, path, page_title, resource_title, total_duration_seconds, interaction_stats, events')
            .eq('id', sessionId)
            .single();

        if (error || !data) {
            console.error('[AuditService] Failed to fetch sub-session detail:', error);
            return null;
        }

        return {
            id: data.id,
            timestamp: data.created_at,
            path: data.path,
            pageTitle: data.page_title,
            resourceTitle: data.resource_title,
            total_duration_seconds: data.total_duration_seconds,
            interaction_stats: data.interaction_stats,
            events: data.events,
            device: 'Unknown'
        };
    }

    // Legacy method - can be kept as a wrapper for syncBatch if needed
    public async logSession(entry: any) {
        // This is now handled by hooks using syncBatch for granularity
        console.warn('[AuditService] logSession is deprecated. Use syncBatch.');
    }

    public getDeviceInfo(): string {
        const ua = navigator.userAgent;
        if (/mobile/i.test(ua)) return 'Mobile';
        if (/tablet/i.test(ua)) return 'Tablet';
        return 'Desktop';
    }
}

export const auditService = AuditService.getInstance();
