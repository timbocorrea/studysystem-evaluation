import { describe, expect, it } from 'vitest';
import { normalizeStudentActivityFilters } from '../utils/studentActivityFilters';

describe('normalizeStudentActivityFilters', () => {
  it('trims identifiers, expands date boundaries and applies defaults', () => {
    expect(normalizeStudentActivityFilters({
      studentId: ' student-1 ',
      courseId: ' ',
      from: '2026-07-01',
      to: '2026-07-02',
    })).toEqual({
      studentId: 'student-1',
      courseId: null,
      quizId: null,
      actionType: null,
      from: '2026-07-01T00:00:00.000Z',
      to: '2026-07-02T23:59:59.999Z',
      attemptLimit: 100,
      logLimit: 100,
    });
  });

  it('clamps limits and discards invalid dates', () => {
    const result = normalizeStudentActivityFilters({
      from: 'not-a-date',
      attemptLimit: 0,
      logLimit: 900,
    });

    expect(result.from).toBeNull();
    expect(result.attemptLimit).toBe(1);
    expect(result.logLimit).toBe(500);
  });

  it('prevents an inverted date interval', () => {
    const result = normalizeStudentActivityFilters({
      from: '2026-07-10',
      to: '2026-07-01',
    });

    expect(result.to).toBe(result.from);
  });
});
