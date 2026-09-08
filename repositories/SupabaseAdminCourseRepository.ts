import { SupabaseClient } from '@supabase/supabase-js';
import { IAdminCourseRepository } from './IAdminCourseRepository';
import { CourseRecord, LessonRecord, LessonResourceRecord, ModuleRecord } from '../domain/admin';
import { DomainError } from '../domain/errors';

export class SupabaseAdminCourseRepository implements IAdminCourseRepository {
  private client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  async listCourses(): Promise<CourseRecord[]> {
    const { data, error } = await this.client
      .from('courses')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw new DomainError(`Falha ao listar cursos: ${error.message}`);
    return (data || []) as CourseRecord[];
  }

  async listCoursesWithContent(): Promise<any[]> {
    const { data, error } = await this.client
      .from('courses')
      .select('*, modules(*, lessons(*))')
      .order('created_at', { ascending: false });
    if (error) throw new DomainError(`Falha ao listar cursos completos: ${error.message}`);
    
    const courses = (data || []) as any[];
    courses.forEach(course => {
      if (course.modules) {
        course.modules.sort((a: any, b: any) => (a.position || 0) - (b.position || 0));
        course.modules.forEach((module: any) => {
          if (module.lessons) {
            module.lessons.sort((a: any, b: any) => (a.position || 0) - (b.position || 0));
          }
        });
      }
    });
    return courses;
  }

  async listCoursesOutline(): Promise<any[]> {
    const { data, error } = await this.client
      .from('courses')
      .select('*, modules(id, course_id, title, position, lessons(id, module_id, title, position, is_active))')
      .order('created_at', { ascending: false });
    if (error) throw new DomainError(`Falha ao listar cursos (outline): ${error.message}`);
    
    const courses = (data || []) as any[];
    courses.forEach(course => {
      if (course.modules) {
        course.modules.sort((a: any, b: any) => (a.position || 0) - (b.position || 0));
        course.modules.forEach((module: any) => {
          if (module.lessons) {
            module.lessons.sort((a: any, b: any) => (a.position || 0) - (b.position || 0));
          }
        });
      }
    });
    return courses;
  }

  async createCourse(title: string, description?: string, imageUrl?: string, color?: string, colorLegend?: string): Promise<CourseRecord> {
    const { data, error } = await this.client
      .from('courses')
      .insert({ title, description, image_url: imageUrl, color, color_legend: colorLegend })
      .select('*')
      .single();
    if (error || !data) throw new DomainError(`Falha ao criar curso: ${error?.message}`);
    return data as CourseRecord;
  }

  async updateCourse(id: string, patch: any): Promise<CourseRecord> {
    const updates = { ...patch };
    if (patch.imageUrl !== undefined) { updates.image_url = patch.imageUrl; delete updates.imageUrl; }
    if (patch.colorLegend !== undefined) { updates.color_legend = patch.colorLegend; delete updates.colorLegend; }
    
    const { data, error } = await this.client.from('courses').update(updates).eq('id', id).select('*').single();
    if (error || !data) throw new DomainError(`Falha ao atualizar curso: ${error?.message}`);
    return data as CourseRecord;
  }

  async deleteCourse(id: string): Promise<void> {
    const { data, error } = await this.client.from('courses').delete().eq('id', id).select('id');
    if (error) throw new DomainError(`Falha ao excluir curso: ${error.message}`);
    if (!data || data.length === 0) throw new DomainError('Nenhum curso foi excluído.');
  }

  async listModules(courseId: string): Promise<ModuleRecord[]> {
    const { data, error } = await this.client.from('modules').select('*').eq('course_id', courseId).order('position', { ascending: true });
    if (error) throw new DomainError(`Falha ao listar módulos: ${error.message}`);
    return (data || []) as ModuleRecord[];
  }

  async getModule(id: string): Promise<ModuleRecord> {
    const { data, error } = await this.client.from('modules').select('*').eq('id', id).single();
    if (error || !data) throw new DomainError(`Falha ao buscar módulo: ${error?.message}`);
    return data as ModuleRecord;
  }

  async createModule(courseId: string, title: string, position?: number): Promise<ModuleRecord> {
    const { data, error } = await this.client.from('modules').insert({ course_id: courseId, title, position: position ?? 0 }).select('*').single();
    if (error || !data) throw new DomainError(`Falha ao criar módulo: ${error?.message}`);
    return data as ModuleRecord;
  }

