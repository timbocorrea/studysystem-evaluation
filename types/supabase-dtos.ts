/**
 * Data Transfer Objects (DTOs) for Supabase Database Responses
 * These interfaces define the exact structure of data returned from the database,
 * providing type safety and catching schema changes at compile time.
 */

// ===== Quiz DTOs =====

export interface DatabaseQuizResponse {
    id: string;
    lesson_id: string;
    title: string;
    description: string;
    passing_score: number;
    is_manually_released: boolean;
    questions_count: number | null;
    pool_difficulty: 'easy' | 'medium' | 'hard' | null;
    created_at: string;
    updated_at: string;
}

export interface DatabaseQuizQuestionResponse {
    id: string;
    quiz_id: string;
    question_text: string;
    question_type: 'multiple_choice' | 'true_false' | 'short_answer';
    position: number;
    points: number;
    difficulty: 'easy' | 'medium' | 'hard' | null;
    image_url: string | null;
    created_at: string;
}

export interface DatabaseQuizOptionResponse {
    id: string;
    question_id: string;
    option_text: string;
    is_correct: boolean;
    position: number;
}

// ===== Question Bank DTOs =====

export interface DatabaseBankQuestionResponse {
    id: string;
    lesson_id: string | null;
    module_id: string | null;
    course_id: string | null;
    question_text: string;
    difficulty: 'easy' | 'medium' | 'hard';
    points: number;
    image_url: string | null;
    created_at: string;
    updated_at: string;
}

export interface DatabaseBankOptionResponse {
    id: string;
    question_id: string;
    option_text: string;
    is_correct: boolean;
    position: number;
}

// ===== Quiz Attempt DTOs =====

export interface DatabaseQuizAttemptResponse {
    id: string;
    user_id: string;
    quiz_id: string;
    score: number;
    passed: boolean;
    answers: Record<string, string>;
    created_at: string;
}

// ===== Lesson DTOs =====

export interface DatabaseLessonResponse {
    id: string;
    module_id: string;
    title: string;
    video_url: string | null;
    video_urls: Array<{ url: string; title: string; imageUrl?: string }> | null;
    content: string | null;
    audio_url: string | null;
    image_url: string | null;
    duration_seconds: number;
    position: number;
    created_at: string;
    updated_at: string;
}

// ===== User Progress DTOs =====

export interface DatabaseUserProgressResponse {
    id: string;
    user_id: string;
    lesson_id: string;
    watched_seconds: number;
    is_completed: boolean;
    last_accessed_block_id: string | null;
    quiz_passed: boolean;
    created_at: string;
    updated_at: string;
}

// ===== Lesson Requirements DTOs =====

export interface DatabaseLessonRequirementsResponse {
    lesson_id: string;
    video_required_percent: number;
    text_blocks_required_percent: number;
    required_pdfs: string[];
    required_audios: string[];
    required_materials: string[];
    min_evaluation_questions: number;
    evaluation_passing_score: number;
    created_at: string;
    updated_at: string;
}

// ===== Course DTOs =====

export interface DatabaseCourseResponse {
    id: string;
    title: string;
    description: string;
    image_url: string | null;
    instructor_id: string;
    instructor?: { name: string | null };
    created_at: string;
    updated_at: string;
}

export interface DatabaseModuleResponse {
    id: string;
    course_id: string;
    title: string;
    description: string;
    position: number;
    created_at: string;
    updated_at: string;
    lessons?: DatabaseLessonResponse[];
}

export type DatabaseLessonResourceStorageProvider = 'external_url' | 'supabase_storage' | 'google_drive' | 'dropbox' | 'unknown';

export interface DatabaseResourceResponse {
    id: string;
    lesson_id: string;
    title: string;
    type: 'PDF' | 'FILE' | 'LINK' | 'VIDEO' | 'AUDIO' | 'IMAGE';
    url: string;
    position: number;
    storage_provider?: DatabaseLessonResourceStorageProvider | null;
    storage_bucket?: string | null;
    storage_path?: string | null;
    mime_type?: string | null;
    file_size_bytes?: number | null;
    original_filename?: string | null;
    migrated_at?: string | null;
    created_at: string;
}

export interface DatabaseAchievementResponse {
    id: string;
    user_id: string;
    title: string;
    description: string;
    icon: string;
    earned_at: string;
}

// ===== Content Block DTOs =====

export interface DatabaseContentBlockResponse {
    id: string;
    lesson_id: string;
    type: 'text' | 'video' | 'image' | 'audio' | 'quiz';
    content: string | null;
    position: number;
    created_at: string;
}