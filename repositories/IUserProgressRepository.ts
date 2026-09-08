import { LessonProgressRequirements } from '../domain/lesson-requirements';
import { Lesson } from '../domain/entities';

export interface IUserProgressRepository {
  updateLessonProgress(
    userId: string,
    lessonId: string,
    watchedSeconds: number,
    isCompleted: boolean,
    lastBlockId?: string,
    durationSeconds?: number
  ): Promise<void>;

  getLessonRequirements(lessonId: string): Promise<LessonProgressRequirements>;
  saveLessonRequirements(requirements: LessonProgressRequirements): Promise<void>;

  markTextBlockAsRead(userId: string, lessonId: string, blockId: string): Promise<void>;
  markPdfViewed(userId: string, lessonId: string, pdfId: string): Promise<void>;
  markAudioPlayed(userId: string, lessonId: string, audioId: string): Promise<void>;
  markMaterialAccessed(userId: string, lessonId: string, materialId: string): Promise<void>;

  getCourseProgressSummary(userId: string): Promise<{ courseId: string; title: string; progress: number }[]>;
}
