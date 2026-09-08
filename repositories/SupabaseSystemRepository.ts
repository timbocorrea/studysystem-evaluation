import { SupabaseClient } from '@supabase/supabase-js';
import { ISystemRepository } from './ISystemRepository';
import { DomainError } from '../domain/errors';

export class SupabaseSystemRepository implements ISystemRepository {
  private client: SupabaseClient;
  private systemStatsCache: { data: any; expiresAt: number } | null = null;
  private readonly systemStatsCacheTtlMs = 15000;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  async getSystemStats(): Promise<any> {
    if (this.systemStatsCache && Date.now() < this.systemStatsCache.expiresAt) return this.systemStatsCache.data;
    const { data: rpcData, error: rpcError } = await this.client.rpc('get_db_stats');
    if (rpcError || !rpcData) {
      const [{ count: courseCount }, { count: moduleCount }, { count: lessonCount }, { count: userCount }] = await Promise.all([
        this.client.from('courses').select('id', { count: 'exact', head: true }),
        this.client.from('modules').select('id', { count: 'exact', head: true }),
        this.client.from('lessons').select('id', { count: 'exact', head: true }),
        this.client.from('profiles').select('id', { count: 'exact', head: true })
      ]);
      const fallback = { user_count: userCount || 0, course_count: courseCount || 0, module_count: moduleCount || 0, lesson_count: lessonCount || 0 };
      this.systemStatsCache = { data: fallback, expiresAt: Date.now() + this.systemStatsCacheTtlMs };
      return fallback;
    }
    this.systemStatsCache = { data: rpcData, expiresAt: Date.now() + this.systemStatsCacheTtlMs };
    return rpcData;
  }

  async getSystemSettings(): Promise<{ key: string; value: string; description: string }[]> {
    const { data, error } = await this.client.from('system_settings').select('*');
    if (error) throw new DomainError(`Erro ao buscar configurações: ${error.message}`);
    return (data || []) as any[];
  }

  async updateSystemSetting(key: string, value: string): Promise<void> {
    const { error } = await this.client.from('system_settings').upsert({ key, value });
    if (error) throw new DomainError(`Erro ao atualizar configuração ${key}: ${error.message}`);
  }

  async getNetworkUsage(): Promise<any> {
    try {
      const { data, error } = await this.client.functions.invoke('monitor-usage');
      if (error) throw error;
      return data;
    } catch (err) {
      return { egress_bytes: 0, storage_bytes: 0, db_size_bytes: 0, is_mock: false };
    }
  }

  async sendNotification(userId: string, _senderId: string, title: string, message: string, type: string, link?: string): Promise<void> {
    const { error } = await this.client.rpc('send_master_notification', {
      p_target_user_id: userId,
      p_title: title,
      p_message: message,
      p_type: type,
      p_link: link ?? null
    });
    if (error) throw new DomainError(`Erro ao enviar notificação: ${error.message}`);
  }

  async getCurrentUserId(): Promise<string | null> {
    const { data: { user } } = await this.client.auth.getUser();
    return user?.id || null;
  }
}
