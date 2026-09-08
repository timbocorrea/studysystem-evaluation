-- STUDYSYSTEM-2026
-- FASE 14K-7
-- Compatibilidade de schema para RPCs de pool/question_bank do PR #31.
--
-- Contexto:
-- - As RPCs de pool usam public.quizzes.course_id/module_id.
-- - As RPCs filtram public.question_bank.status.
-- - Em bases existentes, essas colunas podem não existir.
--
-- Estratégia:
-- - Adicionar colunas de forma idempotente e nullable.
-- - Backfill de course_id/module_id em quizzes a partir de lesson -> module -> course.
-- - Status padrão active para questões existentes e futuras.
-- - Não altera RLS, não cria dados e não expõe gabarito.

alter table if exists public.quizzes
  add column if not exists course_id uuid;

alter table if exists public.quizzes
  add column if not exists module_id uuid;

alter table if exists public.question_bank
  add column if not exists status text default 'active';

update public.question_bank
set status = 'active'
where status is null;

update public.quizzes q
set
  module_id = coalesce(q.module_id, l.module_id),
  course_id = coalesce(q.course_id, m.course_id)
from public.lessons l
join public.modules m
  on m.id = l.module_id
where q.lesson_id = l.id
  and (q.module_id is null or q.course_id is null);

create index if not exists idx_quizzes_course_id
  on public.quizzes(course_id);

create index if not exists idx_quizzes_module_id
  on public.quizzes(module_id);

create index if not exists idx_question_bank_status_scope
  on public.question_bank(status, course_id, module_id, lesson_id);

notify pgrst, 'reload schema';