  async updateModule(id: string, patch: any): Promise<ModuleRecord> {
    const { data, error } = await this.client.from('modules').update(patch).eq('id', id).select('*').single();
    if (error || !data) throw new DomainError(`Falha ao atualizar módulo: ${error?.message}`);
    return data as ModuleRecord;
  }

  async deleteModule(id: string): Promise<void> {
    const { data, error } = await this.client.from('modules').delete().eq('id', id).select('id');
    if (error) throw new DomainError(`Falha ao excluir módulo: ${error.message}`);
  }

  async listLessons(moduleId: string, options?: { summary?: boolean }): Promise<LessonRecord[]> {
    const summaryMode = options?.summary ?? false;
    const selectFields = summaryMode ? 'id,module_id,title,position,is_active,created_at' : '*';
    const { data, error } = await this.client.from('lessons').select(selectFields).eq('module_id', moduleId).order('position', { ascending: true });
    if (error) throw new DomainError(`Falha ao listar aulas: ${error.message}`);
    return (data || []) as any[];
  }

  async createLesson(moduleId: string, payload: any): Promise<LessonRecord> {
    const { data, error } = await this.client.from('lessons').insert({
      module_id: moduleId,
      title: payload.title,
      content: payload.content,
      video_url: payload.videoUrl,
      audio_url: payload.audioUrl,
      image_url: payload.imageUrl,
      duration_seconds: payload.durationSeconds,
      position: payload.position,
      is_active: payload.isActive ?? true
    }).select('*').single();
    if (error || !data) throw new DomainError(`Falha ao criar aula: ${error?.message}`);
    return data as any;
  }

  async updateLesson(id: string, patch: any): Promise<LessonRecord> {
    const updates: any = {};
    if (patch.title !== undefined) updates.title = patch.title;
    if (patch.content !== undefined) updates.content = patch.content;
    if (patch.videoUrl !== undefined) updates.video_url = patch.videoUrl;
    if (patch.videoUrls !== undefined) updates.video_urls = patch.videoUrls;
    if (patch.audioUrl !== undefined) updates.audio_url = patch.audioUrl;
    if (patch.imageUrl !== undefined) updates.image_url = patch.imageUrl;
    if (patch.durationSeconds !== undefined) updates.duration_seconds = patch.durationSeconds;
    if (patch.position !== undefined) updates.position = patch.position;
    if (patch.contentBlocks !== undefined) updates.content_blocks = patch.contentBlocks;
    if (patch.isActive !== undefined) updates.is_active = patch.isActive;
    if (patch.is_active !== undefined) updates.is_active = patch.is_active;

    const { data, error } = await this.client.from('lessons').update(updates).eq('id', id).select('*').maybeSingle();
    if (error || !data) throw new DomainError(`Falha ao atualizar aula: ${error?.message}`);
    return data as any;
  }

  async getLesson(id: string): Promise<LessonRecord> {
    const { data, error } = await this.client.from('lessons').select('*').eq('id', id).single();
    if (error || !data) throw new DomainError(`Falha ao buscar aula: ${error?.message}`);
    return data as any;
  }

  async deleteLesson(id: string): Promise<void> {
    const { data, error } = await this.client.from('lessons').delete().eq('id', id).select('id');
    if (error) throw new DomainError(`Falha ao excluir aula: ${error.message}`);
  }

  async moveLesson(lessonId: string, targetModuleId: string): Promise<LessonRecord> {
    const { data, error } = await this.client.from('lessons').update({ module_id: targetModuleId }).eq('id', lessonId).select('*').single();
    if (error || !data) throw new DomainError(`Falha ao mover aula: ${error?.message}`);
    return data as any;
  }

  async listLessonResources(lessonId: string): Promise<LessonResourceRecord[]> {
    const { data, error } = await this.client.from('lesson_resources').select('*').eq('lesson_id', lessonId).order('position', { ascending: true });
    if (error) throw new DomainError(`Falha ao listar materiais: ${error.message}`);
    return (data || []) as LessonResourceRecord[];
  }

  async createLessonResource(lessonId: string, payload: any): Promise<LessonResourceRecord> {
    const { data, error } = await this.client.from('lesson_resources').insert({
      lesson_id: lessonId,
      title: payload.title,
      resource_type: payload.resourceType,
      url: payload.url,
      position: payload.position ?? 0,
      category: payload.category ?? 'Outros',
      storage_provider: payload.storageProvider ?? null,
      storage_bucket: payload.storageBucket ?? null,
      storage_path: payload.storagePath ?? null,
      mime_type: payload.mimeType ?? null,
      file_size_bytes: payload.fileSizeBytes ?? null,
      original_filename: payload.originalFilename ?? null
    }).select('*').single();
    if (error || !data) throw new DomainError(`Falha ao criar material: ${error?.message}`);
    return data as LessonResourceRecord;
  }

