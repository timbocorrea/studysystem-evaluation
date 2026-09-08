-- FASE 14J / CICLO 10C
-- Corrige o contrato da RPC public.get_random_bank_questions para alinhar com o cliente.
--
-- Contexto:
-- - O cliente chama a RPC com p_exclude_ids.
-- - A função existente em production possui apenas 5 parâmetros.
-- - Esta migration remove a assinatura antiga e cria a assinatura nova com p_exclude_ids uuid[] DEFAULT NULL.
--
-- Controles:
-- - Não altera tabelas.
-- - Não altera dados.
-- - Não altera Storage.
-- - Não altera policies de question_bank/question_bank_options.
-- - Mantém anon sem EXECUTE.
-- - Mantém authenticated com EXECUTE.
-- - Mantém SECURITY INVOKER.
-- - Define search_path seguro.

drop function if exists public.get_random_bank_questions(
  integer,
  uuid,
  uuid,
  uuid,
  text
);

create function public.get_random_bank_questions(
  p_count integer,
  p_course_id uuid default null::uuid,
  p_module_id uuid default null::uuid,
  p_lesson_id uuid default null::uuid,
  p_difficulty text default null::text,
  p_exclude_ids uuid[] default null::uuid[]
)
returns setof json
language plpgsql
security invoker
set search_path = public, pg_temp
as $function$
begin
  return query
  with filtered_questions as (
    select q.*
    from public.question_bank q
    where (p_course_id is null or q.course_id = p_course_id)
      and (p_module_id is null or q.module_id = p_module_id)
      and (p_lesson_id is null or q.lesson_id = p_lesson_id)
      and (p_difficulty is null or q.difficulty = p_difficulty)
      and (
        p_exclude_ids is null
        or array_length(p_exclude_ids, 1) is null
        or q.id <> all (p_exclude_ids)
      )
    order by random()
    limit greatest(0, least(coalesce(p_count, 0), 200))
  )
  select row_to_json(q_data)
  from (
    select
      fq.*,
      coalesce(
        (
          select json_agg(row_to_json(opt))
          from (
            select *
            from public.question_bank_options
            where question_id = fq.id
            order by position
          ) opt
        ),
        '[]'::json
      ) as question_bank_options
    from filtered_questions fq
  ) q_data;
end;
$function$;

revoke all on function public.get_random_bank_questions(
  integer,
  uuid,
  uuid,
  uuid,
  text,
  uuid[]
) from public;

revoke all on function public.get_random_bank_questions(
  integer,
  uuid,
  uuid,
  uuid,
  text,
  uuid[]
) from anon;

grant execute on function public.get_random_bank_questions(
  integer,
  uuid,
  uuid,
  uuid,
  text,
  uuid[]
) to authenticated;

notify pgrst, 'reload schema';
