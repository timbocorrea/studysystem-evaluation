import { SupabaseClient } from '@supabase/supabase-js';
import { ICourseRepository } from './ICourseRepository';
import { Course, Module, Lesson, ILessonData, LessonResource, LessonResourceType } from '../domain/entities';
import { NotFoundError, DomainError } from '../domain/errors';
import { DatabaseLessonResponse, DatabaseResourceResponse, DatabaseModuleResponse } from '../types/supabase-dtos';

type LessonProgressRow = {
  lesson_id: string;
  watched_seconds: number;
  is_completed: boolean;
  last_accessed_block_id: string | null;
  video_progress?: number;
  text_blocks_read?: string[];
  pdfs_viewed?: string[];
  audios_played?: string[];
  materials_accessed?: string[];
};

export class SupabaseCourseRepository implements ICourseRepository {
  private client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  private async shouldIncludeInactiveLessons(userId?: string): Promise<boolean> {
    if (!userId) return false;

    const { data } = await this.client
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle();

    return data?.role === 'INSTRUCTOR' || data?.role === 'MASTER';
  }

  private filterLessonsForAudience<T extends { is_active?: boolean | null }>(lessons: T[] = [], includeInactive: boolean): T[] {
    if (includeInactive) return lessons;
    return lessons.filter((lesson) => lesson.is_active !== false);
  }

  private async getProgressByUser(
    userId?: string,
    lessonIds?: string[],
    options?: { structureOnly?: boolean }
  ): Promise<Map<string, LessonProgressRow>> {
    if (!userId) return new Map();

    const structureOnly = options?.structureOnly ?? false;
    const selectFields = structureOnly
      ? 'lesson_id, is_completed'
      : 'lesson_id, watched_seconds, is_completed, last_accessed_block_id, video_progress, text_blocks_read, pdfs_viewed, audios_played, materials_accessed';

    const uniqueLessonIds = lessonIds ? Array.from(new Set(lessonIds.filter(Boolean))) : [];
    const progressMap = new Map<string, LessonProgressRow>();

    if (lessonIds && uniqueLessonIds.length === 0) return progressMap;

    let query = this.client.from('lesson_progress').select(selectFields).eq('user_id', userId);
    if (uniqueLessonIds.length > 0) query = query.in('lesson_id', uniqueLessonIds);

    const { data, error } = await query;
    if (error) throw new DomainError(`Falha ao buscar progresso: ${error.message}`);

    (data || []).forEach((row: any) => {
      progressMap.set(row.lesson_id, row as LessonProgressRow);
    });

    return progressMap;
  }

  private mapLesson(row: DatabaseLessonResponse, progressMap: Map<string, LessonProgressRow>, isStructureOnly: boolean = false): Lesson {
    const progress = progressMap.get(row.id);
    const resources = this.mapResources((row as any).resources || (row as any).lesson_resources || []);
    const payload: ILessonData = {
      id: row.id,
      title: row.title,
      videoUrl: row.video_url || '',
      videoUrls: row.video_urls || [],
      content: row.content || '',
      audioUrl: row.audio_url || '',
      imageUrl: row.image_url || '',
      resources,
      durationSeconds: row.duration_seconds || 0,
      watchedSeconds: progress?.watched_seconds || 0,
      isCompleted: progress?.is_completed || false,
      position: row.position || 0,
      lastAccessedBlockId: progress?.last_accessed_block_id || null,
      contentBlocks: (row as any).content_blocks || [],
      isLoaded: !isStructureOnly,
      textBlocksRead: progress?.text_blocks_read || [],
      audiosListened: progress?.audios_played || []
    };
    return new Lesson(payload);
  }

  private mapResources(raw: DatabaseResourceResponse[] = []): LessonResource[] {
    return (raw || [])
      .sort((a, b) => (a.position || 0) - (b.position || 0))
      .map((r) => ({
        id: r.id,
        title: r.title,
        type: r.type as LessonResourceType,
        url: r.url,
        position: r.position ?? 0
      }));
  }

  private mapModule(row: DatabaseModuleResponse, progressMap: Map<string, LessonProgressRow>, isStructureOnly: boolean = false): Module {
    const lessons = (row.lessons || [])
      .sort((a, b) => (a.position || 0) - (b.position || 0))
      .map((lesson) => this.mapLesson(lesson, progressMap, isStructureOnly));
    return new Module(row.id, row.title, lessons);
  }

