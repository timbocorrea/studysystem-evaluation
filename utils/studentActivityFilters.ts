import { StudentActivityFilters } from '../domain/admin';

const cleanId = (value?: string | null): string | null => {
  const cleaned = value?.trim();
  return cleaned ? cleaned : null;
};

const cleanDate = (value?: string | null, endOfDay = false): string | null => {
  const cleaned = cleanId(value);
  if (!cleaned) return null;

  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(cleaned);
  const date = new Date(dateOnly
    ? `${cleaned}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}Z`
    : cleaned);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const clampLimit = (value: number | undefined, fallback: number): number => {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(Math.max(Math.trunc(value as number), 1), 500);
};

export const normalizeStudentActivityFilters = (
  filters: StudentActivityFilters = {}
): Required<StudentActivityFilters> => {
  const from = cleanDate(filters.from);
  const to = cleanDate(filters.to, true);

  return {
    studentId: cleanId(filters.studentId),
    courseId: cleanId(filters.courseId),
    quizId: cleanId(filters.quizId),
    actionType: cleanId(filters.actionType),
    from,
    to: from && to && new Date(to) < new Date(from) ? from : to,
    attemptLimit: clampLimit(filters.attemptLimit, 100),
    logLimit: clampLimit(filters.logLimit, 100),
  };
};
