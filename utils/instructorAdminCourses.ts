export interface InstructorAdminCourse {
  id: string;
  instructorId?: string | null;
  modules?: Array<{
    id: string;
    lessons?: Array<{ id: string }>;
  }>;
}

export interface InstructorAdminCourseAccess {
  assignedLessonIds: string[];
  activeEnrollmentCourseIds: string[];
  userCourseAssignmentIds: string[];
}

export interface InstructorCourseContentScope<T extends InstructorAdminCourse> {
  courses: T[];
  allowedCourseIds: string[];
  allowedModuleIds: string[];
  allowedLessonIds: string[];
}

const lessonCount = (course: InstructorAdminCourse): number =>
  (course.modules || []).reduce((total, module) => total + (module.lessons?.length || 0), 0);

const hasAssignedLesson = (
  course: InstructorAdminCourse,
  assignedLessonIds: Set<string>
): boolean =>
  (course.modules || []).some(module =>
    (module.lessons || []).some(lesson => assignedLessonIds.has(lesson.id))
  );

export function selectInstructorAdminCourses<T extends InstructorAdminCourse>(
  outlineCourses: T[],
  visibleCourses: T[],
  instructorId: string,
  access: InstructorAdminCourseAccess
): T[] {
  const assignedLessonIds = new Set(access.assignedLessonIds);
  const activeEnrollmentCourseIds = new Set(access.activeEnrollmentCourseIds);
  const userCourseAssignmentIds = new Set(access.userCourseAssignmentIds);
  const selected = new Map<string, T>();

  for (const course of [...outlineCourses, ...visibleCourses]) {
    const canEdit =
      course.instructorId === instructorId ||
      activeEnrollmentCourseIds.has(course.id) ||
      userCourseAssignmentIds.has(course.id) ||
      hasAssignedLesson(course, assignedLessonIds);
    if (!canEdit) continue;

    const current = selected.get(course.id);
    if (!current || lessonCount(course) > lessonCount(current)) {
      selected.set(course.id, course);
    }
  }

  return Array.from(selected.values());
}

export function scopeInstructorCourseContent<T extends InstructorAdminCourse>(
  courses: T[],
  instructorId: string,
  access: InstructorAdminCourseAccess,
  isMaster: boolean
): InstructorCourseContentScope<T> {
  const assignedLessonIds = new Set(access.assignedLessonIds);
  const activeEnrollmentCourseIds = new Set(access.activeEnrollmentCourseIds);
  const userCourseAssignmentIds = new Set(access.userCourseAssignmentIds);
  const allowedCourseIds = new Set<string>();
  const allowedModuleIds = new Set<string>();
  const allowedLessonIds = new Set<string>();
  const scopedCourses: T[] = [];

  for (const course of courses) {
    const hasFullCourseAccess =
      isMaster ||
      course.instructorId === instructorId ||
      activeEnrollmentCourseIds.has(course.id) ||
      userCourseAssignmentIds.has(course.id);

    if (hasFullCourseAccess) {
      allowedCourseIds.add(course.id);
    }

    const modules = (course.modules || [])
      .map(module => {
        const lessons = hasFullCourseAccess
          ? (module.lessons || [])
          : (module.lessons || []).filter(lesson => assignedLessonIds.has(lesson.id));

        if (lessons.length === 0 && !hasFullCourseAccess) return null;

        allowedModuleIds.add(module.id);
        lessons.forEach(lesson => allowedLessonIds.add(lesson.id));
        return { ...module, lessons };
      })
      .filter((module): module is NonNullable<typeof module> => module !== null);

    if (hasFullCourseAccess || modules.length > 0) {
      scopedCourses.push({ ...course, modules } as T);
    }
  }

  return {
    courses: scopedCourses,
    allowedCourseIds: Array.from(allowedCourseIds),
    allowedModuleIds: Array.from(allowedModuleIds),
    allowedLessonIds: Array.from(allowedLessonIds),
  };
}
