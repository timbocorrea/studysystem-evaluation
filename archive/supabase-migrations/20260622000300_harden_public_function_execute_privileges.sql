-- Harden public function EXECUTE privileges.
-- Context: Security/LGPD audit identified application functions in public schema
-- executable by anon/PUBLIC, including SECURITY DEFINER functions.
-- This migration revokes anon/PUBLIC execution from non-extension public functions
-- and preserves authenticated access only where it already existed.

do $$
declare
  r record;
begin
  for r in
    select
      p.oid,
      p.proname as function_name,
      pg_get_function_identity_arguments(p.oid) as args,
      has_function_privilege('authenticated', p.oid, 'EXECUTE') as had_authenticated_execute
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    left join pg_depend d
      on d.objid = p.oid
     and d.deptype = 'e'
    left join pg_extension e
      on e.oid = d.refobjid
    where n.nspname = 'public'
      and p.prokind = 'f'
      and e.extname is null
      and (
        has_function_privilege('anon', p.oid, 'EXECUTE') = true
        or has_function_privilege('public', p.oid, 'EXECUTE') = true
      )
  loop
    execute format(
      'revoke all on function public.%I(%s) from anon, public',
      r.function_name,
      r.args
    );

    if r.had_authenticated_execute then
      execute format(
        'grant execute on function public.%I(%s) to authenticated',
        r.function_name,
        r.args
      );
    end if;
  end loop;
end $$;

notify pgrst, 'reload schema';
