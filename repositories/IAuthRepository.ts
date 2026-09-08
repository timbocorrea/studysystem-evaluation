import { AuthResponse, IUserSession } from '../domain/auth';

export interface IAuthRepository {
  login(email: string, password: string): Promise<AuthResponse>;
  register(name: string, email: string, password: string, isMinor?: boolean): Promise<AuthResponse>;
  signInWithGoogle(): Promise<AuthResponse>;
  handleOAuthCallback(): Promise<AuthResponse>;
  getCurrentSession(): Promise<IUserSession | null>;
  logout(): Promise<void>;
  completePasswordReset(newPassword: string): Promise<void>;
  updatePassword(newPassword: string): Promise<void>;
}
