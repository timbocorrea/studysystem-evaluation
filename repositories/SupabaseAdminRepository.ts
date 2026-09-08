
import { SupabaseClient } from '@supabase/supabase-js';
import { DomainError } from '../domain/errors';
import {
  CourseRecord,
  LessonRecord,
  LessonResourceRecord,
  ModuleRecord,
  ProfileRecord,
  StaffActivityLogRecord,
  StaffQuizAttemptRecord,
  StudentActivityFilters,
  StudentActivitySummary,
} from '../domain/admin';
import { IAdminRepository } from './IAdminRepository';
import { createSupabaseClient } from '../services/supabaseClient';
import { normalizeStudentActivityFilters } from '../utils/studentActivityFilters';

export class SupabaseAdminRepository implements IAdminRepository {
  private client: SupabaseClient;
  private readonly systemStatsCacheTtlMs = 15000;
  private systemStatsCache: { data: any; expiresAt: number } | null = null;

  constructor(client?: SupabaseClient) {
    this.client = client ?? createSupabaseClient();
  }

  private invalidateSystemStatsCache(): void {
    this.systemStatsCache = null;
  }

  private getCachedSystemStats(): any | null {
    if (!this.systemStatsCache) return null;
    if (Date.now() >= this.systemStatsCache.expiresAt) {
      this.systemStatsCache = null;
      return null;
    }
    return this.systemStatsCache.data;
  }

  private setSystemStatsCache(stats: any): void {
    this.systemStatsCache = {
      data: stats,
      expiresAt: Date.now() + this.systemStatsCacheTtlMs
    };
  }

  async listCourses(): Promise<CourseRecord[]> {
    const { data, error } = await this.client
      .from('courses')
      .select('id,title,description,image_url,instructor_id,color,color_legend,created_at')
      .order('created_at', { ascending: false });

    if (error) throw new DomainError(`Falha ao listar cursos: ${error.message}`);
    return (data || []) as CourseRecord[];
  }

