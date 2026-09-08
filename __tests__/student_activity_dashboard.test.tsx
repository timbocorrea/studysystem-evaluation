import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import StudentActivityDashboard from '../components/features/admin/StudentActivityDashboard';
import { AdminService } from '../services/AdminService';
import { StudentActivitySummary } from '../domain/admin';

const summary: StudentActivitySummary = {
  total_students: 1,
  total_attempts: 1,
  passed_attempts: 1,
  failed_attempts: 0,
  average_score: 88,
  total_logs: 1,
  active_students_7d: 1,
  active_students_30d: 1,
  last_activity_at: '2026-07-01T12:00:00.000Z',
};

const makeService = (overrides: Record<string, unknown> = {}) => ({
  getStudentActivitySummaryForStaff: vi.fn().mockResolvedValue(summary),
  getStudentQuizAttemptsForStaff: vi.fn().mockResolvedValue([{
    id: 'attempt-1',
    student_id: 'student-1',
    student_name: 'Aluno Teste',
    student_email: 'aluno@example.test',
    quiz_id: 'quiz-1',
    quiz_title: 'Quiz Seguro',
    lesson_id: 'lesson-1',
    lesson_title: 'Aula 1',
    module_id: 'module-1',
    module_title: 'Módulo 1',
    course_id: 'course-1',
    course_title: 'Curso Teste',
    score: 88,
    passed: true,
    attempt_number: 2,
    completed_at: '2026-07-01T12:00:00.000Z',
    created_at: '2026-07-01T12:00:00.000Z',
    answers_count: 4,
    attempt_mode: 'legacy',
  }]),
  getStudentActivityLogsForStaff: vi.fn().mockResolvedValue([{
    id: 'log-1',
    student_id: 'student-1',
    student_name: 'Aluno Teste',
    student_email: 'aluno@example.test',
    amount: 10,
    action_type: 'QUIZ_COMPLETED',
    description: 'Quiz concluído',
    created_at: '2026-07-01T12:00:00.000Z',
  }]),
  ...overrides,
}) as unknown as AdminService;

afterEach(cleanup);

describe('StudentActivityDashboard', () => {
  it('renders staff-scoped summary and attempt metadata', async () => {
    render(<StudentActivityDashboard adminService={makeService()} courses={[]} />);

    expect((await screen.findAllByText('Aluno Teste')).length).toBeGreaterThan(0);
    expect(screen.getByText('Curso Teste')).toBeInTheDocument();
    expect(screen.getAllByText('88.0%').length).toBeGreaterThan(0);
    expect(screen.queryByText(/correct_answer|submitted_answer/i)).not.toBeInTheDocument();
  });

  it('renders the empty attempt state', async () => {
    const service = makeService({
      getStudentQuizAttemptsForStaff: vi.fn().mockResolvedValue([]),
      getStudentActivityLogsForStaff: vi.fn().mockResolvedValue([]),
    });
    render(<StudentActivityDashboard adminService={service} courses={[]} />);

    expect(await screen.findByText('Nenhuma tentativa encontrada.')).toBeInTheDocument();
  });

  it('renders a recoverable loading error', async () => {
    const service = makeService({
      getStudentActivitySummaryForStaff: vi.fn().mockRejectedValue(new Error('Acesso negado')),
    });
    render(<StudentActivityDashboard adminService={service} courses={[]} />);

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Acesso negado'));
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument();
  });
});
