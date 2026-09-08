import React, { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  Filter,
  RefreshCw,
  RotateCcw,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import { Course } from '@/domain/entities';
import {
  StaffActivityLogRecord,
  StaffQuizAttemptRecord,
  StudentActivityFilters,
  StudentActivitySummary,
} from '@/domain/admin';
import { AdminService } from '@/services/AdminService';

type StudentActivityDashboardProps = {
  adminService: AdminService;
  courses: Course[];
};

type FilterForm = {
  studentId: string;
  courseId: string;
  quizId: string;
  actionType: string;
  from: string;
  to: string;
};

const EMPTY_FILTERS: FilterForm = {
  studentId: '',
  courseId: '',
  quizId: '',
  actionType: '',
  from: '',
  to: '',
};

const EMPTY_SUMMARY: StudentActivitySummary = {
  total_students: 0,
  total_attempts: 0,
  passed_attempts: 0,
  failed_attempts: 0,
  average_score: null,
  total_logs: 0,
  active_students_7d: 0,
  active_students_30d: 0,
  last_activity_at: null,
};

const formatDateTime = (value: string | null): string => {
  if (!value) return 'Sem atividade';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Data indisponível'
    : new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(date);
};

const formatScore = (value: number | null): string =>
  value === null ? '-' : `${Number(value).toFixed(1)}%`;

const toFilters = (form: FilterForm): StudentActivityFilters => ({
  studentId: form.studentId,
  courseId: form.courseId,
  quizId: form.quizId,
  actionType: form.actionType,
  from: form.from,
  to: form.to,
});

const StudentActivityDashboard: React.FC<StudentActivityDashboardProps> = ({
  adminService,
  courses,
}) => {
  const [filters, setFilters] = useState<FilterForm>(EMPTY_FILTERS);
  const [attempts, setAttempts] = useState<StaffQuizAttemptRecord[]>([]);
  const [logs, setLogs] = useState<StaffActivityLogRecord[]>([]);
  const [summary, setSummary] = useState<StudentActivitySummary>(EMPTY_SUMMARY);
  const [activeTab, setActiveTab] = useState<'attempts' | 'logs'>('attempts');
  const [selectedAttempt, setSelectedAttempt] = useState<StaffQuizAttemptRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastAppliedFilters, setLastAppliedFilters] = useState<StudentActivityFilters>({});

  const loadData = useCallback(async (nextFilters: StudentActivityFilters = {}) => {
    setLoading(true);
    setError(null);
    try {
      const [nextSummary, nextAttempts, nextLogs] = await Promise.all([
        adminService.getStudentActivitySummaryForStaff(nextFilters),
        adminService.getStudentQuizAttemptsForStaff(nextFilters),
        adminService.getStudentActivityLogsForStaff(nextFilters),
      ]);
      setSummary(nextSummary);
      setAttempts(nextAttempts);
      setLogs(nextLogs);
      setLastAppliedFilters(nextFilters);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar o acompanhamento.');
    } finally {
      setLoading(false);
    }
  }, [adminService]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const students = useMemo(() => {
    const byId = new Map<string, { id: string; name: string; email: string }>();
    attempts.forEach(attempt => byId.set(attempt.student_id, {
      id: attempt.student_id,
      name: attempt.student_name || attempt.student_email,
      email: attempt.student_email,
    }));
    logs.forEach(log => byId.set(log.student_id, {
      id: log.student_id,
      name: log.student_name || log.student_email,
      email: log.student_email,
    }));
    return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [attempts, logs]);

  const quizzes = useMemo(() => {
    const byId = new Map<string, { id: string; title: string }>();
    attempts.forEach(attempt => byId.set(attempt.quiz_id, {
      id: attempt.quiz_id,
      title: attempt.quiz_title,
    }));
    return [...byId.values()].sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'));
  }, [attempts]);

  const actionTypes = useMemo(
    () => [...new Set(logs.map(log => log.action_type))].sort(),
    [logs]
  );

  const applyFilters = (event: FormEvent) => {
    event.preventDefault();
    void loadData(toFilters(filters));
  };

  const clearFilters = () => {
    setFilters(EMPTY_FILTERS);
    void loadData({});
  };

  const summaryCards = [
    { label: 'Alunos no escopo', value: summary.total_students, icon: Users, color: 'text-sky-600 bg-sky-50 dark:bg-sky-500/10' },
    { label: 'Tentativas', value: summary.total_attempts, icon: ClipboardList, color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-500/10' },
    { label: 'Aprovadas', value: summary.passed_attempts, icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10' },
    { label: 'Não aprovadas', value: summary.failed_attempts, icon: XCircle, color: 'text-rose-600 bg-rose-50 dark:bg-rose-500/10' },
    { label: 'Média', value: formatScore(summary.average_score), icon: BookOpen, color: 'text-amber-700 bg-amber-50 dark:bg-amber-500/10' },
    { label: 'Ativos em 7 dias', value: summary.active_students_7d, icon: Activity, color: 'text-teal-600 bg-teal-50 dark:bg-teal-500/10' },
  ];

  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Acompanhamento de alunos</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Tentativas de quiz e registros de atividade no seu escopo.
            </p>
          </div>
          <button
            type="button"
            title="Atualizar dados"
            onClick={() => void loadData(lastAppliedFilters)}
            disabled={loading}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6 space-y-6">
        <section aria-label="Resumo" className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          {summaryCards.map(({ label, value, icon: Icon, color }) => (
            <article key={label} className="rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
              <div className={`h-8 w-8 rounded-md flex items-center justify-center ${color}`}>
                <Icon className="h-4 w-4" />
              </div>
              <p className="mt-3 text-2xl font-bold">{value}</p>
              <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
            </article>
          ))}
        </section>

        <form onSubmit={applyFilters} className="border-y border-slate-200 dark:border-slate-800 py-5">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-4 w-4 text-slate-500" />
            <h2 className="text-sm font-semibold">Filtros</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
              Aluno
              <select
                value={filters.studentId}
                onChange={event => setFilters(current => ({ ...current, studentId: event.target.value }))}
                className="mt-1 h-10 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm"
              >
                <option value="">Todos</option>
                {students.map(student => <option key={student.id} value={student.id}>{student.name}</option>)}
              </select>
            </label>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
              Curso
              <select
                value={filters.courseId}
                onChange={event => setFilters(current => ({ ...current, courseId: event.target.value }))}
                className="mt-1 h-10 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm"
              >
                <option value="">Todos</option>
                {courses.map(course => <option key={course.id} value={course.id}>{course.title}</option>)}
              </select>
            </label>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
              Quiz
              <select
                value={filters.quizId}
                onChange={event => setFilters(current => ({ ...current, quizId: event.target.value }))}
                className="mt-1 h-10 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm"
              >
                <option value="">Todos</option>
                {quizzes.map(quiz => <option key={quiz.id} value={quiz.id}>{quiz.title}</option>)}
              </select>
            </label>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
              Ação
              <select
                value={filters.actionType}
                onChange={event => setFilters(current => ({ ...current, actionType: event.target.value }))}
                className="mt-1 h-10 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm"
              >
                <option value="">Todas</option>
                {actionTypes.map(action => <option key={action} value={action}>{action}</option>)}
              </select>
            </label>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
              De
              <input
                type="date"
                value={filters.from}
                onChange={event => setFilters(current => ({ ...current, from: event.target.value }))}
                className="mt-1 h-10 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm"
              />
            </label>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
              Até
              <input
                type="date"
                value={filters.to}
                onChange={event => setFilters(current => ({ ...current, to: event.target.value }))}
                className="mt-1 h-10 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm"
              />
            </label>
          </div>
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 dark:border-slate-700 px-4 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <RotateCcw className="h-4 w-4" />
              Limpar
            </button>
            <button
              type="submit"
              className="inline-flex h-10 items-center gap-2 rounded-md bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              <Filter className="h-4 w-4" />
              Aplicar
            </button>
          </div>
        </form>

        {error && (
          <div role="alert" className="rounded-md border border-rose-200 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/30 p-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-rose-800 dark:text-rose-200">{error}</p>
            <button type="button" onClick={() => void loadData(lastAppliedFilters)} className="text-sm font-semibold text-rose-700 dark:text-rose-300">
              Tentar novamente
            </button>
          </div>
        )}

        <section>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800">
            <div className="flex" role="tablist" aria-label="Dados de atividade">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'attempts'}
                onClick={() => setActiveTab('attempts')}
                className={`px-4 py-3 text-sm font-semibold border-b-2 ${activeTab === 'attempts' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500'}`}
              >
                Tentativas ({attempts.length})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'logs'}
                onClick={() => setActiveTab('logs')}
                className={`px-4 py-3 text-sm font-semibold border-b-2 ${activeTab === 'logs' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500'}`}
              >
                Atividades ({logs.length})
              </button>
            </div>
            <p className="pb-2 text-xs text-slate-500">
              Última atividade: {formatDateTime(summary.last_activity_at)}
            </p>
          </div>

          {loading ? (
            <div className="py-16 flex items-center justify-center gap-3 text-sm text-slate-500">
              <RefreshCw className="h-5 w-5 animate-spin" />
              Carregando acompanhamento...
            </div>
          ) : activeTab === 'attempts' ? (
            attempts.length === 0 ? (
              <div className="py-16 text-center text-sm text-slate-500">Nenhuma tentativa encontrada.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[940px] text-sm">
                  <thead className="text-left text-xs uppercase text-slate-500 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-3 py-3">Aluno</th>
                      <th className="px-3 py-3">Curso / Quiz</th>
                      <th className="px-3 py-3">Tentativa</th>
                      <th className="px-3 py-3">Nota</th>
                      <th className="px-3 py-3">Status</th>
                      <th className="px-3 py-3">Concluída</th>
                      <th className="px-3 py-3 text-right">Detalhes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {attempts.map(attempt => (
                      <tr key={attempt.id} className="hover:bg-slate-100/70 dark:hover:bg-slate-900">
                        <td className="px-3 py-4">
                          <p className="font-semibold">{attempt.student_name || 'Sem nome'}</p>
                          <p className="text-xs text-slate-500">{attempt.student_email}</p>
                        </td>
                        <td className="px-3 py-4">
                          <p className="font-medium">{attempt.course_title}</p>
                          <p className="text-xs text-slate-500">{attempt.quiz_title}</p>
                        </td>
                        <td className="px-3 py-4">#{attempt.attempt_number}</td>
                        <td className="px-3 py-4 font-semibold">{formatScore(attempt.score)}</td>
                        <td className="px-3 py-4">
                          <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${attempt.passed ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300'}`}>
                            {attempt.passed ? 'Aprovada' : 'Não aprovada'}
                          </span>
                        </td>
                        <td className="px-3 py-4 text-slate-600 dark:text-slate-300">{formatDateTime(attempt.completed_at)}</td>
                        <td className="px-3 py-4 text-right">
                          <button type="button" onClick={() => setSelectedAttempt(attempt)} className="font-semibold text-indigo-600 hover:text-indigo-700">
                            Ver
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : logs.length === 0 ? (
            <div className="py-16 text-center text-sm text-slate-500">Nenhuma atividade encontrada.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="text-left text-xs uppercase text-slate-500 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-3 py-3">Aluno</th>
                    <th className="px-3 py-3">Ação</th>
                    <th className="px-3 py-3">Descrição</th>
                    <th className="px-3 py-3">XP</th>
                    <th className="px-3 py-3">Data</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {logs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-100/70 dark:hover:bg-slate-900">
                      <td className="px-3 py-4">
                        <p className="font-semibold">{log.student_name || 'Sem nome'}</p>
                        <p className="text-xs text-slate-500">{log.student_email}</p>
                      </td>
                      <td className="px-3 py-4 font-medium">{log.action_type}</td>
                      <td className="px-3 py-4 max-w-xl text-slate-600 dark:text-slate-300">{log.description || '-'}</td>
                      <td className="px-3 py-4">{log.amount}</td>
                      <td className="px-3 py-4">{formatDateTime(log.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {selectedAttempt && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 p-4 flex items-center justify-center" role="presentation" onMouseDown={() => setSelectedAttempt(null)}>
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="attempt-detail-title"
            onMouseDown={event => event.stopPropagation()}
            className="w-full max-w-lg rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl"
          >
            <header className="flex items-start justify-between gap-4 border-b border-slate-200 dark:border-slate-800 p-5">
              <div>
                <h2 id="attempt-detail-title" className="text-lg font-bold">Detalhes da tentativa</h2>
                <p className="mt-1 text-sm text-slate-500">{selectedAttempt.student_name || selectedAttempt.student_email}</p>
              </div>
              <button type="button" title="Fechar" onClick={() => setSelectedAttempt(null)} className="h-9 w-9 rounded-md flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="h-4 w-4" />
              </button>
            </header>
            <dl className="grid grid-cols-2 gap-x-5 gap-y-4 p-5 text-sm">
              <div className="col-span-2"><dt className="text-slate-500">Curso</dt><dd className="mt-1 font-semibold">{selectedAttempt.course_title}</dd></div>
              <div className="col-span-2"><dt className="text-slate-500">Quiz</dt><dd className="mt-1 font-semibold">{selectedAttempt.quiz_title}</dd></div>
              <div><dt className="text-slate-500">Tentativa</dt><dd className="mt-1 font-semibold">#{selectedAttempt.attempt_number}</dd></div>
              <div><dt className="text-slate-500">Nota</dt><dd className="mt-1 font-semibold">{formatScore(selectedAttempt.score)}</dd></div>
              <div><dt className="text-slate-500">Respostas registradas</dt><dd className="mt-1 font-semibold">{selectedAttempt.answers_count}</dd></div>
              <div><dt className="text-slate-500">Modo</dt><dd className="mt-1 font-semibold">Legado</dd></div>
              <div className="col-span-2"><dt className="text-slate-500">Concluída</dt><dd className="mt-1 font-semibold">{formatDateTime(selectedAttempt.completed_at)}</dd></div>
            </dl>
          </section>
        </div>
      )}
    </div>
  );
};

export default StudentActivityDashboard;
