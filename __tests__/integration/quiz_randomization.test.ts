import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { SupabaseQuestionBankRepository } from '../../repositories/SupabaseQuestionBankRepository';

const allowedRecoveryMigrations = new Set([
    'supabase/migrations/20260902153144_20260901190945_strip_quiz_justification_from_student_payloads.sql',
    'supabase/migrations/20260902153936_20260901210000_add_authorized_quiz_feedback.sql',
]);

type MockClientOptions = {
    rpcData?: ReturnType<typeof questionRow>[];
    rpcError?: { message: string } | null;
    fallbackData?: ReturnType<typeof questionRow>[];
    fallbackError?: { message: string } | null;
};

function questionRow(id: string) {
    return {
        id,
        question_text: `Question ${id}`,
        image_url: null,
        image_alt: null,
        difficulty: 'medium',
        points: 1,
        course_id: null,
        module_id: null,
        lesson_id: null,
        question_bank_options: [
            {
                id: `${id}-correct`,
                question_id: id,
                option_text: 'Correct option',
                is_correct: true,
                position: 1,
            },
            {
                id: `${id}-incorrect`,
                question_id: id,
                option_text: 'Incorrect option',
                is_correct: false,
                position: 2,
            },
        ],
        courses: null,
        modules: null,
        lessons: null,
    };
}

function createMockClient({
    rpcData = [],
    rpcError = null,
    fallbackData = [],
    fallbackError = null,
}: MockClientOptions = {}) {
    const limit = vi.fn().mockResolvedValue({
        data: fallbackData,
        error: fallbackError,
    });
    const query: Record<string, ReturnType<typeof vi.fn>> = {};
    query.eq = vi.fn(() => query);
    query.order = vi.fn(() => ({ limit }));

    const select = vi.fn(() => query);
    const from = vi.fn(() => ({ select }));
    const rpc = vi.fn().mockResolvedValue({
        data: rpcData,
        error: rpcError,
    });

    return {
        client: { rpc, from },
        spies: { rpc, from, select, limit },
    };
}

describe('Quiz Randomization Logic', () => {
    it('excludes specified IDs when the deterministic fallback is used', async () => {
        const { client, spies } = createMockClient({
            rpcError: { message: 'RPC unavailable in test' },
            fallbackData: [questionRow('excluded'), questionRow('kept-1'), questionRow('kept-2')],
        });
        const repo = new SupabaseQuestionBankRepository(client as any);

        const questions = await repo.getRandomQuestions(2, {
            excludeIds: ['excluded'],
        });

        expect(questions.map((question) => question.id)).not.toContain('excluded');
        expect(questions).toHaveLength(2);
        expect(spies.from).toHaveBeenCalledWith('question_bank');
    });

    it('passes the requested count to the RPC and respects its result', async () => {
        const { client, spies } = createMockClient({
            rpcData: [questionRow('rpc-question')],
        });
        const repo = new SupabaseQuestionBankRepository(client as any);

        const questions = await repo.getRandomQuestions(1, {});

        expect(spies.rpc).toHaveBeenCalledWith('get_random_bank_questions', {
            p_count: 1,
            p_course_id: null,
            p_module_id: null,
            p_lesson_id: null,
            p_difficulty: null,
            p_exclude_ids: null,
        });
        expect(questions).toHaveLength(1);
        expect(spies.from).not.toHaveBeenCalled();
    });

    it('falls back to a bounded local pool without a backend connection', async () => {
        const { client, spies } = createMockClient({
            rpcError: { message: 'RPC unavailable in test' },
            fallbackData: [questionRow('fallback-1'), questionRow('fallback-2'), questionRow('fallback-3')],
        });
        const repo = new SupabaseQuestionBankRepository(client as any);

        const questions = await repo.getRandomQuestions(2, {});

        expect(questions).toHaveLength(2);
        expect(spies.limit).toHaveBeenCalledWith(30);
        expect(spies.from).toHaveBeenCalledTimes(1);
    });

    describe('Student Random Questions Retrieval (FASE 14K-4)', () => {
        it('calls get_random_bank_questions_for_student RPC and returns options with isCorrect = false and answerKeyHidden = true', async () => {
            const { client, spies } = createMockClient({
                rpcData: [questionRow('student-question')],
            });
            const repo = new SupabaseQuestionBankRepository(client as any);

            const questions = await repo.getRandomQuestionsForStudent(1, {});

            expect(spies.rpc).toHaveBeenCalledWith('get_random_bank_questions_for_student', {
                p_count: 1,
                p_course_id: null,
                p_module_id: null,
                p_lesson_id: null,
                p_difficulty: null,
                p_exclude_ids: null,
            });
            expect(questions).toHaveLength(1);
            expect(questions[0].answerKeyHidden).toBe(true);
            expect(questions[0].options[0].isCorrect).toBe(false);
        });

        it('fails closed when the student RPC is unavailable', async () => {
            const { client, spies } = createMockClient({
                rpcError: { message: 'RPC unavailable in test' },
            });
            const repo = new SupabaseQuestionBankRepository(client as any);

            await expect(repo.getRandomQuestionsForStudent(2, {})).rejects.toThrow();

            expect(spies.from).not.toHaveBeenCalled();
        });
    });
});

