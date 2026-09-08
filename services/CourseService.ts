import { ICourseRepository } from '../repositories/ICourseRepository';
import { IUserProgressRepository } from '../repositories/IUserProgressRepository';
import { IGamificationRepository } from '../repositories/IGamificationRepository';
import { IQuizRepository } from '../repositories/IQuizRepository';
import { IUserProfileRepository } from '../repositories/IUserProfileRepository';
import { Achievement, Course, Lesson, User } from '../domain/entities';

export interface GamificationResult {
  unlockedAchievements: Achievement[];
  levelUp: boolean;
  newLevel: number;
  xpGained: number;
}

export class CourseService {
  constructor(
    private courseRepository: ICourseRepository,
    private userProgressRepository: IUserProgressRepository,
    private gamificationRepository: IGamificationRepository,
    private quizRepository: IQuizRepository,
    private userProfileRepository: IUserProfileRepository
  ) { }

  public async loadCourseDetails(id: string, userId?: string): Promise<Course> {
    return this.courseRepository.getCourseById(id, userId);
  }

  public async loadCourseStructure(id: string, userId?: string): Promise<Course> {
    return this.courseRepository.getCourseStructure(id, userId);
  }

  public async loadLessonContent(lessonId: string, userId?: string): Promise<Lesson | null> {
    return this.courseRepository.getLessonById(lessonId, userId);
  }

  public async updateUserProgress(
    user: User,
    lesson: Lesson,
    course: Course,
    becameCompleted: boolean,
    lastBlockId?: string
  ): Promise<GamificationResult> {
    if (user.role !== 'STUDENT') return { unlockedAchievements: [], levelUp: false, newLevel: user.level, xpGained: 0 };

    await this.userProgressRepository.updateLessonProgress(
      user.id,
      lesson.id,
      lesson.watchedSeconds,
      lesson.isCompleted,
      lastBlockId,
      lesson.durationSeconds
    );

    if (!becameCompleted) return { unlockedAchievements: [], levelUp: false, newLevel: user.level, xpGained: 0 };

    const canAward = await this.shouldAwardGamification(user, lesson);
    if (!canAward) return { unlockedAchievements: [], levelUp: false, newLevel: user.level, xpGained: 0 };

    return this.processGamificationRewards(user, lesson, course);
  }

  private async shouldAwardGamification(user: User, lesson: Lesson): Promise<boolean> {
    const quiz = await this.quizRepository.getQuizByLessonId(lesson.id);
    if (quiz) {
      const latestAttempt = await this.quizRepository.getLatestQuizAttempt(user.id, quiz.id);
      if (!latestAttempt || !latestAttempt.passed) {
        return false;
      }
      lesson.setQuizPassed(true);
    }
    return true;
  }

  private async processGamificationRewards(user: User, lesson: Lesson, course: Course): Promise<GamificationResult> {
    const unlocked: Achievement[] = [];
    let totalXpGained = 0;
    let finalLevelUp = false;
    let finalLevel = user.level;

    // O servidor decide a recompensa a partir do tipo e da referência da aula.
    const lessonResult = await this.gamificationRepository.addXp(user.id, 'LESSON_COMPLETE', lesson.id);
    if (lessonResult.success) {
      const lessonXpGained = lessonResult.xpGained ?? Math.max(0, lessonResult.newXp - user.xp);
      totalXpGained += lessonXpGained;
      if (lessonResult.levelUp) finalLevelUp = true;
      finalLevel = lessonResult.newLevel;
      if (lessonXpGained > 0) user.addXp(lessonXpGained);
    }

    const lessonAch = user.checkAndAddAchievements('LESSON');
    if (lessonAch) unlocked.push(lessonAch);

    const parentModule = course.modules.find(m => m.lessons.some(l => l.id === lesson.id));
    if (parentModule && parentModule.isFullyCompleted()) {
      const moduleResult = await this.gamificationRepository.addXp(user.id, 'MODULE_COMPLETE', parentModule.id);
      if (moduleResult.success) {
        const moduleXpGained = moduleResult.xpGained ?? Math.max(0, moduleResult.newXp - user.xp);
        totalXpGained += moduleXpGained;
        if (moduleResult.levelUp) finalLevelUp = true;
        finalLevel = moduleResult.newLevel;
        if (moduleXpGained > 0) user.addXp(moduleXpGained);
      }

      const moduleAch = user.checkAndAddAchievements('MODULE');
      if (moduleAch) unlocked.push(moduleAch);
    }

    // 3. Conquistas de Curso
    if (course.isFullyCompleted()) {
      const courseAch = user.checkAndAddAchievements('COURSE');
      if (courseAch) unlocked.push(courseAch);
    }

    // 4. Milestones de XP e Nível
    const xpAch = this.checkXpMilestones(user);
    if (xpAch.length) unlocked.push(...xpAch);

    const levelAch = user.checkAndAddAchievements('LEVEL');
    if (levelAch) unlocked.push(levelAch);

    if (unlocked.length > 0) {
      await this.gamificationRepository.saveAchievements(user.id, user.achievements);
    }

    return {
      unlockedAchievements: unlocked,
      levelUp: finalLevelUp,
      newLevel: finalLevel,
      xpGained: totalXpGained
    };
  }

  private checkXpMilestones(user: User): Achievement[] {
    const unlocked: Achievement[] = [];
    let ach: Achievement | null;
    do {
      ach = user.checkAndAddAchievements('XP');
      if (ach) unlocked.push(ach);
    } while (ach);
    return unlocked;
  }

  async getCoursesSummary(userId: string): Promise<any[]> {
    return this.courseRepository.getCoursesSummary(userId);
  }

  async getCourseProgressSummary(userId: string) {
    return this.userProgressRepository.getCourseProgressSummary(userId);
  }

  async getCourseById(courseId: string, userId?: string): Promise<Course> {
    return this.courseRepository.getCourseById(courseId, userId);
  }

  public async fetchUserProfile(userId: string): Promise<User> {
    return this.userProfileRepository.getUserById(userId);
  }

  public async fetchEnrolledCourses(userId: string): Promise<Course[]> {
    return this.courseRepository.getEnrolledCourses(userId);
  }

  public async enrollUserInCourse(courseId: string): Promise<void> {
    await this.courseRepository.enrollInCourse(courseId);
  }

  public async checkEnrollment(userId: string, courseId: string): Promise<boolean> {
    return this.courseRepository.isEnrolled(userId, courseId);
  }

  public async markTextBlockAsRead(userId: string, lessonId: string, blockId: string): Promise<void> {
    return this.userProgressRepository.markTextBlockAsRead(userId, lessonId, blockId);
  }

  public async getWeeklyXpHistory(userId: string): Promise<{ date: string; xp: number }[]> {
    return this.gamificationRepository.getWeeklyXpHistory(userId);
  }

  public async getDashboardStats(userId: string) {
    return this.gamificationRepository.getDashboardStats(userId);
  }

  public async updateProfileInfo(userId: string, name: string): Promise<void> {
    return this.userProfileRepository.updateProfileInfo(userId, name);
  }

  public async uploadAvatar(userId: string, file: File): Promise<string> {
    return this.userProfileRepository.uploadAvatar(userId, file);
  }
}
