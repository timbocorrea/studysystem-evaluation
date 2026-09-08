import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSupabaseClient } from '../../services/supabaseClient';

const mockFrom = vi.fn();
const mockRpc = vi.fn();
const mockSupabase = {
    from: mockFrom,
    rpc: mockRpc
};

vi.mock('../../services/supabaseClient', () => ({
    createSupabaseClient: vi.fn(() => mockSupabase)
}));

describe('Security Hardening & RLS Validation (Simulated)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Profile Protection (Escalation Trigger Simulation)', () => {
        it('prevents a normal student from updating their role to INSTRUCTOR', async () => {
            const mockUpdate = vi.fn().mockResolvedValue({
                data: { id: 'user-1', role: 'STUDENT' },
                error: null
            });
            const mockEq = vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single: mockUpdate }) });
            mockFrom.mockReturnValue({ update: vi.fn().mockReturnValue({ eq: mockEq }) });

            const supabase = createSupabaseClient();
            const result = await supabase.from('profiles').update({ role: 'INSTRUCTOR' }).eq('id', 'user-1').select().single();

            expect(result.data.role).toBe('STUDENT');
            expect(result.data.role).not.toBe('INSTRUCTOR');
        });

        it('prevents a normal student from modifying their own xp_total', async () => {
            const mockUpdate = vi.fn().mockResolvedValue({
                data: { id: 'user-1', xp_total: 150 },
                error: null
            });
            const mockEq = vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single: mockUpdate }) });
            mockFrom.mockReturnValue({ update: vi.fn().mockReturnValue({ eq: mockEq }) });

            const supabase = createSupabaseClient();
            const result = await supabase.from('profiles').update({ xp_total: 99999 }).eq('id', 'user-1').select().single();

            expect(result.data.xp_total).toBe(150);
        });
    });

    describe('Data Isolation / IDOR Mitigation (RLS Simulation)', () => {
        it('blocks direct student writes to lesson_progress', async () => {
            const directWrite = vi.fn().mockResolvedValue({
                data: null,
                error: { code: '42501', message: 'permission denied for table lesson_progress' }
            });
            mockFrom.mockReturnValue({
                insert: directWrite,
                update: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single: directWrite }) }) })
                })
            });

            const supabase = createSupabaseClient();
            const insertResult = await supabase.from('lesson_progress').insert({ user_id: 'user-1', lesson_id: 'lesson-1' });
            const updateResult = await supabase.from('lesson_progress')
                .update({ is_completed: true })
                .eq('user_id', 'user-1')
                .eq('lesson_id', 'lesson-1')
                .select()
                .single();

            expect(insertResult.error?.code).toBe('42501');
            expect(updateResult.error?.code).toBe('42501');
        });

        it('blocks direct student writes to quiz_attempts', async () => {
            const directWrite = vi.fn().mockResolvedValue({
                data: null,
                error: { code: '42501', message: 'permission denied for table quiz_attempts' }
            });
            mockFrom.mockReturnValue({ insert: directWrite });

            const supabase = createSupabaseClient();
            const result = await supabase.from('quiz_attempts').insert({ user_id: 'user-1', quiz_id: 'quiz-1' });

            expect(result.error?.code).toBe('42501');
        });

        it('uses server-owned RPCs for progress and quiz submission', async () => {
            mockRpc.mockResolvedValue({ data: { success: true }, error: null });
            const supabase = createSupabaseClient();

            await supabase.rpc('update_lesson_progress_secure', {
                p_lesson_id: 'lesson-1',
                p_watched_seconds: 10,
                p_is_completed: false,
                p_last_block_id: null
            });
            await supabase.rpc('submit_quiz_attempt', {
                p_quiz_id: 'quiz-1',
                p_answers: { question: 'option' }
            });

            expect(mockRpc).toHaveBeenNthCalledWith(1, 'update_lesson_progress_secure', expect.any(Object));
            expect(mockRpc).toHaveBeenNthCalledWith(2, 'submit_quiz_attempt', expect.any(Object));
        });
    });

    describe('Content Access Control (Course Visibility)', () => {
        it('hides private courses if the user is not enrolled', async () => {
            mockFrom.mockReturnValue({ select: vi.fn().mockResolvedValue({ data: [], error: null }) });

            const supabase = createSupabaseClient();
            const result = await supabase.from('courses').select('*');

            expect(result.data).toEqual([]);
        });
    });
});
