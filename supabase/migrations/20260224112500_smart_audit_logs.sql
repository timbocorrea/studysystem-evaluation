
-- Enable UUID extension if not already present
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create Audit Logs table for granular tracking
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id UUID NOT NULL,
    path TEXT NOT NULL,
    page_title TEXT,
    resource_title TEXT,
    interaction_stats JSONB DEFAULT '{}'::jsonb,
    events JSONB DEFAULT '[]'::jsonb,
    total_duration_seconds INTEGER DEFAULT 0,
    active_duration_seconds INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookup by session and user
CREATE INDEX IF NOT EXISTS idx_audit_logs_session_id ON public.audit_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Policies: Users can view their own logs, Admins can view all
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'audit_logs') THEN
        DROP POLICY IF EXISTS "Users can view own audit logs" ON public.audit_logs;
        DROP POLICY IF EXISTS "Instructors can view all audit logs" ON public.audit_logs;
    END IF;
END $$;

CREATE POLICY "Users can view own audit logs" 
ON public.audit_logs FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Instructors can view all audit logs" 
ON public.audit_logs FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'INSTRUCTOR'
  )
);

-- RPC to append logs in batch and update stats incrementally
CREATE OR REPLACE FUNCTION append_audit_log(
    p_session_id UUID,
    p_path TEXT,
    p_page_title TEXT,
    p_resource_title TEXT,
    p_new_events JSONB,
    p_stats_delta JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_existing_id UUID;
    v_updated_stats JSONB;
    v_updated_events JSONB;
    v_total_duration INTEGER;
    v_active_duration INTEGER;
BEGIN
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Check if session already exists
    SELECT id, interaction_stats, events, active_duration_seconds 
    INTO v_existing_id, v_updated_stats, v_updated_events, v_active_duration
    FROM public.audit_logs
    WHERE session_id = p_session_id AND user_id = v_user_id
    LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
        -- Sum values in JSONB
        WITH delta_items AS (
            SELECT key, value::int as val FROM jsonb_each_text(p_stats_delta)
        ),
        existing_items AS (
            SELECT key, value::int as val FROM jsonb_each_text(v_updated_stats)
        ),
        combined AS (
            SELECT 
                COALESCE(e.key, d.key) as key,
                COALESCE(e.val, 0) + COALESCE(d.val, 0) as total
            FROM existing_items e
            FULL OUTER JOIN delta_items d ON e.key = d.key
        )
        SELECT jsonb_object_agg(key, total) INTO v_updated_stats FROM combined;

        -- Append events
        v_updated_events := v_updated_events || p_new_events;
        
        -- Recalculate duration
        v_total_duration := COALESCE((v_updated_stats->>'total_time')::int, 0);
        v_active_duration := COALESCE((v_updated_stats->>'active_time')::int, 0);

        UPDATE public.audit_logs
        SET 
            interaction_stats = v_updated_stats,
            events = v_updated_events,
            total_duration_seconds = v_total_duration,
            active_duration_seconds = v_active_duration,
            updated_at = NOW()
        WHERE id = v_existing_id;
        
        RETURN jsonb_build_object('status', 'updated', 'id', v_existing_id);
    ELSE
        -- Create new entry
        INSERT INTO public.audit_logs (
            user_id, 
            session_id, 
            path, 
            page_title, 
            resource_title, 
            interaction_stats, 
            events,
            total_duration_seconds,
            active_duration_seconds
        ) VALUES (
            v_user_id,
            p_session_id,
            p_path,
            p_page_title,
            p_resource_title,
            p_stats_delta,
            p_new_events,
            COALESCE((p_stats_delta->>'total_time')::int, 0),
            COALESCE((p_stats_delta->>'active_time')::int, 0)
        )
        RETURNING id INTO v_existing_id;
        
        RETURN jsonb_build_object('status', 'created', 'id', v_existing_id);
    END IF;
END;
$$;
