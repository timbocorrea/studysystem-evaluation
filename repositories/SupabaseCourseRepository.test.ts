import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { SupabaseCourseRepository } from './SupabaseCourseRepository';

describe('SupabaseCourseRepository.enrollInCourse', () => {
  it('calls the actor-bound RPC with only p_course_id', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: null });
    const from = vi.fn();
    const repository = new SupabaseCourseRepository({ rpc, from } as unknown as SupabaseClient);

    await repository.enrollInCourse('course-1');

    expect(rpc).toHaveBeenCalledOnce();
    expect(rpc).toHaveBeenCalledWith('self_enroll_course', { p_course_id: 'course-1' });
    expect(from).not.toHaveBeenCalled();
  });

  it('contains no direct STUDENT enrollment DML or legacy conflict fallback', () => {
    const source = readFileSync(resolve(process.cwd(), 'repositories/SupabaseCourseRepository.ts'), 'utf8');

    expect(source).not.toMatch(/23505|\.from\(['"]course_enrollments['"]\)\s*\.(insert|update|upsert|delete)/s);
    expect(source).not.toContain('unenrollFromCourse');
  });
});
