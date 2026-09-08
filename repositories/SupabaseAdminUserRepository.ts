import { SupabaseClient } from '@supabase/supabase-js';
import { IAdminUserRepository } from './IAdminUserRepository';
import {
  ProfileRecord,
  StaffActivityLogRecord,
  StaffQuizAttemptRecord,
  StudentActivityFilters,
  StudentActivitySummary,
  XpLogRecord,
} from '../domain/admin';
import { DomainError } from '../domain/errors';
import { normalizeStudentActivityFilters } from '../utils/studentActivityFilters';

export class SupabaseAdminUserRepository implements IAdminUserRepository {
  private client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  async listProfiles(): Promise<ProfileRecord[]> {
    const { data, error } = await this.client.from('profiles').select('*').order('updated_at', { ascending: false });
    if (error) throw new DomainError(`Falha ao listar usuários: ${error.message}`);
    return (data || []) as ProfileRecord[];
  }

  async updateProfileRole(profileId: string, role: 'STUDENT' | 'INSTRUCTOR' | 'MASTER'): Promise<void> {
    await this.updateProfile(profileId, { role });
  }

  async updateProfile(id: string, patch: { role?: 'STUDENT' | 'INSTRUCTOR' | 'MASTER'; isMinor?: boolean }): Promise<void> {
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (patch.role !== undefined) updates.role = patch.role;
    if (patch.isMinor !== undefined) updates.is_minor = patch.isMinor;
    const { error } = await this.client.from('profiles').update(updates).eq('id', id);
    if (error) throw new DomainError(`Falha ao atualizar perfil: ${error.message}`);
  }

  async deleteProfile(userId: string): Promise<void> {
    await this.removeAllUserCourseAssignments(userId);
    const { error } = await this.client.from('profiles').delete().eq('id', userId);
    if (error) throw new DomainError(`Falha ao excluir perfil: ${error.message}`);
  }

  async fetchPendingUsers(): Promise<ProfileRecord[]> {
    const { data, error } = await this.client.from('profiles').select('*').eq('approval_status', 'pending');
    if (error) throw new DomainError(`Falha ao buscar usuários pendentes: ${error.message}`);
    return (data || []) as ProfileRecord[];
  }

  async fetchApprovedUsers(): Promise<ProfileRecord[]> {
    const { data, error } = await this.client.from('profiles').select('*').eq('approval_status', 'approved');
    if (error) throw new DomainError(`Falha ao buscar usuários aprovados: ${error.message}`);
    return (data || []) as ProfileRecord[];
  }

  async fetchRejectedUsers(): Promise<ProfileRecord[]> {
    const { data, error } = await this.client.from('profiles').select('*').eq('approval_status', 'rejected');
    if (error) throw new DomainError(`Falha ao buscar usuários rejeitados: ${error.message}`);
    return (data || []) as ProfileRecord[];
  }

  async approveUser(userId: string, adminId: string): Promise<void> {
    const { error } = await this.client.from('profiles').update({ approval_status: 'approved', approved_at: new Date().toISOString(), approved_by: adminId, rejection_reason: null }).eq('id', userId);
    if (error) throw new DomainError(`Falha ao aprovar usuário: ${error.message}`);
  }

  async rejectUser(userId: string, adminId: string, reason?: string): Promise<void> {
    const { error } = await this.client.from('profiles').update({ approval_status: 'rejected', approved_at: null, approved_by: adminId, rejection_reason: reason || 'Bloqueado pelo administrador' }).eq('id', userId);
    if (error) throw new DomainError(`Falha ao bloquear usuário: ${error.message}`);
  }

  async assignCoursesToUser(userId: string, courseIds: string[], adminId: string): Promise<void> {
    if (courseIds.length === 0) return;
    const records = courseIds.map(cid => ({ user_id: userId, course_id: cid, enrolled_at: new Date().toISOString(), is_active: true }));
    const { error } = await this.client.from('course_enrollments').upsert(records, { onConflict: 'user_id,course_id' });
    if (error) throw new DomainError(`Falha ao atribuir cursos: ${error.message}`);
  }

  async getUserCourseAssignments(userId: string): Promise<string[]> {
    const { data, error } = await this.client.from('course_enrollments').select('course_id').eq('user_id', userId);
    if (error) throw new DomainError(`Falha ao buscar cursos do usuário: ${error.message}`);
    return (data || []).map(d => d.course_id);
  }

  async removeUserCourseAssignment(userId: string, courseId: string): Promise<void> {
    const { error } = await this.client.from('course_enrollments').delete().eq('user_id', userId).eq('course_id', courseId);
    if (error) throw new DomainError(`Falha ao remover atribuição de curso: ${error.message}`);
  }

  async removeAllUserCourseAssignments(userId: string): Promise<void> {
    await this.client.from('course_enrollments').delete().eq('user_id', userId);
  }