  async updateLessonResource(id: string, patch: any): Promise<LessonResourceRecord> {
    const updates: any = {};
    if (patch.title !== undefined) updates.title = patch.title;
    if (patch.resourceType !== undefined) updates.resource_type = patch.resourceType;
    if (patch.url !== undefined) updates.url = patch.url;
    if (patch.position !== undefined) updates.position = patch.position;
    if (patch.category !== undefined) updates.category = patch.category;
    if (patch.storageProvider !== undefined) updates.storage_provider = patch.storageProvider;
    if (patch.storageBucket !== undefined) updates.storage_bucket = patch.storageBucket;
    if (patch.storagePath !== undefined) updates.storage_path = patch.storagePath;
    if (patch.mimeType !== undefined) updates.mime_type = patch.mimeType;
    if (patch.fileSizeBytes !== undefined) updates.file_size_bytes = patch.fileSizeBytes;
    if (patch.originalFilename !== undefined) updates.original_filename = patch.originalFilename;

    const { data, error } = await this.client.from('lesson_resources').update(updates).eq('id', id).select('*').single();
    if (error || !data) throw new DomainError(`Falha ao atualizar material: ${error?.message}`);
    return data as LessonResourceRecord;
  }

  async deleteLessonResource(id: string): Promise<void> {
    const { data, error } = await this.client.from('lesson_resources').delete().eq('id', id).select('id');
    if (error) throw new DomainError(`Falha ao excluir material: ${error.message}`);
  }

  async canEditLesson(userId: string, lessonId: string): Promise<boolean> {
    const { data: profile } = await this.client.from('profiles').select('role').eq('id', userId).single();
    if (profile?.role === 'MASTER') return true;
    if (profile?.role !== 'INSTRUCTOR') return false;

    const { data: assignment } = await this.client.from('instructor_lesson_assignments').select('lesson_id').eq('user_id', userId).eq('lesson_id', lessonId).maybeSingle();
    if (assignment) return true;

    const { data: lesson } = await this.client.from('lessons').select('module_id').eq('id', lessonId).single();
    if (lesson) {
      const { data: module } = await this.client.from('modules').select('course_id').eq('id', lesson.module_id).single();
      if (module) {
        const { data: course } = await this.client.from('courses').select('instructor_id').eq('id', module.course_id).single();
        if (course?.instructor_id === userId) return true;

        const { data: enrollment } = await this.client
          .from('course_enrollments')
          .select('course_id')
          .eq('user_id', userId)
          .eq('course_id', module.course_id)
          .eq('is_active', true)
          .maybeSingle();

        if (enrollment) return true;
      }
    }
    return false;
  }

  async listActiveCourseEnrollmentIds(userId: string): Promise<string[]> {
    const { data, error } = await this.client
      .from('course_enrollments')
      .select('course_id')
      .eq('user_id', userId)
      .eq('is_active', true);
    if (error) throw new DomainError(`Falha ao listar matriculas ativas do instrutor: ${error.message}`);
    return Array.from(new Set((data || []).map(row => row.course_id)));
  }

  async listUserCourseAssignmentIds(userId: string): Promise<string[]> {
    const { data, error } = await this.client
      .from('user_course_assignments')
      .select('course_id')
      .eq('user_id', userId);
    if (error) throw new DomainError(`Falha ao listar cursos atribuidos ao instrutor: ${error.message}`);
    return Array.from(new Set((data || []).map(row => row.course_id)));
  }

  async assignLessonsToInstructor(userId: string, lessonIds: string[]): Promise<void> {
    if (lessonIds.length === 0) return;
    await this.client.from('instructor_lesson_assignments').upsert(lessonIds.map(id => ({ user_id: userId, lesson_id: id })), { onConflict: 'user_id,lesson_id' });
  }

  async listInstructorLessonAssignments(userId: string): Promise<string[]> {
    const { data } = await this.client.from('instructor_lesson_assignments').select('lesson_id').eq('user_id', userId);
    return (data || []).map(r => r.lesson_id);
  }

  async removeInstructorLessonAssignment(userId: string, lessonId: string): Promise<void> {
    await this.client.from('instructor_lesson_assignments').delete().eq('user_id', userId).eq('lesson_id', lessonId);
  }
}
