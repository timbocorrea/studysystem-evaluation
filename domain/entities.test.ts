import { describe, expect, it } from 'vitest';
import { Lesson, User } from './entities';

describe('Lesson.updateProgress', () => {
  it('marks as completed at >= 90% and returns true once', () => {
    const lesson = new Lesson({
      id: 'l1',
      title: 'Aula 1',
      videoUrl: 'https://example.com/video.mp4',
      durationSeconds: 100,
      watchedSeconds: 0,
      isCompleted: false,
      position: 0
    });

    expect(lesson.isCompleted).toBe(false);
    expect(lesson.updateProgress(89)).toBe(false);
    expect(lesson.isCompleted).toBe(false);

    expect(lesson.updateProgress(90)).toBe(true);
    expect(lesson.isCompleted).toBe(true);

    expect(lesson.updateProgress(95)).toBe(false);
    expect(lesson.isCompleted).toBe(true);
  });

  it('handles durationSeconds = 0 as demo content', () => {
    const lesson = new Lesson({
      id: 'l2',
      title: 'Aula Demo',
      videoUrl: 'https://example.com/video.mp4',
      durationSeconds: 0,
      watchedSeconds: 0,
      isCompleted: false,
      position: 0
    });

    expect(lesson.updateProgress(0)).toBe(false);
    expect(lesson.isCompleted).toBe(false);

    expect(lesson.updateProgress(1)).toBe(true);
    expect(lesson.isCompleted).toBe(true);
  });
});

describe('User', () => {
  it('keeps the persisted role authoritative regardless of email', () => {
    const student = new User('u1', 'User', 'user@example.test', 'STUDENT', 0, []);
    const instructor = new User('u2', 'Instructor', 'user@example.test', 'INSTRUCTOR', 0, []);
    const master = new User('u3', 'Master', 'user@example.test', 'MASTER', 0, []);

    expect(student.role).toBe('STUDENT');
    expect(student.isMaster).toBe(false);
    expect(student.hasAdminPanelAccess).toBe(false);

    expect(instructor.role).toBe('INSTRUCTOR');
    expect(instructor.isMaster).toBe(false);
    expect(instructor.hasAdminPanelAccess).toBe(true);

    expect(master.role).toBe('MASTER');
    expect(master.isMaster).toBe(true);
    expect(master.hasAdminPanelAccess).toBe(true);
  });

  it('calculates level based on xp', () => {
    const user = new User('u1', 'User', 'user@example.com', 'STUDENT', 0, []);
    expect(user.level).toBe(1);

    user.addXp(999);
    expect(user.level).toBe(1);

    user.addXp(1);
    expect(user.level).toBe(2);
  });

  it('unlocks lesson achievement once', () => {
    const user = new User('u1', 'User', 'user@example.com', 'STUDENT', 0, []);
    const first = user.checkAndAddAchievements('LESSON');
    expect(first?.id).toBe('first-lesson');
    expect(user.checkAndAddAchievements('LESSON')).toBeNull();
  });

  it('unlocks xp achievements at thresholds', () => {
    const user = new User('u1', 'User', 'user@example.com', 'STUDENT', 0, []);
    user.addXp(5000);

    const xp5000 = user.checkAndAddAchievements('XP');
    expect(xp5000?.id).toBe('xp-5000');

    const xp1000 = user.checkAndAddAchievements('XP');
    expect(xp1000?.id).toBe('xp-1000');

    expect(user.checkAndAddAchievements('XP')).toBeNull();
  });
});