  async getCourseUserAssignments(courseId: string): Promise<string[]> {
    const { data, error } = await this.client.from('user_course_assignments').select('user_id').eq('course_id', courseId);
    if (error) throw new DomainError(`Falha ao buscar usuários do curso: ${error.message}`);
    return (data || []).map(d => d.user_id);
  }

  async assignUsersToCourse(courseId: string, userIds: string[], adminId: string): Promise<void> {
    await this.client.from('user_course_assignments').delete().eq('course_id', courseId);
    if (userIds.length > 0) {
      const rows = userIds.map(userId => ({ user_id: userId, course_id: courseId, assigned_at: new Date().toISOString(), assigned_by: adminId }));
      const { error } = await this.client.from('user_course_assignments').insert(rows);
      if (error) throw new DomainError(`Erro ao atribuir usuários ao curso: ${error.message}`);
    }
  }

  async resetUserPassword(userId: string, newPassword: string): Promise<void> {
    const { error } = await this.client.rpc('admin_reset_password', { target_user_id: userId, new_password: newPassword });
    if (error) throw new DomainError(`Falha ao resetar senha: ${error.message}`);
  }

  async listEnrolledStudentsByInstructor(instructorId: string): Promise<ProfileRecord[]> {
    const { data: mainCourses } = await this.client.from('courses').select('id').eq('instructor_id', instructorId);
    const { data: assignedCourses } = await this.client.from('course_enrollments').select('course_id').eq('user_id', instructorId);
    const courseIds = Array.from(new Set([...(mainCourses || []).map(c => c.id), ...(assignedCourses || []).map(ce => ce.course_id)]));
    if (courseIds.length === 0) return [];
    const { data: enrollments } = await this.client.from('course_enrollments').select('user_id').in('course_id', courseIds);
    const userIds = (enrollments || []).map(e => e.user_id);
    if (userIds.length === 0) return [];
    const { data } = await this.client.from('profiles').select('*').in('id', userIds).eq('role', 'STUDENT');
    return (data || []) as ProfileRecord[];
  }

  async getXpHistory(userId: string): Promise<XpLogRecord[]> {
    const { data, error } = await this.client.from('xp_history').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    if (error) throw new DomainError(`Erro ao buscar histórico de XP: ${error.message}`);
    return (data || []) as XpLogRecord[];
  }

  async logActivity(userId: string, actionType: string, description: string): Promise<void> {
    const { error } = await this.client.rpc('append_audit_log', {
      p_session_id: crypto.randomUUID(),
      p_path: 'application',
      p_page_title: actionType,
      p_resource_title: null,
      p_new_events: [{ action: actionType, description }],
      p_stats_delta: {}
    });
    if (error) console.error('Falha ao registrar atividade:', error.message);
  }

  async getStudentQuizAttemptsForStaff(filters: StudentActivityFilters = {}): Promise<StaffQuizAttemptRecord[]> {
    const normalized = normalizeStudentActivityFilters(filters);
    const { data, error } = await this.client.rpc('get_student_quiz_attempts_for_staff', {
      p_student_id: normalized.studentId,
      p_course_id: normalized.courseId,
      p_quiz_id: normalized.quizId,
      p_from: normalized.from,
      p_to: normalized.to,
      p_limit: normalized.attemptLimit,
    });

    if (error) throw new DomainError(`Falha ao buscar tentativas dos alunos: ${error.message}`);
    return (data || []) as StaffQuizAttemptRecord[];
  }

  async getStudentActivityLogsForStaff(filters: StudentActivityFilters = {}): Promise<StaffActivityLogRecord[]> {
    const normalized = normalizeStudentActivityFilters(filters);
    const { data, error } = await this.client.rpc('get_student_activity_logs_for_staff', {
      p_student_id: normalized.studentId,
      p_course_id: normalized.courseId,
      p_action_type: normalized.actionType,
      p_from: normalized.from,
      p_to: normalized.to,
      p_limit: normalized.logLimit,
    });

    if (error) throw new DomainError(`Falha ao buscar atividades dos alunos: ${error.message}`);
    return (data || []) as StaffActivityLogRecord[];
  }

  async getStudentActivitySummaryForStaff(filters: StudentActivityFilters = {}): Promise<StudentActivitySummary> {
    const normalized = normalizeStudentActivityFilters(filters);
    const { data, error } = await this.client.rpc('get_student_activity_summary_for_staff', {
      p_student_id: normalized.studentId,
      p_course_id: normalized.courseId,
      p_quiz_id: normalized.quizId,
      p_action_type: normalized.actionType,
      p_from: normalized.from,
      p_to: normalized.to,
    });

    if (error) throw new DomainError(`Falha ao resumir atividades dos alunos: ${error.message}`);

    const summary = Array.isArray(data) ? data[0] : data;
    return (summary || {
      total_students: 0,
      total_attempts: 0,
      passed_attempts: 0,
      failed_attempts: 0,
      average_score: null,
      total_logs: 0,
      active_students_7d: 0,
      active_students_30d: 0,
      last_activity_at: null,
    }) as StudentActivitySummary;
  }
}
