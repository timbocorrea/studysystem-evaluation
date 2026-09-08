export interface IUserSession {
  user: {
    id: string;
    name: string;
    email: string;
    role: 'STUDENT' | 'INSTRUCTOR' | 'MASTER';
    approvalStatus?: 'pending' | 'approved' | 'rejected';
    xp?: number;
    level?: number;
    lastAccess?: Date | null;
    isMinor?: boolean;
  };
  token: string;
  sessionId: string;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  data?: IUserSession;
}
