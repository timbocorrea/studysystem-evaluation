import { User } from '../domain/entities';

export interface IUserProfileRepository {
  getUserById(userId: string): Promise<User>;
  updateProfileInfo(userId: string, name: string): Promise<void>;
  uploadAvatar(userId: string, file: File): Promise<string>;
}
