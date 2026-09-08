-- AUDIT LOG 1C
-- Hardening da RPC append_audit_log e grants/policies de public.audit_logs.
-- Escopo:
-- 1. manter escrita via RPC SECURITY DEFINER;
-- 2. fixar search_path = public, pg_temp;
-- 3. remover grants diretos perigosos de anon/authenticated em audit_logs;
-- 4. manter SELECT para authenticated via RLS;
-- 5. manter EXECUTE da RPC apenas para authenticated/postgres/service_role.

begin;

create or replace function public.append_audit_log(
    p_session_id uuid,
    p_path text,
    p_page_title text,
    p_resource_title text,
    p_new_events jsonb,
    p_stats_delta jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
    v_user_id uuid;
    v_existing_id uuid;
    v_updated_stats jsonb;
    v_updated_events jsonb;
    v_total_duration integer;
    v_active_duration integer;
begin
    v_user_id := auth.uid();

    if v_user_id is null then
        raise exception 'Not authenticated';
    end if;

    select id, interaction_stats, events, active_duration_seconds
    into v_existing_id, v_updated_stats, v_updated_events, v_active_duration
    from public.audit_logs
    where session_id = p_session_id
      and user_id = v_user_id
    limit 1;

    if v_existing_id is not null then
        with delta_items as (
            select key, value::int as val
            from jsonb_each_text(coalesce(p_stats_delta, '{}'::jsonb))
        ),
        existing_items as (
            select key, value::int as val
            from jsonb_each_text(coalesce(v_updated_stats, '{}'::jsonb))
        ),
        combined as (
            select
                coalesce(e.key, d.key) as key,
                coalesce(e.val, 0) + coalesce(d.val, 0) as total
            from existing_items e
            full outer join delta_items d on e.key = d.key
        )
        select coalesce(jsonb_object_agg(key, total), '{}'::jsonb)
        into v_updated_stats
        from combined;

        v_updated_events := coalesce(v_updated_events, '[]'::jsonb) || coalesce(p_new_events, '[]'::jsonb);

        v_total_duration := coalesce((v_updated_stats->>'total_time')::int, 0);
        v_active_duration := coalesce((v_updated_stats->>'active_time')::int, 0);

        update public.audit_logs
        set
            interaction_stats = v_updated_stats,
            events = v_updated_events,
            total_duration_seconds = v_total_duration,
            active_duration_seconds = v_active_duration,
            updated_at = now()
        where id = v_existing_id;

        return jsonb_build_object('status', 'updated', 'id', v_existing_id);
    else
        insert into public.audit_logs (
            user_id,
            session_id,
            path,
            page_title,
            resource_title,
            interaction_stats,
            events,
            total_duration_seconds,
            active_duration_seconds
        ) values (
            v_user_id,
            p_session_id,
            p_path,
            p_page_title,
            p_resource_title,
            coalesce(p_stats_delta, '{}'::jsonb),
            coalesce(p_new_events, '[]'::jsonb),
            coalesce((p_stats_delta->>'total_time')::int, 0),
            coalesce((p_stats_delta->>'active_time')::int, 0)
        )
        returning id into v_existing_id;

        return jsonb_build_object('status', 'created', 'id', v_existing_id);
    end if;
end;
$function$;

revoke all on function public.append_audit_log(uuid, text, text, text, jsonb, jsonb) from public;
revoke all on function public.append_audit_log(uuid, text, text, text, jsonb, jsonb) from anon;
grant execute on function public.append_audit_log(uuid, text, text, text, jsonb, jsonb) to authenticated;
grant execute on function public.append_audit_log(uuid, text, text, text, jsonb, jsonb) to postgres;
grant execute on function public.append_audit_log(uuid, text, text, text, jsonb, jsonb) to service_role;

alter table public.audit_logs enable row level security;
alter table public.audit_logs no force row level security;

drop policy if exists "Users can view own audit logs" on public.audit_logs;
drop policy if exists "Instructors can view all audit logs" on public.audit_logs;

create policy "Users can view own audit logs"
on public.audit_logs
for select
to authenticated
using (auth.uid() = user_id);

create policy "Instructors can view all audit logs"
on public.audit_logs
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'INSTRUCTOR'::text
  )
);

revoke all on table public.audit_logs from anon;
revoke insert, update, delete, truncate, references, trigger on table public.audit_logs from authenticated;
grant select on table public.audit_logs to authenticated;

commit;
