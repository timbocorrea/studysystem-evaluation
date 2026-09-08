import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AdminService } from '../services/AdminService';
import { LessonRecord, ModuleRecord } from '../domain/admin';
import { Course } from '../domain/entities';
import { Eye, EyeOff, Loader2, Power, Search } from 'lucide-react';

type Props = {
  adminService: AdminService;
  user: { id: string; role: string; email: string };
  adminCourses?: Course[];
};

type AvailabilityCourse = {
  id: string;
  title: string;
  instructorId?: string | null;
  modules: ModuleRecord[];
};

const isMasterUser = (user: Props['user']) => user.role === 'MASTER';

const toAvailabilityCourse = (course: any): AvailabilityCourse => ({
  id: course.id,
  title: course.title,
  instructorId: course.instructorId || course.instructor_id || null,
  modules: (course.modules || []).map((module: any) => ({
    id: module.id,
    course_id: course.id,
    title: module.title,
    position: module.position ?? 0
  }))
});

const LessonAvailabilityPanel: React.FC<Props> = ({ adminService, user, adminCourses }) => {
  if (adminCourses === undefined) return null;

  const [courses, setCourses] = useState<AvailabilityCourse[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [modules, setModules] = useState<ModuleRecord[]>([]);
  const [lessonsByModule, setLessonsByModule] = useState<Record<string, LessonRecord[]>>({});
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [updatingLessonId, setUpdatingLessonId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const selectedCourse = useMemo(
    () => courses.find((course) => course.id === selectedCourseId) || null,
    [courses, selectedCourseId]
  );

  useEffect(() => {
    const loadCourses = async () => {
      try {
        setError('');
        setIsLoading(true);

        const outlineCourses = adminCourses.length > 0
          ? adminCourses.map(toAvailabilityCourse)
          : (await adminService.listCoursesOutline()).map(toAvailabilityCourse);

        const visibleCourses = isMasterUser(user)
          ? outlineCourses
          : outlineCourses.filter((course) => course.instructorId === user.id);

        setCourses(visibleCourses);
        setSelectedCourseId((current) => {
          if (current && visibleCourses.some((course) => course.id === current)) return current;
          return visibleCourses[0]?.id || '';
        });
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setIsLoading(false);
      }
    };

    loadCourses();
  }, [adminService, adminCourses, user]);

  useEffect(() => {
    if (!selectedCourse) {
      setModules([]);
      setLessonsByModule({});
      return;
    }

    const loadLessons = async () => {
      try {
        setError('');
        setIsLoading(true);
        setModules(selectedCourse.modules);

        const lessonEntries = await Promise.all(
          selectedCourse.modules.map(async (module) => {
            const lessons = await adminService.listLessons(module.id, { summary: true });
            return [module.id, lessons] as const;
          })
        );

        setLessonsByModule(Object.fromEntries(lessonEntries));
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setIsLoading(false);
      }
    };

    loadLessons();
  }, [adminService, selectedCourse]);

  const toggleLessonAvailability = async (lesson: LessonRecord) => {
    const nextIsActive = lesson.is_active === false;

    try {
      setUpdatingLessonId(lesson.id);
      const updated = await adminService.updateLesson(lesson.id, { isActive: nextIsActive });

      setLessonsByModule((current) => ({
        ...current,
        [lesson.module_id]: (current[lesson.module_id] || []).map((item) =>
          item.id === lesson.id ? { ...item, is_active: updated.is_active ?? nextIsActive } : item
        )
      }));

      toast.success(nextIsActive ? 'Aula ativada para alunos.' : 'Aula inativada para alunos.');
    } catch (err) {
      setError((err as Error).message);
      toast.error('Não foi possível atualizar a disponibilidade da aula.');
    } finally {
      setUpdatingLessonId(null);
    }
  };

  const normalize = (value: string) => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const normalizedQuery = normalize(query.trim());

  const visibleModules = modules
    .map((module) => ({
      ...module,
      lessons: (lessonsByModule[module.id] || []).filter((lesson) =>
        !normalizedQuery || normalize(lesson.title).includes(normalizedQuery) || normalize(module.title).includes(normalizedQuery)
      )
    }))
    .filter((module) => !normalizedQuery || module.lessons.length > 0);

  return (
    <div className="p-4 md:px-8 md:pt-8 md:pb-4">
      <section className="rounded-3xl border border-indigo-200/70 dark:border-indigo-500/20 bg-indigo-50/80 dark:bg-indigo-950/20 shadow-sm overflow-hidden">
        <div className="p-5 md:p-6 flex flex-col gap-5">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/20">
                <Power size={20} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500 dark:text-indigo-300">Disponibilidade para alunos</p>
                <h3 className="text-lg md:text-xl font-black text-slate-900 dark:text-white mt-1">Ative ou inative aulas sem excluir conteúdo</h3>
                <p className="text-xs md:text-sm text-slate-600 dark:text-slate-300 mt-1 max-w-3xl">
                  Use esta chave para ocultar do aluno matriculado conteúdos que saíram do edital. Administradores continuam vendo e editando a aula.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[minmax(220px,320px)_minmax(180px,260px)] gap-3 w-full xl:w-auto">
              <label className="relative block">
                <span className="sr-only">Buscar aula</span>
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar aula ou módulo"
                  className="w-full rounded-2xl border border-slate-200 dark:border-white/10 bg-white/90 dark:bg-slate-950/70 pl-9 pr-3 py-3 text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/40"
                />
              </label>

              <select
                value={selectedCourseId}
                onChange={(event) => setSelectedCourseId(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 dark:border-white/10 bg-white/90 dark:bg-slate-950/70 px-3 py-3 text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/40"
              >
                {courses.length === 0 && <option value="">Nenhum curso encontrado</option>}
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>{course.title}</option>
                ))}
              </select>
            </div>
          </div>

          {error && (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs font-bold text-red-500">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-indigo-300/70 dark:border-indigo-500/20 p-8 text-sm font-bold text-indigo-500">
              <Loader2 size={18} className="animate-spin" /> Carregando disponibilidade...
            </div>
          ) : selectedCourse ? (
            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
              {visibleModules.map((module) => (
                <div key={module.id} className="rounded-2xl border border-white/70 dark:border-white/10 bg-white/80 dark:bg-slate-950/40 overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-100 dark:border-white/5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-black text-slate-900 dark:text-white truncate">{module.title}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{module.lessons.length} aula(s)</p>
                    </div>
                  </div>

                  <div className="divide-y divide-slate-100 dark:divide-white/5">
                    {module.lessons.map((lesson) => {
                      const isActive = lesson.is_active !== false;
                      const isUpdating = updatingLessonId === lesson.id;

                      return (
                        <div key={lesson.id} className="px-4 py-3 flex items-center justify-between gap-4">
                          <div className="min-w-0 flex items-start gap-3">
                            <div className={`mt-0.5 w-7 h-7 rounded-xl flex items-center justify-center ${isActive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-500/10 text-slate-400'}`}>
                              {isActive ? <Eye size={14} /> : <EyeOff size={14} />}
                            </div>
                            <div className="min-w-0">
                              <p className={`text-sm font-black truncate ${isActive ? 'text-slate-900 dark:text-white' : 'text-slate-400 line-through decoration-slate-500/50'}`}>{lesson.title}</p>
                              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                {isActive ? 'Ativa para aluno' : 'Inativa para aluno'} • Posição {lesson.position ?? 0}
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            role="switch"
                            aria-checked={isActive}
                            disabled={isUpdating}
                            onClick={() => toggleLessonAvailability(lesson)}
                            className={`relative inline-flex h-7 w-12 flex-shrink-0 items-center rounded-full border transition-all disabled:opacity-60 ${isActive ? 'bg-emerald-500 border-emerald-400' : 'bg-slate-400 dark:bg-slate-700 border-slate-300 dark:border-slate-600'}`}
                            title={isActive ? 'Inativar aula para alunos' : 'Ativar aula para alunos'}
                          >
                            <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${isActive ? 'translate-x-6' : 'translate-x-1'}`} />
                          </button>
                        </div>
                      );
                    })}

                    {module.lessons.length === 0 && (
                      <div className="px-4 py-5 text-xs font-bold text-slate-400 text-center">Nenhuma aula encontrada neste módulo.</div>
                    )}
                  </div>
                </div>
              ))}

              {visibleModules.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-300 dark:border-white/10 p-8 text-center text-sm font-bold text-slate-400">
                  Nenhum conteúdo encontrado para os filtros atuais.
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 dark:border-white/10 p-8 text-center text-sm font-bold text-slate-400">
              Nenhum curso disponível para gerenciar.
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default LessonAvailabilityPanel;
