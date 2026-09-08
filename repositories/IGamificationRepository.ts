import { Achievement } from '../domain/entities';

export interface IGamificationRepository {
  updateUserGamification(
    userId: string,
    xp: number,
    level: number,
    achievements: Achievement[]
  ): Promise<void>;

  saveAchievements(userId: string, achievements: Achievement[]): Promise<void>;
  
  logXpChange(userId: string, amount: number, actionType: string, description: string): Promise<void>;
  
  addXp(userId: string, actionType: 'LESSON_COMPLETE' | 'MODULE_COMPLETE', referenceId: string): Promise<{
    success: boolean;
    xpGained: number;
    newXp: number; 
    levelUp: boolean; 
    newLevel: number 
  }>;

  getWeeklyXpHistory(userId: string): Promise<{ date: string; xp: number }[]>;
  
  getDashboardStats(userId: string): Promise<{
    xp_total: number;
    current_level: number;
  }>;

  getAvailableAchievements(): Promise<Achievement[]>;
}
