import { describe, expect, it } from 'vitest';
import {
  InstructorAdminCourse,
  scopeInstructorCourseContent,
  selectInstructorAdminCourses,
} from '../utils/instructorAdminCourses';

const course = (
  id: string,
  instructorId: string | null,
  lessonIds: string[]
): InstructorAdminCourse => ({
  id,
  instructorId,
  modules: [{ id: `${id}-module`, lessons: lessonIds.map(lessonId => ({ id: lessonId })) }],
});

describe('selectInstructorAdminCourses', () => {
  const noAssignments = {
    assignedLessonIds: [],
    activeEnrollmentCourseIds: [],
    userCourseAssignmentIds: [],
  };

  it('includes a course owned through instructor_id', () => {
    const result = selectInstructorAdminCourses(
      [course('owned', 'instructor-1', ['owned-lesson'])],
      [],
      'instructor-1',
      noAssignments
    );

    expect(result.map(item => item.id)).toEqual(['owned']);
  });

  it('includes a course derived from instructor_lesson_assignments', () => {
    const result = selectInstructorAdminCourses(
      [],
      [course('lesson-assigned', null, ['assigned-lesson'])],
      'instructor-1',
      { ...noAssignments, assignedLessonIds: ['assigned-lesson'] }
    );

    expect(result.map(item => item.id)).toEqual(['lesson-assigned']);
  });

  it('includes a course from an active course_enrollment', () => {
    const result = selectInstructorAdminCourses(
      [],
      [course('enrolled', null, ['lesson'])],
      'instructor-1',
      { ...noAssignments, activeEnrollmentCourseIds: ['enrolled'] }
    );

    expect(result.map(item => item.id)).toEqual(['enrolled']);
  });

  it('includes a course from user_course_assignments', () => {
    const result = selectInstructorAdminCourses(
      [],
      [course('course-assigned', null, ['lesson'])],
      'instructor-1',
      { ...noAssignments, userCourseAssignmentIds: ['course-assigned'] }
    );

    expect(result.map(item => item.id)).toEqual(['course-assigned']);
  });

  it('excludes a course without edit permission', () => {
    const result = selectInstructorAdminCourses(
      [course('public-view-only', 'instructor-2', ['public-lesson'])],
      [course('visible-view-only', null, ['visible-lesson'])],
      'instructor-1',
      noAssignments
    );

    expect(result).toEqual([]);
  });

  it('deduplicates courses and keeps the outline with more visible lessons', () => {
    const result = selectInstructorAdminCourses(
      [course('assigned', null, ['assigned-lesson', 'second-lesson'])],
      [course('assigned', null, ['assigned-lesson'])],
      'instructor-1',
      { ...noAssignments, assignedLessonIds: ['assigned-lesson'] }
    );

    expect(result).toHaveLength(1);
    expect(result[0].modules?.[0].lessons).toHaveLength(2);
  });
});

describe('scopeInstructorCourseContent', () => {
  const noAssignments = {
    assignedLessonIds: [],
    activeEnrollmentCourseIds: [],
    userCourseAssignmentIds: [],
  };

  it('shows every module and lesson for the course owner', () => {
    const input = [course('owned', 'instructor-1', ['lesson-1', 'lesson-2'])];
    const result = scopeInstructorCourseContent(input, 'instructor-1', noAssignments, false);

    expect(result.courses[0].modules?.[0].lessons).toHaveLength(2);
    expect(result.allowedCourseIds).toEqual(['owned']);
  });

  it('shows every module and lesson for an active course enrollment', () => {
    const input = [course('enrolled', null, ['lesson-1', 'lesson-2'])];
    const result = scopeInstructorCourseContent(
      input,
      'instructor-1',
      { ...noAssignments, activeEnrollmentCourseIds: ['enrolled'] },
      false
    );

    expect(result.courses[0].modules?.[0].lessons).toHaveLength(2);
    expect(result.allowedCourseIds).toEqual(['enrolled']);
  });

  it('shows every module and lesson for user_course_assignments', () => {
    const input = [course('assigned-course', null, ['lesson-1', 'lesson-2'])];
    const result = scopeInstructorCourseContent(
      input,
      'instructor-1',
      { ...noAssignments, userCourseAssignmentIds: ['assigned-course'] },
      false
    );

    expect(result.courses[0].modules?.[0].lessons).toHaveLength(2);
    expect(result.allowedCourseIds).toEqual(['assigned-course']);
  });

  it('keeps only granularly assigned lessons and their modules', () => {
    const input: InstructorAdminCourse[] = [{
      id: 'granular',
      instructorId: null,
      modules: [
        { id: 'module-1', lessons: [{ id: 'allowed-lesson' }, { id: 'hidden-lesson' }] },
        { id: 'module-2', lessons: [{ id: 'other-hidden-lesson' }] },
      ],
    }];
    const result = scopeInstructorCourseContent(
      input,
      'instructor-1',
      { ...noAssignments, assignedLessonIds: ['allowed-lesson'] },
      false
    );

    expect(result.courses[0].modules).toHaveLength(1);
    expect(result.courses[0].modules?.[0].lessons?.map(lesson => lesson.id)).toEqual(['allowed-lesson']);
    expect(result.allowedModuleIds).toEqual(['module-1']);
    expect(result.allowedLessonIds).toEqual(['allowed-lesson']);
  });

  it('hides modules and lessons from courses without permission', () => {
    const result = scopeInstructorCourseContent(
      [course('forbidden', 'other-instructor', ['hidden-lesson'])],
      'instructor-1',
      noAssignments,
      false
    );

    expect(result.courses).toEqual([]);
    expect(result.allowedModuleIds).toEqual([]);
    expect(result.allowedLessonIds).toEqual([]);
  });

  it('lets master see all course content', () => {
    const input = [course('master-course', 'other-instructor', ['lesson-1', 'lesson-2'])];
    const result = scopeInstructorCourseContent(input, 'master-1', noAssignments, true);

    expect(result.courses[0].modules?.[0].lessons).toHaveLength(2);
    expect(result.allowedCourseIds).toEqual(['master-course']);
  });
});
