export interface ISystemRepository {
  getSystemStats(): Promise<any>;
  getSystemSettings(): Promise<{ key: string; value: string; description: string }[]>;
  updateSystemSetting(key: string, value: string): Promise<void>;
  getNetworkUsage(): Promise<{ egress_bytes: number; storage_bytes: number; db_size_bytes: number; is_mock: boolean }>;
  sendNotification(userId: string, senderId: string, title: string, message: string, type: string, link?: string): Promise<void>;
  getCurrentUserId(): Promise<string | null>;
}
