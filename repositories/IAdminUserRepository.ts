import {
  ProfileRecord,
  StaffActivityLogRecord,
  StaffQuizAttemptRecord,
  StudentActivityFilters,
  StudentActivitySummary,
} from '../domain/admin';

export interface IAdminUserRepository {
  listProfiles(): Promise<ProfileRecord[]>;
  updateProfileRole(profileId: string, role: 'STUDENT' | 'INSTRUCTOR' | 'MASTER'): Promise<void>;
  updateProfile(id: string, patch: { role?: 'STUDENT' | 'INSTRUCTOR' | 'MASTER'; isMinor?: boolean }): Promise<void>;
  deleteProfile(userId: string): Promise<void>;

  // User Approval System
  fetchPendingUsers(): Promise<ProfileRecord[]>;
  fetchApprovedUsers(): Promise<ProfileRecord[]>;
  fetchRejectedUsers(): Promise<ProfileRecord[]>;
  approveUser(userId: string, adminId: string): Promise<void>;
  rejectUser(userId: string, adminId: string, reason?: string): Promise<void>;
  
  // Course Access Control
  assignCoursesToUser(userId: string, courseIds: string[], adminId: string): Promise<void>;
  getUserCourseAssignments(userId: string): Promise<string[]>;
  removeUserCourseAssignment(userId: string, courseId: string): Promise<void>;
  removeAllUserCourseAssignments(userId: string): Promise<void>;
  getCourseUserAssignments(courseId: string): Promise<string[]>;
  assignUsersToCourse(courseId: string, userIds: string[], adminId: string): Promise<void>;

  resetUserPassword(userId: string, newPassword: string): Promise<void>;
  listEnrolledStudentsByInstructor(instructorId: string): Promise<ProfileRecord[]>;
  
  // Student Logs
  getXpHistory(userId: string): Promise<import('../domain/admin').XpLogRecord[]>;
  logActivity(userId: string, actionType: string, description: string): Promise<void>;
  getStudentQuizAttemptsForStaff(filters?: StudentActivityFilters): Promise<StaffQuizAttemptRecord[]>;
  getStudentActivityLogsForStaff(filters?: StudentActivityFilters): Promise<StaffActivityLogRecord[]>;
  getStudentActivitySummaryForStaff(filters?: StudentActivityFilters): Promise<StudentActivitySummary>;
}
