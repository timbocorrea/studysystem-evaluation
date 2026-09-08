-- STUDYSYSTEM-2026 / Ciclo 9B
-- Nullable schema readiness for public.lesson_resources storage metadata.
-- This migration is versioned for review only in this cycle. Do not apply to
-- production before Analista Mestre approval and staging validation.
--
-- Scope:
-- - Add nullable metadata columns for future bucket/path/provider migration.
-- - Keep the legacy url column untouched.
-- - Do not update existing rows.
-- - Do not change RLS, storage.objects, storage.buckets, RPCs or policies.

alter table public.lesson_resources
  add column if not exists storage_provider text,
  add column if not exists storage_bucket text,
  add column if not exists storage_path text,
  add column if not exists mime_type text,
  add column if not exists file_size_bytes bigint,
  add column if not exists original_filename text,
  add column if not exists migrated_at timestamptz;

comment on column public.lesson_resources.storage_provider is
  'Nullable storage provider for future hybrid resource resolution. Expected values: external_url, supabase_storage, google_drive, dropbox, unknown.';
comment on column public.lesson_resources.storage_bucket is
  'Nullable Supabase Storage bucket for resources stored in Supabase. Kept null for external legacy URLs.';
comment on column public.lesson_resources.storage_path is
  'Nullable bucket-relative path for future signed URL generation. Do not store signed URLs here.';
comment on column public.lesson_resources.mime_type is
  'Nullable MIME type captured from controlled uploads when available.';
comment on column public.lesson_resources.file_size_bytes is
  'Nullable file size in bytes captured from controlled uploads when available.';
comment on column public.lesson_resources.original_filename is
  'Nullable sanitized original filename for display/audit. Do not store local paths or secrets.';
comment on column public.lesson_resources.migrated_at is
  'Nullable timestamp used only when a controlled backfill populates storage metadata.';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'lesson_resources_storage_provider_check'
      and conrelid = 'public.lesson_resources'::regclass
  ) then
    alter table public.lesson_resources
      add constraint lesson_resources_storage_provider_check
      check (
        storage_provider is null
        or storage_provider in ('external_url', 'supabase_storage', 'google_drive', 'dropbox', 'unknown')
      ) not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'lesson_resources_supabase_storage_ref_check'
      and conrelid = 'public.lesson_resources'::regclass
  ) then
    alter table public.lesson_resources
      add constraint lesson_resources_supabase_storage_ref_check
      check (
        storage_provider is distinct from 'supabase_storage'
        or (
          nullif(btrim(storage_bucket), '') is not null
          and nullif(btrim(storage_path), '') is not null
        )
      ) not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'lesson_resources_file_size_bytes_check'
      and conrelid = 'public.lesson_resources'::regclass
  ) then
    alter table public.lesson_resources
      add constraint lesson_resources_file_size_bytes_check
      check (file_size_bytes is null or file_size_bytes >= 0) not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'lesson_resources_storage_path_safe_check'
      and conrelid = 'public.lesson_resources'::regclass
  ) then
    alter table public.lesson_resources
      add constraint lesson_resources_storage_path_safe_check
      check (
        storage_path is null
        or (
          storage_path not like '/%'
          and storage_path not like '%..%'
          and position(chr(92) in storage_path) = 0
        )
      ) not valid;
  end if;
end
$$;

create index if not exists lesson_resources_lesson_id_idx
  on public.lesson_resources (lesson_id);

create index if not exists lesson_resources_storage_provider_idx
  on public.lesson_resources (storage_provider);

create index if not exists lesson_resources_storage_bucket_path_idx
  on public.lesson_resources (storage_bucket, storage_path)
  where storage_bucket is not null
    and storage_path is not null;
