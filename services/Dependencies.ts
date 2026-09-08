import { createSupabaseClient } from './supabaseClient';
import { SupabaseCourseRepository } from '../repositories/SupabaseCourseRepository';
import { SupabaseUserProgressRepository } from '../repositories/SupabaseUserProgressRepository';
import { SupabaseGamificationRepository } from '../repositories/SupabaseGamificationRepository';
import { SupabaseQuizRepository } from '../repositories/SupabaseQuizRepository';
import { SupabaseUserProfileRepository } from '../repositories/SupabaseUserProfileRepository';

import { SupabaseAdminCourseRepository } from '../repositories/SupabaseAdminCourseRepository';
import { SupabaseAdminUserRepository } from '../repositories/SupabaseAdminUserRepository';
import { SupabaseSystemRepository } from '../repositories/SupabaseSystemRepository';

import { CourseService } from './CourseService';
import { AdminService } from './AdminService';
import { AIService } from './AIService';

import { SupabaseQuestionBankRepository } from '../repositories/SupabaseQuestionBankRepository';
import { NotificationRepository } from '../repositories/NotificationRepository';
import { LessonForumRepository } from '../repositories/LessonForumRepository';

const supabaseClient = createSupabaseClient();

// Course Domain Repositories
export const courseRepository = new SupabaseCourseRepository(supabaseClient);
export const userProgressRepository = new SupabaseUserProgressRepository(supabaseClient);
export const gamificationRepository = new SupabaseGamificationRepository(supabaseClient);
export const quizRepository = new SupabaseQuizRepository(supabaseClient);
export const userProfileRepository = new SupabaseUserProfileRepository(supabaseClient);

// Admin Domain Repositories
export const adminCourseRepository = new SupabaseAdminCourseRepository(supabaseClient);
export const adminUserRepository = new SupabaseAdminUserRepository(supabaseClient);
export const systemRepository = new SupabaseSystemRepository(supabaseClient);

// Services
export const courseService = new CourseService(
  courseRepository,
  userProgressRepository,
  gamificationRepository,
  quizRepository,
  userProfileRepository
);

export const adminService = new AdminService(
  adminCourseRepository,
  adminUserRepository,
  systemRepository
);

export const aiService = new AIService(
  supabaseClient
);

// Other Repositories
export const questionBankRepository = new SupabaseQuestionBankRepository(supabaseClient);
export const notificationRepository = new NotificationRepository();
export const lessonForumRepository = new LessonForumRepository();

export { supabaseClient };
