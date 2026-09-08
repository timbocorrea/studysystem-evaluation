-- STUDYSYSTEM-2026
-- FASE 14K-1 — Versionamento e hardening da RPC public.submit_quiz_attempt
--
-- Contexto:
-- - Diagnostico read-only confirmou que public.submit_quiz_attempt existe no banco remoto,
--   mas nao foi localizada nas migrations do repositorio.
-- - A funcao e critica para o fluxo de quiz tradicional, pois calcula score server-side
--   usando public.quiz_options.is_correct e registra public.quiz_attempts.
--
-- Escopo desta migration:
-- - Versiona a funcao public.submit_quiz_attempt(p_quiz_id uuid, p_answers jsonb).
-- - Preserva o contrato atual: retorna json.
-- - Preserva a logica funcional atual de correcao server-side.
-- - Mantem SECURITY DEFINER, necessario para leitura server-side de quiz_options.is_correct.
-- - Adiciona search_path explicito e seguro: public, pg_temp.
-- - Revoga EXECUTE de public/anon e concede apenas para authenticated.
-- - Nao altera tabelas.
-- - Nao altera dados.
-- - Nao altera RLS/policies.
-- - Nao altera Storage.
-- - Nao altera fluxo de frontend.

create or replace function public.submit_quiz_attempt(
  p_quiz_id uuid,
  p_answers jsonb
)
returns json
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid;
  v_passing_score numeric;
  v_total_points numeric := 0;
  v_earned_points numeric := 0;
  v_score_percent numeric;
  v_passed boolean;
  v_attempt_num integer;
  v_result json;
  q record;
  v_option_id uuid;
  v_is_correct boolean;
  v_points numeric;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select passing_score
    into v_passing_score
  from public.quizzes
  where id = p_quiz_id;

  if v_passing_score is null then
    raise exception 'Quiz not found';
  end if;

  for q in
    select id, points
    from public.quiz_questions
    where quiz_id = p_quiz_id
  loop
    v_points := coalesce(q.points, 10);
    v_total_points := v_total_points + v_points;

    if p_answers ? q.id::text then
      v_option_id := (p_answers ->> q.id::text)::uuid;

      select qo.is_correct
        into v_is_correct
      from public.quiz_options qo
      where qo.id = v_option_id
        and qo.question_id = q.id;

      if coalesce(v_is_correct, false) then
        v_earned_points := v_earned_points + v_points;
      end if;
    end if;
  end loop;

  if v_total_points > 0 then
    v_score_percent := round((v_earned_points / v_total_points) * 100, 2);
  else
    v_score_percent := 0;
  end if;

  v_passed := v_score_percent >= v_passing_score;

  select count(*) + 1
    into v_attempt_num
  from public.quiz_attempts
  where user_id = v_user_id
    and quiz_id = p_quiz_id;

  insert into public.quiz_attempts (
    user_id,
    quiz_id,
    score,
    passed,
    answers,
    attempt_number,
    completed_at
  )
  values (
    v_user_id,
    p_quiz_id,
    v_score_percent,
    v_passed,
    p_answers,
    v_attempt_num,
    now()
  )
  returning row_to_json(quiz_attempts.*)
    into v_result;

  return v_result;
end;
$$;

revoke all on function public.submit_quiz_attempt(uuid, jsonb) from public;
revoke all on function public.submit_quiz_attempt(uuid, jsonb) from anon;
revoke all on function public.submit_quiz_attempt(uuid, jsonb) from authenticated;

grant execute on function public.submit_quiz_attempt(uuid, jsonb) to authenticated;

notify pgrst, 'reload schema';
