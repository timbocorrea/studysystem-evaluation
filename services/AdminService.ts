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
import { Course, Module, Lesson } from '../domain/entities';
import { IAdminCourseRepository } from '../repositories/IAdminCourseRepository';
import { IAdminUserRepository } from '../repositories/IAdminUserRepository';
import { ISystemRepository } from '../repositories/ISystemRepository';

export class AdminService {
  constructor(
    private courseRepo: IAdminCourseRepository,
    private userRepo: IAdminUserRepository,
    private systemRepo: ISystemRepository
  ) { }

  listCourses(): Promise<CourseRecord[]> {
    return this.courseRepo.listCourses();
  }

  async listCoursesFull(): Promise<Course[]> {
    const rawCourses = await this.courseRepo.listCoursesWithContent();
    return rawCourses.map(rc => {
      const modules = rc.modules.map((rm: any) => {
        const lessons = rm.lessons.map((rl: any) => {
          return new Lesson({
            id: rl.id,
            title: rl.title,
            videoUrl: rl.video_url || '',
            videoUrls: rl.video_urls || [],
            content: rl.content || '',
            audioUrl: rl.audio_url || '',
            imageUrl: rl.image_url || '',
            durationSeconds: rl.duration_seconds || 0,
            watchedSeconds: 0,
            isCompleted: false,
            position: rl.position || 0,
            contentBlocks: rl.content_blocks || []
          });
        });
        return new Module(rm.id, rm.title, lessons, rm.position || 0);
      });
      modules.sort((a, b) => a.position - b.position);
      return new Course(rc.id, rc.title, rc.description || '', rc.image_url || '', rc.color || null, rc.color_legend || null, modules, rc.instructor_id);
    });
  }

  async listCoursesOutline(): Promise<Course[]> {
    const rawCourses = await this.courseRepo.listCoursesOutline();
    return rawCourses.map(rc => {
      const modules = (rc.modules || []).map((rm: any) => {
        const lessons = (rm.lessons || []).map((rl: any) => {
          const lesson = new Lesson({
            id: rl.id,
            title: rl.title,
            videoUrl: '',
            videoUrls: [],
            content: '',
            audioUrl: '',
            imageUrl: '',
            durationSeconds: 0,
            watchedSeconds: 0,
            isCompleted: false,
            position: rl.position || 0,
            contentBlocks: []
          });

          // Mantém o estado real da aula para a tela administrativa.
          // Sem isso, ao recarregar o admin, toda aula volta visualmente como ativa.
          (lesson as any).module_id = rm.id;
          (lesson as any).is_active = rl.is_active ?? true;

          return lesson;
        });
        return new Module(rm.id, rm.title, lessons, rm.position || 0);
      });
      modules.sort((a, b) => a.position - b.position);
      return new Course(rc.id, rc.title, rc.description || '', rc.image_url || '', rc.color || null, rc.color_legend || null, modules, rc.instructor_id);
    });
  }

  createCourse(title: string, description?: string, imageUrl?: string, color?: string, colorLegend?: string): Promise<CourseRecord> {
    return this.courseRepo.createCourse(title, description, imageUrl, color, colorLegend);
  }

  updateCourse(id: string, patch: any): Promise<CourseRecord> {
    return this.courseRepo.updateCourse(id, patch);
  }

  deleteCourse(id: string): Promise<void> {
    return this.courseRepo.deleteCourse(id);
  }

  listModules(courseId: string): Promise<ModuleRecord[]> {
    return this.courseRepo.listModules(courseId);
  }

  createModule(courseId: string, title: string, position?: number): Promise<ModuleRecord> {
    return this.courseRepo.createModule(courseId, title, position);
  }

  updateModule(id: string, patch: any): Promise<ModuleRecord> {
    return this.courseRepo.updateModule(id, patch);
  }

  deleteModule(id: string): Promise<void> {
    return this.courseRepo.deleteModule(id);
  }

  listLessons(moduleId: string, options?: { summary?: boolean }): Promise<LessonRecord[]> {
    return this.courseRepo.listLessons(moduleId, options);
  }

  createLesson(moduleId: string, payload: any): Promise<LessonRecord> {
    return this.courseRepo.createLesson(moduleId, payload);
  }

  updateLesson(id: string, patch: any): Promise<LessonRecord> {
    return this.courseRepo.updateLesson(id, patch);
  }

  getLesson(id: string): Promise<LessonRecord> {
    return this.courseRepo.getLesson(id);
  }

  deleteLesson(id: string): Promise<void> {
    return this.courseRepo.deleteLesson(id);
  }

  moveLesson(lessonId: string, targetModuleId: string): Promise<LessonRecord> {
    return this.courseRepo.moveLesson(lessonId, targetModuleId);
  }

  listLessonResources(lessonId: string): Promise<LessonResourceRecord[]> {
    return this.courseRepo.listLessonResources(lessonId);
  }

  createLessonResource(lessonId: string, payload: any): Promise<LessonResourceRecord> {
    return this.courseRepo.createLessonResource(lessonId, payload);
  }

  updateLessonResource(id: string, patch: any): Promise<LessonResourceRecord> {
    return this.courseRepo.updateLessonResource(id, patch);
  }

