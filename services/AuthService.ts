import { IAuthRepository } from '../repositories/IAuthRepository';
import { AuthResponse, IUserSession } from '../domain/auth';

export class AuthService {
  constructor(private authRepo: IAuthRepository) { }

  async login(email: string, pass: string): Promise<AuthResponse> {
    return this.authRepo.login(email, pass);
  }

  async register(name: string, email: string, pass: string, isMinor: boolean = false): Promise<AuthResponse> {
    return this.authRepo.register(name, email, pass, isMinor);
  }

  async restoreSession(): Promise<IUserSession | null> {
    return this.authRepo.getCurrentSession();
  }

  async signInWithGoogle(): Promise<AuthResponse> {
    return this.authRepo.signInWithGoogle();
  }

  async handleOAuthCallback(): Promise<AuthResponse> {
    return this.authRepo.handleOAuthCallback();
  }

  async logout(): Promise<void> {
    await this.authRepo.logout();
  }

  async completePasswordReset(newPassword: string): Promise<void> {
    return this.authRepo.completePasswordReset(newPassword);
  }

  async updatePassword(newPassword: string): Promise<void> {
    return this.authRepo.updatePassword(newPassword);
  }
}