describe('Question bank direct access closure', () => {
    const migrationPath = resolve(
        process.cwd(),
        'supabase/migrations/20260831155222_close_question_bank_direct_access_scope.sql'
    );
    const migration = readFileSync(migrationPath, 'utf8');
    const normalizedMigration = migration.replace(/\r\n?/g, '\n');
    const tables = ['question_bank', 'question_bank_options'];
    const legacyPolicies = [
        'Admins/Instructors can do everything on',
        'Allow admin all on',
        'Allow public select on',
        'Authenticated users can select from',
    ];
    it('applies fail-closed staff-only policies and grants to both tables', () => {
        expect(migration).toContain('BEGIN;');
        expect(migration).toContain("NOTIFY pgrst, 'reload schema';");
        expect(migration).toContain('COMMIT;');
        expect(migration).toContain('public.is_instructor()');
        expect(migration).not.toContain('is_instructor(auth.uid())');
        expect(migration).not.toContain('is_instructor(uuid)');
        expect(migration).not.toContain('is_master(');
        expect(migration).not.toMatch(/FORCE ROW LEVEL SECURITY/i);
        expect(migration).not.toMatch(/GRANT[^;\n]*(TRUNCATE|REFERENCES|TRIGGER|MAINTAIN)/i);
        expect(migration).not.toMatch(/TO\s+(PUBLIC|anon)\b/i);

        for (const table of tables) {
            expect(migration).toContain(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY;`);
            expect(migration).toContain(
                `REVOKE ALL PRIVILEGES ON TABLE public.${table} FROM PUBLIC, anon, authenticated;`
            );
            expect(migration).toContain(
                `GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.${table} TO authenticated;`
            );

            for (const policyPrefix of legacyPolicies) {
                expect(migration).toContain(
                    `DROP POLICY IF EXISTS "${policyPrefix} ${table}" ON public.${table};`
                );
            }

            expect(migration.match(new RegExp(`CREATE POLICY ${table}_staff_`, 'g')) ?? []).toHaveLength(4);
        }

        expect(normalizedMigration.match(/\nTO authenticated\n/g) ?? []).toHaveLength(8);
        expect(migration.match(/public\.is_instructor\(\)/g) ?? []).toHaveLength(10);
        expect(normalizedMigration).toContain('USING (public.is_instructor())\nWITH CHECK (public.is_instructor());');
        expect(migration).toContain('question_bank_options_staff_update');
    });

    it('preserves every historical migration byte-for-byte', () => {
        const migrationChanges = execFileSync(
            'git',
            ['diff', '--name-only', 'origin/main...HEAD', '--', 'supabase/migrations'],
            { encoding: 'utf8' }
        )
            .trim()
            .split(/\r?\n/)
            .filter(Boolean)
            .filter((relativePath) => !allowedRecoveryMigrations.has(relativePath))

        expect(migrationChanges).toEqual([]);
    });

    it('keeps the recovery migration allowlist explicit and closed', () => {
        const expectedRecoveryMigrations = [
            'supabase/migrations/20260902153144_20260901190945_strip_quiz_justification_from_student_payloads.sql',
            'supabase/migrations/20260902153936_20260901210000_add_authorized_quiz_feedback.sql',
        ];

        expect(allowedRecoveryMigrations.size).toBe(2);
        expect([...allowedRecoveryMigrations]).toEqual(expectedRecoveryMigrations);

        const unexpectedMigration = 'supabase/migrations/20260901999999_unexpected.sql';
        expect([...expectedRecoveryMigrations, unexpectedMigration].filter((relativePath) =>
            !allowedRecoveryMigrations.has(relativePath)
        )).toEqual([unexpectedMigration]);
    });
});

describe('Student quiz payload justification sanitization contract', () => {
    const migrationRelativePath =
        'supabase/migrations/20260902153144_20260901190945_strip_quiz_justification_from_student_payloads.sql';
    const migrationPath = resolve(process.cwd(), migrationRelativePath);
    const migration = readFileSync(migrationPath, 'utf8');
    const normalizedMigration = migration.replace(/\r\n?/g, '\n');

    it('keeps student RPCs safe while stripping textual justifications', () => {
        expect(migration).toContain('create or replace function public.get_lesson_quiz_for_student(');
        expect(migration).toContain('create or replace function public.get_random_bank_questions_for_student(');
        expect(migration.match(/btrim\(\s*regexp_replace\(/g) ?? []).toHaveLength(2);
        expect(migration).toContain('qq.question_text');
        expect(migration).toContain('fq.question_text');
        expect(migration).toContain("E'\\\\s*\\\\*+Justificativa:\\\\*+.*$'");
        expect(migration.match(/security definer/gi) ?? []).toHaveLength(2);
        expect(normalizedMigration.match(/set search_path = public, pg_temp/g) ?? []).toHaveLength(2);
        expect(migration).not.toMatch(/grant execute on function[^;]+\bto\s+(public|anon)\b/i);
        expect(migration.match(/grant execute on function[^;]+\bto\s+authenticated\b/gi) ?? []).toHaveLength(2);
        expect(migration).not.toMatch(/'is_correct'\s*,\s*true/i);
        expect(migration).toContain("'is_correct', false");
        expect(migration).toMatch(/notify\s+pgrst,\s*'reload schema';/i);
        expect(migration).toMatch(/begin\s*;/i);
        expect(migration).toMatch(/commit\s*;/i);
    });

    it('does not modify historical migration files', () => {
        const changedMigrations = execFileSync(
            'git',
            ['diff', '--name-only', 'origin/main', '--', 'supabase/migrations'],
            { encoding: 'utf8' }
        )
            .trim()
            .split(/\r?\n/)
            .filter(Boolean)
            .filter((relativePath) => !allowedRecoveryMigrations.has(relativePath));

        expect(changedMigrations).toEqual([]);
    });
});
