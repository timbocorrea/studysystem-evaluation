export type CourseRecord = {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  instructor_id?: string | null;
  color?: string | null;
  color_legend?: string | null;
  created_at?: string;
};

export type CourseStructure = CourseRecord & {
  modules: (ModuleRecord & {
    lessons: LessonRecord[]
  })[]
};

export type LessonOutlineRecord = {
  id: string;
  module_id: string;
  title: string;
  position: number | null;
  is_active?: boolean | null;
};

export type ModuleOutlineRecord = {
  id: string;
  course_id: string;
  title: string;
  position: number | null;
  lessons: LessonOutlineRecord[];
};

export type CourseOutline = CourseRecord & {
  modules: ModuleOutlineRecord[];
};

export type ModuleRecord = {
  id: string;
  course_id: string;
  title: string;
  position: number | null;
  created_at?: string;
};

export type LessonRecord = {
  id: string;
  module_id: string;
  title: string;
  content: string | null;
  video_url: string | null;
  video_urls?: { url: string; title: string; image_url?: string; type?: 'video' | 'slides'; slides?: string[]; fileUrl?: string; fileType?: 'pdf' | 'pptx' }[] | null;
  audio_url: string | null;
  image_url: string | null;
  duration_seconds: number | null;
  position: number | null;
  is_active?: boolean | null;
  content_blocks?: any[] | null;
  created_at?: string;
};

export type LessonResourceStorageProvider = 'external_url' | 'supabase_storage' | 'google_drive' | 'dropbox' | 'unknown';

export type LessonResourceRecord = {
  id: string;
  lesson_id: string;
  title: string;
  resource_type: 'PDF' | 'AUDIO' | 'IMAGE' | 'LINK' | 'FILE';
  url: string;
  position: number | null;
  category?: string;
  storage_provider?: LessonResourceStorageProvider | null;
  storage_bucket?: string | null;
  storage_path?: string | null;
  mime_type?: string | null;
  file_size_bytes?: number | null;
  original_filename?: string | null;
  migrated_at?: string | null;
  created_at?: string;
};

export type ProfileRecord = {
  id: string;
  email: string;
  name: string | null;
  role: 'STUDENT' | 'INSTRUCTOR' | 'MASTER';
  xp_total: number | null;
  current_level: number | null;
  created_at?: string;
  updated_at?: string;
  is_temp_password?: boolean;
  is_minor?: boolean;
};

export type CourseEnrollmentRecord = {
  id: string;
  user_id: string;
  course_id: string;
  enrolled_at: string;
  is_active: boolean;
};

export type SystemStats = {
  db_size: string;
  user_count: number;
  course_count: number;
  module_count: number;
  lesson_count: number;
  file_count: number;
  storage_size_bytes: number;
};

export type XpLogRecord = {
  id: string;
  user_id: string;
  amount: number;
  action_type: string;
  description: string | null;
  created_at: string;
};

export type StudentActivityFilters = {
  studentId?: string | null;
  courseId?: string | null;
  quizId?: string | null;
  actionType?: string | null;
  from?: string | null;
  to?: string | null;
  attemptLimit?: number;
  logLimit?: number;
};

export type StaffQuizAttemptRecord = {
  id: string;
  student_id: string;
  student_name: string | null;
  student_email: string;
  quiz_id: string;
  quiz_title: string;
  lesson_id: string;
  lesson_title: string;
  module_id: string;
  module_title: string;
  course_id: string;
  course_title: string;
  score: number;
  passed: boolean;
  attempt_number: number;
  completed_at: string;
  created_at: string;
  answers_count: number;
  attempt_mode: 'legacy';
};

export type StaffActivityLogRecord = {
  id: string;
  student_id: string;
  student_name: string | null;
  student_email: string;
  amount: number;
  action_type: string;
  description: string | null;
  created_at: string;
};

export type StudentActivitySummary = {
  total_students: number;
  total_attempts: number;
  passed_attempts: number;
  failed_attempts: number;
  average_score: number | null;
  total_logs: number;
  active_students_7d: number;
  active_students_30d: number;
  last_activity_at: string | null;
};