  async getCourseById(id: string, userId?: string): Promise<Course> {
    const { data: courseData, error } = await this.client
      .from('courses')
      .select('id, title, description, image_url, instructor_id, modules:modules(id, title, position, lessons:lessons(*, resources:lesson_resources(*)))')
      .eq('id', id)
      .single();

    if (error || !courseData) throw new NotFoundError('Course', id);

    const includeInactiveLessons = await this.shouldIncludeInactiveLessons(userId);
    const filteredModules = (courseData.modules || []).map((module: any) => ({
      ...module,
      lessons: this.filterLessonsForAudience(module.lessons || [], includeInactiveLessons)
    }));

    const lessonIds = filteredModules.flatMap((m: any) => (m.lessons || []).map((l: any) => l.id));
    const progressMap = await this.getProgressByUser(userId, lessonIds);

    const modules = filteredModules
      .sort((a: any, b: any) => (a.position || 0) - (b.position || 0))
      .map((m: any) => this.mapModule(m, progressMap));

    let instructorName = null;
    if ((courseData as any).instructor_id) {
      const { data: profData } = await this.client.from('profiles').select('name').eq('id', (courseData as any).instructor_id).single();
      if (profData) instructorName = profData.name;
    }

    return new Course(courseData.id, courseData.title, courseData.description, courseData.image_url, null, null, modules, null, null, null, null, null, null, instructorName);
  }

  async getCourseStructure(id: string, userId?: string): Promise<Course> {
    const { data: courseData, error } = await this.client
      .from('courses')
      .select('id, title, description, image_url, color, color_legend, instructor_id, modules:modules(id, title, position, lessons:lessons(id, title, position, is_active))')
      .eq('id', id)
      .single();

    if (error || !courseData) throw new NotFoundError('Course', id);

    const includeInactiveLessons = await this.shouldIncludeInactiveLessons(userId);
    const filteredModules = (courseData.modules || []).map((module: any) => ({
      ...module,
      lessons: this.filterLessonsForAudience(module.lessons || [], includeInactiveLessons)
    }));

    const lessonIds = filteredModules.flatMap((m: any) => (m.lessons || []).map((l: any) => l.id));
    const progressMap = await this.getProgressByUser(userId, lessonIds, { structureOnly: true });

    const modules = filteredModules
      .sort((a: any, b: any) => (a.position || 0) - (b.position || 0))
      .map((m: any) => this.mapModule(m, progressMap, true));

    return new Course(courseData.id, courseData.title, courseData.description, courseData.image_url, courseData.color, courseData.color_legend, modules);
  }

  async getLessonById(lessonId: string, userId?: string): Promise<Lesson | null> {
    const { data: lessonData, error } = await this.client
      .from('lessons')
      .select('*, resources:lesson_resources(*)')
      .eq('id', lessonId)
      .single();

    if (error) throw new DomainError(`Erro ao buscar aula: ${error.message}`);
    if (!lessonData) return null;

    const includeInactiveLessons = await this.shouldIncludeInactiveLessons(userId);
    if ((lessonData as any).is_active === false && !includeInactiveLessons) return null;

    const progressMap = await this.getProgressByUser(userId, [lessonId]);
    return this.mapLesson(lessonData as any, progressMap);
  }

  private async getUserAssignedCourseIds(userId: string): Promise<string[]> {
    const { data: profileData } = await this.client.from('profiles').select('role').eq('id', userId).single();
    if (profileData?.role === 'INSTRUCTOR') {
      const { data: allCourses } = await this.client.from('courses').select('id');
      return (allCourses || []).map(c => c.id);
    }
    const { data: assignments } = await this.client.from('course_enrollments').select('course_id').eq('user_id', userId).eq('is_active', true);
    return (assignments || []).map(a => a.course_id);
  }