  async listCoursesWithContent(): Promise<import('../domain/admin').CourseStructure[]> {
    const { data, error } = await this.client
      .from('courses')
      .select(`
        id,
        title,
        description,
        image_url,
        instructor_id,
        color,
        color_legend,
        created_at,
        modules (
          id,
          course_id,
          title,
          position,
          created_at,
          lessons (
            id,
            module_id,
            title,
            content,
            video_url,
            video_urls,
            audio_url,
            image_url,
            duration_seconds,
            position,
            content_blocks,
            created_at
          )
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw new DomainError(`Falha ao listar cursos completos: ${error.message}`);

    // Client-side sorting for nested arrays (Supabase direct nested ordering is limited)
    const courses = (data || []) as import('../domain/admin').CourseStructure[];

    courses.forEach(course => {
      // Sort modules by position
      if (course.modules) {
        course.modules.sort((a, b) => (a.position || 0) - (b.position || 0));

        // Sort lessons by position
        course.modules.forEach(module => {
          if (module.lessons) {
            module.lessons.sort((a, b) => (a.position || 0) - (b.position || 0));
          }
        });
      }
    });

    return courses;
  }

  async listCoursesOutline(): Promise<import('../domain/admin').CourseOutline[]> {
    const { data, error } = await this.client
      .from('courses')
      .select(`
        id,
        title,
        description,
        image_url,
        color,
        color_legend,
        instructor_id,
        created_at,
        modules (
          id,
          course_id,
          title,
          position,
          lessons (
            id,
            module_id,
            title,
            position
          )
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw new DomainError(`Falha ao listar cursos (outline): ${error.message}`);

    const courses = (data || []) as import('../domain/admin').CourseOutline[];

    courses.forEach(course => {
      if (course.modules) {
        course.modules.sort((a, b) => (a.position || 0) - (b.position || 0));
        course.modules.forEach(module => {
          if (module.lessons) {
            module.lessons.sort((a, b) => (a.position || 0) - (b.position || 0));
          }
        });
      }
    });

    return courses;
  }

  async createCourse(title: string, description?: string, imageUrl?: string, color?: string, colorLegend?: string): Promise<CourseRecord> {
    const { data, error } = await this.client
      .from('courses')
      .insert({
        title,
        description: description ?? null,
        image_url: imageUrl ?? null,
        color: color ?? null,
        color_legend: colorLegend ?? null
      })
      .select('id,title,description,image_url,color,color_legend,created_at')
      .single();

    if (error || !data) throw new DomainError(`Falha ao criar curso: ${error?.message || 'dados inválidos'}`);
    this.invalidateSystemStatsCache();
    return data as CourseRecord;
  }

  async updateCourse(id: string, patch: { title?: string; description?: string | null; imageUrl?: string | null; color?: string | null; colorLegend?: string | null }): Promise<CourseRecord> {
    const updates: any = { ...patch };
    if (patch.imageUrl !== undefined) {
      updates.image_url = patch.imageUrl;
      delete updates.imageUrl;
    }
    if (patch.colorLegend !== undefined) {
      updates.color_legend = patch.colorLegend;
      delete updates.colorLegend;
    }

    const { data, error } = await this.client
      .from('courses')
      .update(updates)
      .eq('id', id)
      .select('id,title,description,image_url,color,color_legend,created_at')
      .single();

    if (error || !data) throw new DomainError(`Falha ao atualizar curso: ${error?.message || 'dados inválidos'}`);
    return data as CourseRecord;
  }

  async deleteCourse(id: string): Promise<void> {
    const { data, error } = await this.client.from('courses').delete().eq('id', id).select('id');
    if (error) throw new DomainError(`Falha ao excluir curso: ${error.message}`);
    if (!data || data.length === 0) {
      throw new DomainError(
        'Nenhum curso foi excluído. Verifique se você está logado como INSTRUCTOR e se existe a policy `courses_delete_instructors` (RLS) na tabela `courses`.'
      );
    }
    this.invalidateSystemStatsCache();
  }

  async listModules(courseId: string): Promise<ModuleRecord[]> {
    const { data, error } = await this.client
      .from('modules')
      .select('id,course_id,title,position,created_at')
      .eq('course_id', courseId)
      .order('position', { ascending: true });

    if (error) throw new DomainError(`Falha ao listar módulos: ${error.message}`);
    return (data || []) as ModuleRecord[];
  }

  async createModule(courseId: string, title: string, position?: number): Promise<ModuleRecord> {
    const { data, error } = await this.client
      .from('modules')
      .insert({ course_id: courseId, title, position: position ?? 0 })
      .select('id,course_id,title,position,created_at')
      .single();

    if (error || !data) throw new DomainError(`Falha ao criar módulo: ${error?.message || 'dados inválidos'}`);
    this.invalidateSystemStatsCache();
    return data as ModuleRecord;
  }

  async updateModule(id: string, patch: { title?: string; position?: number | null }): Promise<ModuleRecord> {
    const { data, error } = await this.client
      .from('modules')
      .update({ ...patch })
      .eq('id', id)
      .select('id,course_id,title,position,created_at')
      .single();

    if (error || !data) throw new DomainError(`Falha ao atualizar módulo: ${error?.message || 'dados inválidos'}`);
    return data as ModuleRecord;
  }

  async getModule(id: string): Promise<ModuleRecord> {
    const { data, error } = await this.client
      .from('modules')
      .select('id,course_id,title,position,created_at')
      .eq('id', id)
      .single();

    if (error || !data) throw new DomainError(`Falha ao buscar módulo: ${error?.message || 'módulo não encontrado'}`);
    return data as ModuleRecord;
  }

  async deleteModule(id: string): Promise<void> {
    const { data, error } = await this.client.from('modules').delete().eq('id', id).select('id');
    if (error) throw new DomainError(`Falha ao excluir módulo: ${error.message}`);
    if (!data || data.length === 0) {
      throw new DomainError(
        'Nenhum módulo foi excluído. Verifique se você está logado como INSTRUCTOR e se existe a policy `modules_delete_instructors` (RLS) na tabela `modules`.'
      );
    }
    this.invalidateSystemStatsCache();
  }

  async listLessons(moduleId: string, options?: { summary?: boolean }): Promise<LessonRecord[]> {
    const summaryMode = options?.summary ?? false;
    const selectFields = summaryMode
      ? 'id,module_id,title,position,created_at'
      : 'id,module_id,title,content,video_url,video_urls,audio_url,image_url,duration_seconds,position,content_blocks,created_at';

    const { data, error } = await this.client
      .from('lessons')
      .select(selectFields)
      .eq('module_id', moduleId)
      .order('position', { ascending: true });

    if (error) throw new DomainError(`Falha ao listar aulas: ${error.message}`);
    if (!summaryMode) return (data || []) as unknown as LessonRecord[];

    // Keep shape compatible while avoiding heavy content transfer in summary mode.
    return (data || []).map((row: any) => ({
      id: row.id,
      module_id: row.module_id,
      title: row.title,
      content: null,
      video_url: null,
      video_urls: null,
      audio_url: null,
      image_url: null,
      duration_seconds: null,
      position: row.position ?? null,
      content_blocks: null,
      created_at: row.created_at
    })) as LessonRecord[];
  }

  async createLesson(
    moduleId: string,
    payload: {
      title: string;
      content?: string;
      videoUrl?: string;
      audioUrl?: string;
      imageUrl?: string;
      durationSeconds?: number;
      position?: number;
    }
  ): Promise<LessonRecord> {
    const { data, error } = await this.client
      .from('lessons')
      .insert({
        module_id: moduleId,
        title: payload.title,
        content: payload.content ?? null,
        video_url: payload.videoUrl ?? null,
        audio_url: payload.audioUrl ?? null,
        image_url: payload.imageUrl ?? null,
        duration_seconds: payload.durationSeconds ?? 0,
        position: payload.position ?? 0
      })
      .select('id,module_id,title,content,video_url,video_urls,audio_url,image_url,duration_seconds,position,created_at')
      .single();

    if (error || !data) throw new DomainError(`Falha ao criar aula: ${error?.message || 'dados inválidos'}`);
    this.invalidateSystemStatsCache();
    return data as LessonRecord;
  }

  async updateLesson(
    id: string,
    patch: {
      title?: string;
      content?: string | null;
      videoUrl?: string | null;
      videoUrls?: { url: string; title: string }[] | null;
      audioUrl?: string | null;
      imageUrl?: string | null;
      durationSeconds?: number | null;
      position?: number | null;
      contentBlocks?: any[] | null;
    }
  ): Promise<LessonRecord> {
    const updates: Record<string, unknown> = {};
    if (patch.title !== undefined) updates.title = patch.title;
    if (patch.content !== undefined) updates.content = patch.content;
    if (patch.videoUrl !== undefined) updates.video_url = patch.videoUrl;
    if (patch.videoUrls !== undefined) updates.video_urls = patch.videoUrls;
    if (patch.audioUrl !== undefined) updates.audio_url = patch.audioUrl;
    if (patch.imageUrl !== undefined) updates.image_url = patch.imageUrl;
    if (patch.durationSeconds !== undefined) updates.duration_seconds = patch.durationSeconds;
    if (patch.position !== undefined) updates.position = patch.position;
    if (patch.contentBlocks !== undefined) updates.content_blocks = patch.contentBlocks;

    console.log('🗄️ SUPABASE - Enviando para DB:', JSON.stringify(updates, null, 2));

    console.log(`🗄️ SUPABASE - Atualizando aula ID: ${id}`);

    const { data, error } = await this.client
      .from('lessons')
      .update(updates)
      .eq('id', id)
      .select('id,module_id,title,content,video_url,video_urls,audio_url,image_url,duration_seconds,position,content_blocks,created_at')
      .maybeSingle();

    if (error) {
      console.error('❌ SUPABASE - ERRO ao atualizar:', JSON.stringify(error, null, 2));
    }

    console.log('🗄️ SUPABASE - Retornado do DB:', JSON.stringify(data, null, 2));

    if (error || !data) throw new DomainError(`Falha ao atualizar aula: ${error?.message || 'dados inválidos'}`);
    return data as LessonRecord;
  }

  async getLesson(id: string): Promise<LessonRecord> {
    const { data, error } = await this.client
      .from('lessons')
      .select('id,module_id,title,content,video_url,video_urls,audio_url,image_url,duration_seconds,position,content_blocks,created_at')
      .eq('id', id)
      .single();

    if (error || !data) throw new DomainError(`Falha ao buscar aula: ${error?.message || 'aula não encontrada'}`);
    return data as LessonRecord;
  }

  async deleteLesson(id: string): Promise<void> {
    const { data, error } = await this.client.from('lessons').delete().eq('id', id).select('id');
    if (error) throw new DomainError(`Falha ao excluir aula: ${error.message}`);
    if (!data || data.length === 0) {
      throw new DomainError(
        'Nenhuma aula foi excluída. Verifique se você está logado como INSTRUCTOR e se existe a policy `lessons_delete_instructors` (RLS) na tabela `lessons`.'
      );
    }
    this.invalidateSystemStatsCache();
  }

  async moveLesson(lessonId: string, targetModuleId: string): Promise<LessonRecord> {
    const { data, error } = await this.client
      .from('lessons')
      .update({ module_id: targetModuleId })
      .eq('id', lessonId)
      .select('id,module_id,title,content,video_url,video_urls,audio_url,image_url,duration_seconds,position,content_blocks,created_at')
      .single();

    if (error || !data) throw new DomainError(`Falha ao mover aula: ${error?.message || 'dados inválidos'}`);
    return data as LessonRecord;
  }

  async listLessonResources(lessonId: string): Promise<LessonResourceRecord[]> {
    const { data, error } = await this.client
      .from('lesson_resources')
      .select('id,lesson_id,title,resource_type,url,position,category,storage_provider,storage_bucket,storage_path,mime_type,file_size_bytes,original_filename,migrated_at,created_at')
      .eq('lesson_id', lessonId)
      .order('position', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) throw new DomainError(`Falha ao listar materiais: ${error.message}`);
    return (data || []) as LessonResourceRecord[];
  }

  async createLessonResource(
    lessonId: string,
    payload: {
      title: string;
      resourceType: LessonResourceRecord['resource_type'];
      url: string;
      position?: number;
      category?: string;
      storageProvider?: LessonResourceRecord['storage_provider'];
      storageBucket?: string | null;
      storagePath?: string | null;
      mimeType?: string | null;
      fileSizeBytes?: number | null;
      originalFilename?: string | null;
    }
  ): Promise<LessonResourceRecord> {
    const { data, error } = await this.client
      .from('lesson_resources')
      .insert({
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
      })
      .select('id,lesson_id,title,resource_type,url,position,category,storage_provider,storage_bucket,storage_path,mime_type,file_size_bytes,original_filename,migrated_at,created_at')
      .single();

    if (error || !data) throw new DomainError(`Falha ao criar material: ${error?.message || 'dados inválidos'}`);
    return data as LessonResourceRecord;
  }

  async updateLessonResource(
    id: string,
    patch: {
      title?: string;
      resourceType?: LessonResourceRecord['resource_type'];
      url?: string;
      position?: number | null;
      category?: string;
      storageProvider?: LessonResourceRecord['storage_provider'];
      storageBucket?: string | null;
      storagePath?: string | null;
      mimeType?: string | null;
      fileSizeBytes?: number | null;
      originalFilename?: string | null;
    }
  ): Promise<LessonResourceRecord> {
    const updates: Record<string, unknown> = {};
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

    const { data, error } = await this.client
      .from('lesson_resources')
      .update(updates)
      .eq('id', id)
      .select('id,lesson_id,title,resource_type,url,position,category,storage_provider,storage_bucket,storage_path,mime_type,file_size_bytes,original_filename,migrated_at,created_at')
      .single();

    if (error || !data) throw new DomainError(`Falha ao atualizar material: ${error?.message || 'dados inválidos'}`);
    return data as LessonResourceRecord;
  }

  async deleteLessonResource(id: string): Promise<void> {
    const { data, error } = await this.client.from('lesson_resources').delete().eq('id', id).select('id');
    if (error) throw new DomainError(`Falha ao excluir material: ${error.message}`);
    if (!data || data.length === 0) {
      throw new DomainError(
        'Nenhum material foi excluído. Verifique se você está logado como INSTRUCTOR e se existe a policy `lesson_resources_delete_instructors` (RLS) na tabela `lesson_resources`.'
      );
    }
  }

  async listProfiles(): Promise<ProfileRecord[]> {
    const { data, error } = await this.client
      .from('profiles')
      .select('id,email,name,role,xp_total,current_level,updated_at,approval_status,approved_at,approved_by,rejection_reason')
      .order('updated_at', { ascending: false });

    if (error) throw new DomainError(`Falha ao listar usuários: ${error.message}`);

    return (data || []) as ProfileRecord[];
  }

  // ... (keeping other methods)

  async updateProfile(id: string, patch: { role?: 'STUDENT' | 'INSTRUCTOR' | 'MASTER'; isMinor?: boolean }): Promise<void> {
    const updates: any = { updated_at: new Date().toISOString() };
    if (patch.role) updates.role = patch.role;
    if (patch.isMinor !== undefined) updates.is_minor = patch.isMinor;

    const { error } = await this.client.from('profiles').update(updates).eq('id', id);
    if (error) throw new DomainError(`Falha ao atualizar perfil: ${error.message}`);
  }

  async fetchPendingUsers(): Promise<ProfileRecord[]> {
    const { data, error } = await this.client
      .from('profiles')
      .select('id,email,name,role,xp_total,current_level,updated_at,approval_status,approved_at,approved_by,rejection_reason')
      .eq('approval_status', 'pending');

    if (error) throw new DomainError(`Falha ao buscar usuários pendentes: ${error.message}`);
    return (data || []) as ProfileRecord[];
  }

  async fetchApprovedUsers(): Promise<ProfileRecord[]> {
    const { data, error } = await this.client
      .from('profiles')
      .select('id,email,name,role,xp_total,current_level,updated_at,approval_status,approved_at,approved_by,rejection_reason')
      .eq('approval_status', 'approved');

    if (error) throw new DomainError(`Falha ao buscar usuários aprovados: ${error.message}`);
    return (data || []) as ProfileRecord[];
  }

  async fetchRejectedUsers(): Promise<ProfileRecord[]> {
    const { data, error } = await this.client
      .from('profiles')
      .select('id,email,name,role,xp_total,current_level,updated_at,approval_status,approved_at,approved_by,rejection_reason')
      .eq('approval_status', 'rejected');

    if (error) throw new DomainError(`Falha ao buscar usuários rejeitados: ${error.message}`);
    return (data || []) as ProfileRecord[];
  }

  async assignCoursesToUser(userId: string, courseIds: string[], adminId: string): Promise<void> {
    if (courseIds.length === 0) return;
    const records = courseIds.map(cid => ({
      user_id: userId,
      course_id: cid,
      enrolled_at: new Date().toISOString(),
      // assigned_by removed as it's not in course_enrollments
      is_active: true
    }));

    const { error } = await this.client.from('course_enrollments').upsert(records, { onConflict: 'user_id,course_id' });
    if (error) throw new DomainError(`Falha ao atribuir cursos: ${error.message}`);
  }

  async addUserCourseAssignment(userId: string, courseId: string): Promise<void> {
    return this.assignCoursesToUser(userId, [courseId], 'system');
  }

  async removeAllUserCourseAssignments(userId: string): Promise<void> {
    const { error } = await this.client.from('course_enrollments').delete().eq('user_id', userId);
    if (error) throw new DomainError(`Falha ao remover todos os cursos do usuário: ${error.message}`);
  }

  async deleteProfile(userId: string): Promise<void> {
    // First remove related data if not cascaded
    await this.removeAllUserCourseAssignments(userId);
    const { error } = await this.client.from('profiles').delete().eq('id', userId);
    if (error) throw new DomainError(`Falha ao excluir perfil: ${error.message}`);
    this.invalidateSystemStatsCache();
  }

  async updateProfileRole(profileId: string, role: 'STUDENT' | 'INSTRUCTOR' | 'MASTER'): Promise<void> {
    return this.updateProfile(profileId, { role });
  }

  async approveUser(userId: string, adminId: string): Promise<void> {
    const { error } = await this.client
      .from('profiles')
      .update({
        approval_status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: adminId,
        rejection_reason: null
      })
      .eq('id', userId);

    if (error) throw new DomainError(`Falha ao aprovar usuário: ${error.message}`);
  }

  async resetUserPassword(userId: string, newPassword: string): Promise<void> {
    const { error } = await this.client.rpc('admin_reset_password', {
      target_user_id: userId,
      new_password: newPassword
    });

    if (error) throw new DomainError(`Falha ao resetar senha: ${error.message}`);
  }

  async rejectUser(userId: string, adminId: string, reason?: string): Promise<void> {
    const { error } = await this.client
      .from('profiles')
      .update({
        approval_status: 'rejected',
        approved_at: null,
        approved_by: adminId,
        rejection_reason: reason || 'Bloqueado pelo administrador'
      })
      .eq('id', userId);

    if (error) throw new DomainError(`Falha ao bloquear usuário: ${error.message}`);
  }

  async getUserCourseAssignments(userId: string): Promise<string[]> {
    const { data, error } = await this.client
      .from('course_enrollments')
      .select('course_id')
      .eq('user_id', userId);

    if (error) throw new DomainError(`Falha ao buscar cursos do usuário: ${error.message}`);
    return (data || []).map(d => d.course_id);
  }

  async removeUserCourseAssignment(userId: string, courseId: string): Promise<void> {
    const { error } = await this.client
      .from('course_enrollments')
      .delete()
      .eq('user_id', userId)
      .eq('course_id', courseId);

    if (error) throw new DomainError(`Falha ao remover atribuição de curso: ${error.message}`);
  }

  async getSystemStats(): Promise<any> {
    const cached = this.getCachedSystemStats();
    if (cached) return cached;

    const { data: rpcData, error: rpcError } = await this.client.rpc('get_db_stats');

    // Fallback if RPC fails or not created yet
    if (rpcError || !rpcData) {
      if (rpcError) console.warn("RPC get_db_stats failed, falling back to manual count", rpcError);

      // Manual count
      const [{ count: courseCount }, { count: moduleCount }, { count: lessonCount }, { count: userCount }] = await Promise.all([
        this.client.from('courses').select('id', { count: 'exact', head: true }),
        this.client.from('modules').select('id', { count: 'exact', head: true }),
        this.client.from('lessons').select('id', { count: 'exact', head: true }),
        this.client.from('profiles').select('id', { count: 'exact', head: true })
      ]);

      const fallback = {
        db_size: 'N/A',
        user_count: userCount || 0,
        course_count: courseCount || 0,
        module_count: moduleCount || 0,
        lesson_count: lessonCount || 0,
        file_count: 0,
        storage_size_bytes: 0
      };
      this.setSystemStatsCache(fallback);
      return fallback;
    }

    // Se o RPC retornou, mas precisamos garantir o module_count se não vier
    if (rpcData.module_count === undefined) {
      const { count: moduleCount } = await this.client.from('modules').select('id', { count: 'exact', head: true });
      rpcData.module_count = moduleCount || 0;
    }

    this.setSystemStatsCache(rpcData);
    return rpcData;
  }

  // ============ QUIZ METHODS IMPLEMENTATION ============

  /**
   * Busca quiz completo (com perguntas e opções) por lesson_id
   */
  async getQuizByLessonId(lessonId: string): Promise<any | null> {
    const { data: quizData, error: quizError } = await this.client
      .from('quizzes')
      .select(`
        id,
        lesson_id,
        title,
        description,
        passing_score,
        quiz_questions (
          id,
          quiz_id,
          question_text,
          question_type,
          position,
          points,
          quiz_options (
            id,
            question_id,
            option_text,
            is_correct,
            position
          )
        )
      `)
      .eq('lesson_id', lessonId)
      .maybeSingle();

    if (quizError) throw new DomainError(`Erro ao buscar quiz: ${quizError.message}`);
    if (!quizData) return null;

    return quizData;
  }

  /**
   * Cria quiz completo (quiz + perguntas + opções)
   */
  async createQuiz(quiz: any): Promise<any> {
    // 1. Inserir quiz
    const { data: quizData, error: quizError } = await this.client
      .from('quizzes')
      .insert({
        lesson_id: quiz.lessonId,
        title: quiz.title,
        description: quiz.description,
        passing_score: quiz.passingScore
      })
      .select('id')
      .single();

    if (quizError) throw new DomainError(`Erro ao criar quiz: ${quizError.message}`);

    // 2. Inserir perguntas
    for (const question of quiz.questions) {
      const { data: questionData, error: questionError } = await this.client
        .from('quiz_questions')
        .insert({
          quiz_id: quizData.id,
          question_text: question.questionText,
          question_type: question.questionType,
          position: question.position,
          points: question.points
        })
        .select('id')
        .single();

      if (questionError) throw new DomainError(`Erro ao criar pergunta: ${questionError.message}`);

      // 3. Inserir opções
      const options = question.options.map((o: any) => ({
        question_id: questionData.id,
        option_text: o.optionText,
        is_correct: o.isCorrect,
        position: o.position
      }));

      const { error: optionsError } = await this.client
        .from('quiz_options')
        .insert(options);

      if (optionsError) throw new DomainError(`Erro ao criar opções: ${optionsError.message}`);
    }

    // Retornar quiz criado
    const createdQuiz = await this.getQuizByLessonId(quiz.lessonId);
    if (!createdQuiz) throw new DomainError('Quiz criado mas não foi possível recuperá-lo');
    return createdQuiz;
  }

  /**
   * Atualiza quiz existente (apenas metadados, não perguntas)
   */
  async updateQuiz(quiz: any): Promise<any> {
    const { error } = await this.client
      .from('quizzes')
      .update({
        title: quiz.title,
        description: quiz.description,
        passing_score: quiz.passingScore
      })
      .eq('id', quiz.id);

    if (error) throw new DomainError(`Erro ao atualizar quiz: ${error.message}`);

    const updated = await this.getQuizByLessonId(quiz.lessonId);
    if (!updated) throw new DomainError('Quiz não encontrado após atualização');
    return updated;
  }

  /**
   * Deleta quiz (CASCADE deleta perguntas e opções)
   */
  async deleteQuiz(quizId: string): Promise<void> {
    const { error } = await this.client
      .from('quizzes')
      .delete()
      .eq('id', quizId);

    if (error) throw new DomainError(`Erro ao deletar quiz: ${error.message}`);
  }

  /**
   * Registra tentativa de quiz
   */
  /**
   * Busca última tentativa do usuário
   */
  async getLatestQuizAttempt(userId: string, quizId: string): Promise<any | null> {
    const { data, error } = await this.client
      .from('quiz_attempts')
      .select('id, user_id, quiz_id, score, passed, answers, attempt_number, completed_at')
      .eq('user_id', userId)
      .eq('quiz_id', quizId)
      .order('completed_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw new DomainError(`Erro ao buscar tentativa: ${error.message}`);
    if (!data) return null;

    return data;
  }

  /**
   * Busca todas as tentativas do usuário em um quiz
   */
  async getQuizAttempts(userId: string, quizId: string): Promise<any[]> {
    const { data, error } = await this.client
      .from('quiz_attempts')
      .select('id, user_id, quiz_id, score, passed, answers, attempt_number, completed_at')
      .eq('user_id', userId)
      .eq('quiz_id', quizId)
      .order('completed_at', { ascending: false });

    if (error) throw new DomainError(`Erro ao buscar tentativas: ${error.message}`);

    return (data || []);
  }


  // ============ XP HISTORY ============
  async getXpHistory(userId: string): Promise<import('../domain/admin').XpLogRecord[]> {
    const { data, error } = await this.client
      .from('xp_history')
      .select('id, user_id, amount, action_type, description, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw new DomainError(`Erro ao buscar histórico de XP: ${error.message}`);
    return (data || []) as import('../domain/admin').XpLogRecord[];
  }

  async logActivity(userId: string, actionType: string, description: string): Promise<void> {
    // Reuse xp_history for general logging (Amount = 0)
    const { error } = await this.client.rpc('append_audit_log', {
      p_session_id: crypto.randomUUID(),
      p_path: 'application',
      p_page_title: actionType,
      p_resource_title: null,
      p_new_events: [{ action: actionType, description }],
      p_stats_delta: {}
    });
    if (error) console.error('Falha ao registrar atividade:', error.message);
  }

  async getStudentQuizAttemptsForStaff(filters: StudentActivityFilters = {}): Promise<StaffQuizAttemptRecord[]> {
    const normalized = normalizeStudentActivityFilters(filters);
    const { data, error } = await this.client.rpc('get_student_quiz_attempts_for_staff', {
      p_student_id: normalized.studentId,
      p_course_id: normalized.courseId,
      p_quiz_id: normalized.quizId,
      p_from: normalized.from,
      p_to: normalized.to,
      p_limit: normalized.attemptLimit,
    });

    if (error) throw new DomainError(`Falha ao buscar tentativas dos alunos: ${error.message}`);
    return (data || []) as StaffQuizAttemptRecord[];
  }

  async getStudentActivityLogsForStaff(filters: StudentActivityFilters = {}): Promise<StaffActivityLogRecord[]> {
    const normalized = normalizeStudentActivityFilters(filters);
    const { data, error } = await this.client.rpc('get_student_activity_logs_for_staff', {
      p_student_id: normalized.studentId,
      p_course_id: normalized.courseId,
      p_action_type: normalized.actionType,
      p_from: normalized.from,
      p_to: normalized.to,
      p_limit: normalized.logLimit,
    });

    if (error) throw new DomainError(`Falha ao buscar atividades dos alunos: ${error.message}`);
    return (data || []) as StaffActivityLogRecord[];
  }

  async getStudentActivitySummaryForStaff(filters: StudentActivityFilters = {}): Promise<StudentActivitySummary> {
    const normalized = normalizeStudentActivityFilters(filters);
    const { data, error } = await this.client.rpc('get_student_activity_summary_for_staff', {
      p_student_id: normalized.studentId,
      p_course_id: normalized.courseId,
      p_quiz_id: normalized.quizId,
      p_action_type: normalized.actionType,
      p_from: normalized.from,
      p_to: normalized.to,
    });

    if (error) throw new DomainError(`Falha ao resumir atividades dos alunos: ${error.message}`);

    const summary = Array.isArray(data) ? data[0] : data;
    return (summary || {
      total_students: 0,
      total_attempts: 0,
      passed_attempts: 0,
      failed_attempts: 0,
      average_score: null,
      total_logs: 0,
      active_students_7d: 0,
      active_students_30d: 0,
      last_activity_at: null,
    }) as StudentActivitySummary;
  }

  // ============ COURSE ACCESS CONTROL ============

  async getCourseUserAssignments(courseId: string): Promise<string[]> {
    const { data, error } = await this.client
      .from('user_course_assignments')
      .select('user_id')
      .eq('course_id', courseId);

    if (error) throw new DomainError(`Falha ao buscar usuários do curso: ${error.message}`);
    return (data || []).map(d => d.user_id);
  }

  async assignUsersToCourse(courseId: string, userIds: string[], adminId: string): Promise<void> {
    // 1. Remove current assignments for this course
    const { error: deleteError } = await this.client
      .from('user_course_assignments')
      .delete()
      .eq('course_id', courseId);

    if (deleteError) throw new DomainError(`Erro ao limpar atribuições antigas: ${deleteError.message}`);

    // 2. Insert new assignments
    if (userIds.length > 0) {
      const rows = userIds.map(userId => ({
        user_id: userId,
        course_id: courseId,
        assigned_at: new Date().toISOString(),
        assigned_by: adminId
      }));

      const { error: insertError } = await this.client
        .from('user_course_assignments')
        .insert(rows);

      if (insertError) throw new DomainError(`Erro ao atribuir usuários ao curso: ${insertError.message}`);
    }
  }

  // ============ SYSTEM SETTINGS ============
  async getSystemSettings(): Promise<{ key: string; value: string; description: string }[]> {
    const { data, error } = await this.client
      .from('system_settings')
      .select('key, value, description');

    if (error) throw new DomainError(`Erro ao buscar configurações do sistema: ${error.message}`);
    return (data || []) as { key: string; value: string; description: string }[];
  }

  async updateSystemSetting(key: string, value: string): Promise<void> {
    const { error } = await this.client
      .from('system_settings')
      .upsert({ key, value });

    if (error) throw new DomainError(`Erro ao atualizar configuração ${key}: ${error.message}`);
  }

  // ============ MONITORING ============
  async getNetworkUsage(): Promise<{ egress_bytes: number; storage_bytes: number; db_size_bytes: number; is_mock: boolean }> {
    try {
      const { data, error } = await this.client.functions.invoke('monitor-usage');
      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Failed to fetch network usage', err);
      return { egress_bytes: 0, storage_bytes: 0, db_size_bytes: 0, is_mock: false };
    }
  }

  async sendNotification(userId: string, senderId: string, title: string, message: string, type: string, link?: string): Promise<void> {
    const { error } = await this.client
      .from('notifications')
      .insert({
        user_id: userId,
        sender_id: senderId,
        title,
        message,
        type,
        link
      });

    if (error) throw new DomainError(`Erro ao enviar notificação: ${error.message}`);
  }

  async listEnrolledStudentsByInstructor(instructorId: string): Promise<ProfileRecord[]> {
    // 1. Get courses where instructor is the main instructor
    const { data: mainCourses } = await this.client
      .from('courses')
      .select('id')
      .eq('instructor_id', instructorId);

    // 2. Get courses where instructor is assigned via enrollments (Course Editors/Co-Instructors)
    const { data: assignedCourses } = await this.client
      .from('course_enrollments')
      .select('course_id')
      .eq('user_id', instructorId);

    const courseIds = Array.from(new Set([
      ...(mainCourses || []).map(c => c.id),
      ...(assignedCourses || []).map(ce => ce.course_id)
    ]));

    if (courseIds.length === 0) return [];

    // 1. Get all user IDs from these courses
    const { data: enrollments, error: enrollError } = await this.client
      .from('course_enrollments')
      .select('user_id')
      .in('course_id', courseIds);

    if (enrollError) throw new DomainError(`Erro ao buscar matrículas: ${enrollError.message}`);
    
    const userIds = (enrollments || []).map(e => e.user_id);
    if (userIds.length === 0) return [];

    // 2. Fetch profiles for these users (only columns known to exist)
    const { data, error } = await this.client
      .from('profiles')
      .select('id, name, email, role, xp_total, current_level')
      .in('id', userIds)
      .eq('role', 'STUDENT');

    if (error) throw new DomainError(`Erro ao buscar perfis dos alunos: ${error.message}`);

    
    const profilesMap = new Map<string, ProfileRecord>();
    (data || []).forEach((e: any) => {
      profilesMap.set(e.id, {
        id: e.id,
        name: e.name,
        email: e.email,
        role: e.role,
        xp_total: e.xp_total,
        current_level: e.current_level,
        created_at: e.created_at,
        updated_at: e.updated_at,
        is_minor: e.is_minor
      });
    });

    return Array.from(profilesMap.values());
  }

  async assignLessonsToInstructor(userId: string, lessonIds: string[]): Promise<void> {
    if (lessonIds.length === 0) return;

    const { error } = await this.client
      .from('instructor_lesson_assignments')
      .upsert(
        lessonIds.map(lessonId => ({ user_id: userId, lesson_id: lessonId })),
        { onConflict: 'user_id,lesson_id' }
      );

    if (error) throw new DomainError(`Erro ao atribuir aulas ao instrutor: ${error.message}`);
  }

  async listInstructorLessonAssignments(userId: string): Promise<string[]> {
    const { data, error } = await this.client
      .from('instructor_lesson_assignments')
      .select('lesson_id')
      .eq('user_id', userId);

    if (error) throw new DomainError(`Erro ao buscar atribuições de aulas: ${error.message}`);
    return (data || []).map(row => row.lesson_id);
  }

  async removeInstructorLessonAssignment(userId: string, lessonId: string): Promise<void> {
    const { error } = await this.client
      .from('instructor_lesson_assignments')
      .delete()
      .eq('user_id', userId)
      .eq('lesson_id', lessonId);

    if (error) throw new DomainError(`Erro ao remover atribuição de aula: ${error.message}`);
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

  async canEditLesson(userId: string, lessonId: string): Promise<boolean> {
    // 1. Check if user is Master (Proprietário)
    const { data: profile } = await this.client
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (profile?.role === 'MASTER') return true;
    if (profile?.role !== 'INSTRUCTOR') return false;

    // 2. Check Granular Assignments
    const { data: assignment } = await this.client
      .from('instructor_lesson_assignments')
      .select('lesson_id')
      .eq('user_id', userId)
      .eq('lesson_id', lessonId)
      .maybeSingle();

    if (assignment) return true;

    // 3. Fallback: Check if instructor is the primary instructor of the course
    const { data: lesson } = await this.client
      .from('lessons')
      .select('module_id')
      .eq('id', lessonId)
      .single();

    if (lesson) {
      const { data: module } = await this.client
        .from('modules')
        .select('course_id')
        .eq('id', lesson.module_id)
        .single();
      
      if (module) {
        const { data: course } = await this.client
          .from('courses')
          .select('instructor_id')
          .eq('id', module.course_id)
          .single();
        
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

  async getCurrentUserId(): Promise<string | null> {
    const { data: { user } } = await this.client.auth.getUser();
    return user?.id || null;
  }
}
