-- BUDDY 2A
-- Optional provider/source/status metadata for Buddy AI usage logs.
-- Safe to apply after backend deploy; the Edge Function falls back to legacy inserts
-- if these columns do not exist yet in Production.

begin;

alter table if exists public.ai_usage_logs
  add column if not exists provider text,
  add column if not exists model text,
  add column if not exists source text,
  add column if not exists status text,
  add column if not exists error_code text;

comment on column public.ai_usage_logs.provider is 'AI provider used by Buddy, for example groq, google, or openai.';
comment on column public.ai_usage_logs.model is 'AI model used by Buddy for the request.';
comment on column public.ai_usage_logs.source is 'Credential source used by Buddy: platform_shared, student_key, or request_api_key.';
comment on column public.ai_usage_logs.status is 'Buddy AI request status such as success, shared_limit, student_key_required, provider_error, or rate_limited.';
comment on column public.ai_usage_logs.error_code is 'Controlled Buddy AI error code, when applicable.';

create index if not exists idx_ai_usage_logs_user_status_created_at
on public.ai_usage_logs (user_id, status, created_at desc);

commit;