  async getCoursesSummary(userId?: string): Promise<any[]> {
    let query = this.client.from('courses').select('id, title, description, image_url, color, color_legend, modules:modules(id, title, position, lessons:lessons(id, title, position, is_active))');
    if (userId) {
      const assignedIds = await this.getUserAssignedCourseIds(userId);
      if (assignedIds.length === 0) return [];
      query = query.in('id', assignedIds);
    }

    const { data, error } = await query;
    if (error) throw new DomainError('Falha ao buscar resumo dos cursos');

    const includeInactiveLessons = await this.shouldIncludeInactiveLessons(userId);
    const visibleData = (data || []).map((course: any) => ({
      ...course,
      modules: (course.modules || []).map((module: any) => ({
        ...module,
        lessons: this.filterLessonsForAudience(module.lessons || [], includeInactiveLessons)
      }))
    }));

    let progressMap = new Map<string, boolean>();
    if (userId) {
      const allLessonIds = visibleData.flatMap((c: any) => (c.modules || []).flatMap((m: any) => (m.lessons || []).map((l: any) => l.id)));
      if (allLessonIds.length > 0) {
        const { data: progressData } = await this.client.from('lesson_progress').select('lesson_id, is_completed').eq('user_id', userId).in('lesson_id', allLessonIds);
        progressData?.forEach((p: any) => progressMap.set(p.lesson_id, p.is_completed || false));
      }
    }

    return visibleData.map((row: any) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      imageUrl: row.image_url,
      color: row.color,
      color_legend: row.color_legend,
      modules: (row.modules || []).map((m: any) => ({
        ...m,
        lessons: (m.lessons || []).map((l: any) => ({ ...l, isCompleted: progressMap.get(l.id) || false }))
      }))
    }));
  }

  async getAllCourses(userId?: string): Promise<Course[]> {
    const ids = userId ? await this.getUserAssignedCourseIds(userId) : (await this.client.from('courses').select('id')).data?.map(c => c.id) || [];
    if (ids.length === 0) return [];

    const { data: coursesData } = await this.client.from('courses').select('id, title, description, image_url, color, color_legend, modules:modules(id, title, position, lessons:lessons(id, title, position, is_active))').in('id', ids);
    const includeInactiveLessons = await this.shouldIncludeInactiveLessons(userId);
    const visibleCoursesData = (coursesData || []).map((course: any) => ({
      ...course,
      modules: (course.modules || []).map((module: any) => ({
        ...module,
        lessons: this.filterLessonsForAudience(module.lessons || [], includeInactiveLessons)
      }))
    }));
    const lessonIds = visibleCoursesData.flatMap((c: any) => (c.modules || []).flatMap((m: any) => (m.lessons || []).map((l: any) => l.id)));
    const progressMap = await this.getProgressByUser(userId, lessonIds, { structureOnly: true });

    return visibleCoursesData.map((row: any) => ({
      ...row,
      modules: (row.modules || []).map((m: any) => ({
        ...m,
        lessons: (m.lessons || []).map((l: any) => ({ ...l, isCompleted: progressMap.get(l.id)?.is_completed || false }))
      }))
    })) as any;
  }

  async getEnrolledCourses(userId: string): Promise<Course[]> {
    const assignedIds = await this.getUserAssignedCourseIds(userId);
    const { data: enrollments } = await this.client.from('course_enrollments').select('course_id').eq('user_id', userId).eq('is_active', true);
    const enrolledIds = (enrollments || []).map(e => e.course_id).filter(id => assignedIds.includes(id));
    if (enrolledIds.length === 0) return [];
    
    // Simplificado para usar getAllCourses internamente ou similar
    const { data: coursesData } = await this.client.from('courses').select('id, title, description, image_url, color, color_legend, modules:modules(id, title, position, lessons:lessons(id, title, position, is_active))').in('id', enrolledIds);
    const includeInactiveLessons = await this.shouldIncludeInactiveLessons(userId);
    const visibleCoursesData = (coursesData || []).map((course: any) => ({
      ...course,
      modules: (course.modules || []).map((module: any) => ({
        ...module,
        lessons: this.filterLessonsForAudience(module.lessons || [], includeInactiveLessons)
      }))
    }));
    const lessonIds = visibleCoursesData.flatMap((c: any) => (c.modules || []).flatMap((m: any) => (m.lessons || []).map((l: any) => l.id)));
    const progressMap = await this.getProgressByUser(userId, lessonIds, { structureOnly: true });

    return visibleCoursesData.map((row: any) => ({
      ...row,
      modules: (row.modules || []).map((m: any) => ({
        ...m,
        lessons: (m.lessons || []).map((l: any) => ({ ...l, isCompleted: progressMap.get(l.id)?.is_completed || false }))
      }))
    })) as any;
  }

  async enrollInCourse(courseId: string): Promise<void> {
    const { error } = await this.client.rpc('self_enroll_course', { p_course_id: courseId });
    if (error) throw new DomainError(error.message);
  }

  async isEnrolled(userId: string, courseId: string): Promise<boolean> {
    const { data } = await this.client.from('course_enrollments').select('id').eq('user_id', userId).eq('course_id', courseId).eq('is_active', true).maybeSingle();
    return !!data;
  }
}
