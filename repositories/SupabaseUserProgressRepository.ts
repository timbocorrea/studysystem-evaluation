import { SupabaseClient } from '@supabase/supabase-js';
import { IUserProgressRepository } from './IUserProgressRepository';
import { LessonProgressRequirements } from '../domain/lesson-requirements';
import { DomainError } from '../domain/errors';

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

type DetailedProgressSeen = {
  text: Set<string>;
  pdf: Set<string>;
  audio: Set<string>;
  material: Set<string>;
};

export class SupabaseUserProgressRepository implements IUserProgressRepository {
  private client: SupabaseClient;
  private detailedProgressSeenByLesson = new Map<string, DetailedProgressSeen>();

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  private getDetailedProgressSeen(userId: string, lessonId: string): DetailedProgressSeen {
    const key = `${userId}:${lessonId}`;
    let seen = this.detailedProgressSeenByLesson.get(key);
    if (!seen) {
      seen = {
        text: new Set<string>(),
        pdf: new Set<string>(),
        audio: new Set<string>(),
        material: new Set<string>()
      };
      this.detailedProgressSeenByLesson.set(key, seen);
      if (this.detailedProgressSeenByLesson.size > 500) {
        this.detailedProgressSeenByLesson.clear();
      }
    }
    return seen;
  }

  async updateLessonProgress(
    userId: string,
    lessonId: string, 
    watchedSeconds: number, 
    isCompleted: boolean, 
    lastBlockId?: string, 
    durationSeconds?: number
  ): Promise<void> {
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const blockIdParam = (lastBlockId && UUID_REGEX.test(lastBlockId)) ? lastBlockId : null;
    void userId;
    void durationSeconds;

    const { error } = await this.client.rpc('update_lesson_progress_secure', {
      p_lesson_id: lessonId,
      p_watched_seconds: watchedSeconds,
      p_is_completed: isCompleted,
      p_last_block_id: blockIdParam
    });

    if (error) throw new DomainError(`Falha ao persistir progresso: ${error.message}`);
  }

  async getLessonRequirements(lessonId: string): Promise<LessonProgressRequirements> {
    const { data, error } = await this.client
      .from('lesson_progress_requirements')
      .select('lesson_id, video_required_percent, text_blocks_required_percent, required_pdfs, required_audios, required_materials')
      .eq('lesson_id', lessonId)
      .maybeSingle();

    if (error) throw new DomainError(`Erro ao buscar requisitos: ${error.message}`);
    if (!data) return new LessonProgressRequirements(lessonId, 90, 0, [], [], []);

    return new LessonProgressRequirements(
      data.lesson_id,
      data.video_required_percent,
      data.text_blocks_required_percent,
      data.required_pdfs || [],
      data.required_audios || [],
      data.required_materials || []
    );
  }

  async saveLessonRequirements(requirements: LessonProgressRequirements): Promise<void> {
    const { error } = await this.client
      .from('lesson_progress_requirements')
      .upsert({
        lesson_id: requirements.lessonId,
        video_required_percent: requirements.videoRequiredPercent,
        text_blocks_required_percent: requirements.textBlocksRequiredPercent,
        required_pdfs: requirements.requiredPdfs,
        required_audios: requirements.requiredAudios,
        required_materials: requirements.requiredMaterials
      });

    if (error) throw new DomainError(`Erro ao salvar requisitos: ${error.message}`);
  }

  private async recordProgressEvent(
    userId: string,
    lessonId: string,
    eventType: 'TEXT_BLOCK' | 'PDF' | 'AUDIO' | 'MATERIAL',
    referenceId: string
  ): Promise<void> {
    const seen = this.getDetailedProgressSeen(userId, lessonId);
    const target = eventType === 'TEXT_BLOCK'
      ? seen.text
      : eventType === 'PDF'
        ? seen.pdf
        : eventType === 'AUDIO'
          ? seen.audio
          : seen.material;
    if (target.has(referenceId)) return;

    const { error } = await this.client.rpc('record_lesson_progress_event', {
      p_lesson_id: lessonId,
      p_event_type: eventType,
      p_reference_id: referenceId
    });
    if (error) throw new DomainError(`Falha ao registrar progresso detalhado: ${error.message}`);
    target.add(referenceId);
  }

  async markTextBlockAsRead(userId: string, lessonId: string, blockId: string): Promise<void> {
    return this.recordProgressEvent(userId, lessonId, 'TEXT_BLOCK', blockId);
  }

  async markPdfViewed(userId: string, lessonId: string, pdfId: string): Promise<void> {
    return this.recordProgressEvent(userId, lessonId, 'PDF', pdfId);
  }

  async markAudioPlayed(userId: string, lessonId: string, audioId: string): Promise<void> {
    return this.recordProgressEvent(userId, lessonId, 'AUDIO', audioId);
  }

  async markMaterialAccessed(userId: string, lessonId: string, materialId: string): Promise<void> {
    return this.recordProgressEvent(userId, lessonId, 'MATERIAL', materialId);
  }

  async getCourseProgressSummary(userId: string): Promise<{ courseId: string; title: string; progress: number }[]> {
    const { data: enrollments, error } = await this.client
      .from('course_enrollments')
      .select('course_id, courses(title, modules(lessons(id)))')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (error) throw new DomainError(error.message);

    const { data: progressData } = await this.client
      .from('lesson_progress')
      .select('lesson_id, is_completed')
      .eq('user_id', userId);

    const completedLessonIds = new Set((progressData || []).filter(p => p.is_completed).map(p => p.lesson_id));

    return (enrollments || []).map((e: any) => {
      const allLessons = (e.courses?.modules || []).flatMap((m: any) => m.lessons || []);
      const totalLessons = allLessons.length;
      const completedCount = allLessons.filter((l: any) => completedLessonIds.has(l.id)).length;
      
      return {
        courseId: e.course_id,
        title: e.courses?.title || 'Curso Sem Título',
        progress: totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0
      };
    });
  }
}
