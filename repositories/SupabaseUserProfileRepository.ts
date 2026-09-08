import { SupabaseClient } from '@supabase/supabase-js';
import { IUserProfileRepository } from './IUserProfileRepository';
import { User } from '../domain/entities';
import { DomainError, NotFoundError } from '../domain/errors';

export class SupabaseUserProfileRepository implements IUserProfileRepository {
  private client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  async getUserById(userId: string): Promise<User> {
    const { data: profile, error } = await this.client
      .from('profiles')
      .select('id, name, email, role, xp_total, current_level, approval_status, last_access_at, is_temp_password, avatar_url')
      .eq('id', userId)
      .single();

    if (error || !profile) throw new NotFoundError('User', userId);

    const { data: achievementsData } = await this.client
      .from('user_achievements')
      .select('achievement_id, date_earned, achievement:achievements(title, description, icon)')
      .eq('user_id', userId);

    const achievements = (achievementsData || []).map((row: any) => ({
      id: row.achievement_id,
      title: row.achievement?.title || "Conquista Desbloqueada",
      description: row.achievement?.description || "Você desbloqueou uma nova conquista!",
      icon: row.achievement?.icon || "fas fa-trophy",
      dateEarned: new Date(row.date_earned)
    }));

    return new User(
      profile.id,
      profile.name || 'Estudante',
      profile.email || '',
      profile.role || 'STUDENT',
      profile.xp_total || 0,
      achievements,
      null,
      profile.approval_status || 'approved',
      profile.last_access_at ? new Date(profile.last_access_at) : null,
      profile.is_temp_password || false,
      null, null, null, false,
      profile.avatar_url || null
    );
  }

  async updateProfileInfo(userId: string, name: string): Promise<void> {
    const { error } = await this.client
      .from('profiles')
      .update({ name, updated_at: new Date().toISOString() })
      .eq('id', userId);

    if (error) throw new DomainError(`Erro ao atualizar nome: ${error.message}`);
  }

  async uploadAvatar(userId: string, file: File): Promise<string> {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}.${fileExt}`;
    
    const { error: uploadError } = await this.client.storage
      .from('avatars')
      .upload(fileName, file);

    if (uploadError) throw new DomainError(`Erro ao fazer upload da foto: ${uploadError.message}`);

    const { data: { publicUrl } } = this.client.storage
      .from('avatars')
      .getPublicUrl(fileName);

    const { error: updateError } = await this.client
      .from('profiles')
      .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
      .eq('id', userId);

    if (updateError) throw new DomainError(`Erro ao atualizar perfil com a foto: ${updateError.message}`);

    return publicUrl;
  }
}