  deleteLessonResource(id: string): Promise<void> {
    return this.courseRepo.deleteLessonResource(id);
  }

  listProfiles(): Promise<ProfileRecord[]> {
    return this.userRepo.listProfiles();
  }

  updateProfileRole(profileId: string, role: 'STUDENT' | 'INSTRUCTOR' | 'MASTER'): Promise<void> {
    return this.userRepo.updateProfileRole(profileId, role);
  }

  updateProfile(id: string, patch: any): Promise<void> {
    return this.userRepo.updateProfile(id, patch);
  }

  resetUserPassword(userId: string, newPassword: string): Promise<void> {
    return this.userRepo.resetUserPassword(userId, newPassword);
  }

  fetchPendingUsers(): Promise<ProfileRecord[]> {
    return this.userRepo.fetchPendingUsers();
  }

  fetchApprovedUsers(): Promise<ProfileRecord[]> {
    return this.userRepo.fetchApprovedUsers();
  }

  fetchRejectedUsers(): Promise<ProfileRecord[]> {
    return this.userRepo.fetchRejectedUsers();
  }

  approveUser(userId: string, adminId: string): Promise<void> {
    return this.userRepo.approveUser(userId, adminId);
  }

  rejectUser(userId: string, adminId: string, reason?: string): Promise<void> {
    return this.userRepo.rejectUser(userId, adminId, reason);
  }

  assignCoursesToUser(userId: string, courseIds: string[], adminId: string): Promise<void> {
    return this.userRepo.assignCoursesToUser(userId, courseIds, adminId);
  }

  getUserCourseAssignments(userId: string): Promise<string[]> {
    return this.userRepo.getUserCourseAssignments(userId);
  }

  removeUserCourseAssignment(userId: string, courseId: string): Promise<void> {
    return this.userRepo.removeUserCourseAssignment(userId, courseId);
  }

  deleteProfile(userId: string): Promise<void> {
    return this.userRepo.deleteProfile(userId);
  }

  getSystemStats(): Promise<any> {
    return this.systemRepo.getSystemStats();
  }

  getXpHistory(userId: string): Promise<any[]> {
    return this.userRepo.getXpHistory(userId);
  }

  logActivity(userId: string, actionType: string, description: string): Promise<void> {
    return this.userRepo.logActivity(userId, actionType, description);
  }

  getStudentQuizAttemptsForStaff(filters?: StudentActivityFilters): Promise<StaffQuizAttemptRecord[]> {
    return this.userRepo.getStudentQuizAttemptsForStaff(filters);
  }

  getStudentActivityLogsForStaff(filters?: StudentActivityFilters): Promise<StaffActivityLogRecord[]> {
    return this.userRepo.getStudentActivityLogsForStaff(filters);
  }

  getStudentActivitySummaryForStaff(filters?: StudentActivityFilters): Promise<StudentActivitySummary> {
    return this.userRepo.getStudentActivitySummaryForStaff(filters);
  }

  getSystemSettings(): Promise<any[]> {
    return this.systemRepo.getSystemSettings();
  }

  updateSystemSetting(key: string, value: string): Promise<void> {
    return this.systemRepo.updateSystemSetting(key, value);
  }

  getCourseUserAssignments(courseId: string): Promise<string[]> {
    return this.userRepo.getCourseUserAssignments(courseId);
  }

  assignUsersToCourse(courseId: string, userIds: string[], adminId: string): Promise<void> {
    return this.userRepo.assignUsersToCourse(courseId, userIds, adminId);
  }

  async getNetworkUsage(): Promise<any> {
    return this.systemRepo.getNetworkUsage();
  }

  sendNotification(userId: string, senderId: string, title: string, message: string, type: string = 'direct_message', link?: string): Promise<void> {
    return this.systemRepo.sendNotification(userId, senderId, title, message, type, link);
  }

  listEnrolledStudentsByInstructor(instructorId: string): Promise<ProfileRecord[]> {
    return this.userRepo.listEnrolledStudentsByInstructor(instructorId);
  }

  assignLessonsToInstructor(userId: string, lessonIds: string[]): Promise<void> {
    return this.courseRepo.assignLessonsToInstructor(userId, lessonIds);
  }

  listInstructorLessonAssignments(userId: string): Promise<string[]> {
    return this.courseRepo.listInstructorLessonAssignments(userId);
  }

  removeInstructorLessonAssignment(userId: string, lessonId: string): Promise<void> {
    return this.courseRepo.removeInstructorLessonAssignment(userId, lessonId);
  }

  listActiveCourseEnrollmentIds(userId: string): Promise<string[]> {
    return this.courseRepo.listActiveCourseEnrollmentIds(userId);
  }

  listUserCourseAssignmentIds(userId: string): Promise<string[]> {
    return this.courseRepo.listUserCourseAssignmentIds(userId);
  }

  async canEditLesson(lessonId: string): Promise<boolean> {
    const userId = await this.systemRepo.getCurrentUserId();
    if (!userId) return false;
    return this.courseRepo.canEditLesson(userId, lessonId);
  }
}
