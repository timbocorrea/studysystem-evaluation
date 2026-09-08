-- Migration: 20260311092500_ai_usage_logs.sql
-- Description: Creates a table to track AI usage for rate limiting purposes, preventing Denial of Wallet attacks.

CREATE TABLE IF NOT EXISTS public.ai_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    request_type TEXT NOT NULL DEFAULT 'ask_ai', -- To differentiate between types of AI requests if needed later
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast counting
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_user_created_at ON public.ai_usage_logs(user_id, created_at);

-- RLS
ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;

-- Users can only see their own logs (mostly for their own quota tracking if needed in the UI later)
CREATE POLICY "Users can view their own AI usage logs"
    ON public.ai_usage_logs
    FOR SELECT
    USING (auth.uid() = user_id);

-- System can insert, users cannot directly insert (inserted via Edge Function using service role bypass or standard insert via proxy)
CREATE POLICY "Users can insert their own logs"
    ON public.ai_usage_logs
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- No updates or deletes allowed for normal users to prevent tampering with quotas
