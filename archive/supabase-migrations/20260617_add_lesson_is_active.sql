-- Adds a soft-availability flag for lessons.
-- Inactive lessons remain editable by admins/instructors, but are hidden from student-facing course queries in the application layer.

alter table if exists public.lessons
  add column if not exists is_active boolean not null default true;

create index if not exists idx_lessons_module_active_position
  on public.lessons (module_id, is_active, position);

comment on column public.lessons.is_active is
  'Controls whether this lesson is available to enrolled students. Admins and instructors can keep inactive lessons for future use without deleting content.';
