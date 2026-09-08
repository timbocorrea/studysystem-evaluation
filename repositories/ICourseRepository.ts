import { Course } from '../domain/entities';

export interface ICourseRepository {
  getCourseById(id: string, userId?: string): Promise<Course>;
  getAllCourses(userId?: string): Promise<Course[]>;
  getCoursesSummary(userId?: string): Promise<{
    id: string;
    title: string;
    description: string;
    imageUrl: string | null;
    color?: string | null;
    color_legend?: string | null;
    modules: {
      id: string;
      title?: string | null;
      position?: number | null;
      lessons: { id: string; title?: string | null; position?: number | null }[];
    }[];
  }[]>;
  getEnrolledCourses(userId: string): Promise<Course[]>;
  enrollInCourse(courseId: string): Promise<void>;
  isEnrolled(userId: string, courseId: string): Promise<boolean>;

  /**
   * Busca apenas a estrutura do curso (módulos e metadados das aulas).
   * Otimizado para performance: NÂO retorna conteúdo, blocos ou recursos das aulas.
   */
  getCourseStructure(id: string, userId?: string): Promise<Course>;

  /**
   * Busca o conteúdo completo de uma aula específica.
   */
  getLessonById(lessonId: string, userId?: string): Promise<import('../domain/entities').Lesson | null>;
}
