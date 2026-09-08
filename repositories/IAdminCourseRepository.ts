import { CourseRecord, LessonRecord, LessonResourceRecord, ModuleRecord } from '../domain/admin';

export interface IAdminCourseRepository {
  listCourses(): Promise<CourseRecord[]>;
  listCoursesWithContent(): Promise<import('../domain/admin').CourseStructure[]>;
  listCoursesOutline(): Promise<import('../domain/admin').CourseOutline[]>;
  createCourse(title: string, description?: string, imageUrl?: string, color?: string, colorLegend?: string): Promise<CourseRecord>;
  updateCourse(id: string, patch: { title?: string; description?: string | null; imageUrl?: string | null; color?: string | null; colorLegend?: string | null }): Promise<CourseRecord>;
  deleteCourse(id: string): Promise<void>;

  listModules(courseId: string): Promise<ModuleRecord[]>;
  getModule(id: string): Promise<ModuleRecord>;
  createModule(courseId: string, title: string, position?: number): Promise<ModuleRecord>;
  updateModule(id: string, patch: { title?: string; position?: number | null }): Promise<ModuleRecord>;
  deleteModule(id: string): Promise<void>;

  listLessons(moduleId: string, options?: { summary?: boolean }): Promise<LessonRecord[]>;
  createLesson(
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
  ): Promise<LessonRecord>;
  updateLesson(
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
  ): Promise<LessonRecord>;
  getLesson(id: string): Promise<LessonRecord>;
  deleteLesson(id: string): Promise<void>;
  moveLesson(lessonId: string, targetModuleId: string): Promise<LessonRecord>;

  listLessonResources(lessonId: string): Promise<LessonResourceRecord[]>;
  createLessonResource(
    lessonId: string,
    payload: { title: string; resourceType: LessonResourceRecord['resource_type']; url: string; position?: number }
  ): Promise<LessonResourceRecord>;
  updateLessonResource(
    id: string,
    patch: { title?: string; resourceType?: LessonResourceRecord['resource_type']; url?: string; position?: number | null }
  ): Promise<LessonResourceRecord>;
  deleteLessonResource(id: string): Promise<void>;

  canEditLesson(userId: string, lessonId: string): Promise<boolean>;
  listActiveCourseEnrollmentIds(userId: string): Promise<string[]>;
  listUserCourseAssignmentIds(userId: string): Promise<string[]>;
  assignLessonsToInstructor(userId: string, lessonIds: string[]): Promise<void>;
  listInstructorLessonAssignments(userId: string): Promise<string[]>;
  removeInstructorLessonAssignment(userId: string, lessonId: string): Promise<void>;
}
