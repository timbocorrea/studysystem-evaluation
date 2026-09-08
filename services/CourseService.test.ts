import { describe, expect, it, vi } from 'vitest';
import { CourseService } from './CourseService';
import { Course, Lesson, Module, User } from '../domain/entities';
import { ICourseRepository } from '../repositories/ICourseRepository';
import { IUserProgressRepository } from '../repositories/IUserProgressRepository';
import { IGamificationRepository } from '../repositories/IGamificationRepository';
import { IQuizRepository } from '../repositories/IQuizRepository';
import { IUserProfileRepository } from '../repositories/IUserProfileRepository';

const createMocks = () => ({
  courseRepo: {
    getCourseById: vi.fn(),
    getCourseStructure: vi.fn(),
    getLessonById: vi.fn(),
    getCoursesSummary: vi.fn(),
    getEnrolledCourses: vi.fn(),
    enrollInCourse: vi.fn(),
    isEnrolled: vi.fn()
  } as unknown as ICourseRepository,
  progressRepo: {
    updateLessonProgress: vi.fn().mockResolvedValue(undefined),
    getCourseProgressSummary: vi.fn(),
    markTextBlockAsRead: vi.fn()
  } as unknown as IUserProgressRepository,
  gamificationRepo: {
    logXpChange: vi.fn().mockResolvedValue(undefined),
    addXp: vi.fn().mockResolvedValue({ success: true, xpGained: 0, newXp: 0, levelUp: false, newLevel: 1 }),
    saveAchievements: vi.fn().mockResolvedValue(undefined),
    getWeeklyXpHistory: vi.fn(),
    getDashboardStats: vi.fn()
  } as unknown as IGamificationRepository,
  quizRepo: {
    getQuizByLessonId: vi.fn().mockResolvedValue(null),
    getLatestQuizAttempt: vi.fn().mockResolvedValue(null)
  } as unknown as IQuizRepository,
  profileRepo: {
    getUserById: vi.fn(),
    updateProfileInfo: vi.fn(),
    uploadAvatar: vi.fn()
  } as unknown as IUserProfileRepository
});

describe('CourseService.enrollUserInCourse', () => {
  it('delegates enrollment using only the course id', async () => {
    const mocks = createMocks();
    const service = new CourseService(
      mocks.courseRepo,
      mocks.progressRepo,
      mocks.gamificationRepo,
      mocks.quizRepo,
      mocks.profileRepo
    );

    await service.enrollUserInCourse('course-1');

    expect(mocks.courseRepo.enrollInCourse).toHaveBeenCalledOnce();
    expect(mocks.courseRepo.enrollInCourse).toHaveBeenCalledWith('course-1');
  });
});

describe('CourseService.updateUserProgress', () => {
  it('only persists technical progress when not completed', async () => {
    const mocks = createMocks();
    const service = new CourseService(
      mocks.courseRepo,
      mocks.progressRepo,
      mocks.gamificationRepo,
      mocks.quizRepo,
      mocks.profileRepo
    );

    const user = new User('u1', 'User', 'user@example.com', 'STUDENT', 0, []);
    const lesson = new Lesson({
      id: 'l1',
      title: 'Aula 1',
      videoUrl: 'https://example.com/video.mp4',
      durationSeconds: 100,
      watchedSeconds: 10,
      isCompleted: false,
      position: 0
    });
    const course = new Course('c1', 'Curso', 'Desc', null, null, null, [new Module('m1', 'Módulo', [lesson])]);

    const result = await service.updateUserProgress(user, lesson, course, false);

    expect(result).toEqual({
      unlockedAchievements: [],
      levelUp: false,
      newLevel: user.level,
      xpGained: 0
    });
    expect(mocks.progressRepo.updateLessonProgress).toHaveBeenCalledWith('u1', 'l1', 10, false, undefined, 100);
    expect(mocks.gamificationRepo.saveAchievements).not.toHaveBeenCalled();
  });

  it('requests server-authoritative completion claims and persists gamification on completion', async () => {
    const mocks = createMocks();
    vi.mocked(mocks.gamificationRepo.addXp)
      .mockResolvedValueOnce({ success: true, xpGained: 17, newXp: 17, levelUp: false, newLevel: 1 })
      .mockResolvedValueOnce({ success: true, xpGained: 29, newXp: 46, levelUp: false, newLevel: 1 });
    const service = new CourseService(
      mocks.courseRepo,
      mocks.progressRepo,
      mocks.gamificationRepo,
      mocks.quizRepo,
      mocks.profileRepo
    );

    const user = new User('u1', 'User', 'user@example.com', 'STUDENT', 0, []);
    const lesson = new Lesson({
      id: 'l1',
      title: 'Aula 1',
      videoUrl: 'https://example.com/video.mp4',
      durationSeconds: 100,
      watchedSeconds: 0,
      isCompleted: false,
      position: 0
    });
    const module = new Module('m1', 'Módulo', [lesson]);
    const course = new Course('c1', 'Curso', 'Desc', null, null, null, [module]);

    const becameCompleted = lesson.updateProgress(90);
    expect(becameCompleted).toBe(true);

    const result = await service.updateUserProgress(user, lesson, course, becameCompleted);

    expect(mocks.progressRepo.updateLessonProgress).toHaveBeenCalledWith('u1', 'l1', 90, true, undefined, 100);
    expect(mocks.gamificationRepo.addXp).toHaveBeenNthCalledWith(1, 'u1', 'LESSON_COMPLETE', 'l1');
    expect(mocks.gamificationRepo.addXp).toHaveBeenNthCalledWith(2, 'u1', 'MODULE_COMPLETE', 'm1');
    expect(mocks.gamificationRepo.saveAchievements).toHaveBeenCalledWith('u1', user.achievements);

    expect(user.xp).toBe(46);
    expect(result).toMatchObject({ xpGained: 46, levelUp: false, newLevel: 1 });
    expect(result.unlockedAchievements.map(a => a.id)).toEqual(['first-lesson', 'module-master', 'course-complete']);
  });
});
