import { SupabaseClient } from '@supabase/supabase-js';
import { IGamificationRepository } from './IGamificationRepository';
import { Achievement } from '../domain/entities';
import { DomainError } from '../domain/errors';

export class SupabaseGamificationRepository implements IGamificationRepository {
  private client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  async updateUserGamification(userId: string, xp: number, level: number, achievements: Achievement[]): Promise<void> {
    void xp;
    void level;
    void userId;
    void achievements;
    throw new DomainError('Atualizacao direta de gamificacao foi desabilitada.');
  }

  async saveAchievements(userId: string, achievements: Achievement[]): Promise<void> {
    const serializedAchievements = achievements.map(a => ({
      ...a,
      dateEarned: a.dateEarned instanceof Date ? a.dateEarned.toISOString() : a.dateEarned
    }));

    const { error } = await this.client
      .from('profiles')
      .update({
        achievements: serializedAchievements,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) throw new DomainError(`Erro ao salvar conquistas: ${error.message}`);
  }

  async logXpChange(userId: string, amount: number, actionType: string, description: string): Promise<void> {
    void userId;
    void amount;
    void actionType;
    void description;
    throw new DomainError('Registro manual de XP desativado: use o claim server-side.');
  }

  async addXp(userId: string, actionType: 'LESSON_COMPLETE' | 'MODULE_COMPLETE', referenceId: string): Promise<{ success: boolean; xpGained: number; newXp: number; levelUp: boolean; newLevel: number }> {
    void userId;
    const { data, error } = await this.client.rpc('claim_completion_xp', {
      p_reward_type: actionType,
      p_reference_id: referenceId
    });

    if (error) {
      console.error('Falha no claim server-side de XP:', error.message);
      return { success: false, xpGained: 0, newXp: 0, levelUp: false, newLevel: 0 };
    }

    return {
      success: Boolean(data?.success),
      xpGained: Number(data?.xp_gained || 0),
      newXp: Number(data?.new_xp || 0),
      levelUp: Boolean(data?.level_up),
      newLevel: Number(data?.new_level || 1)
    };
  }

  async getWeeklyXpHistory(userId: string): Promise<{ date: string; xp: number }[]> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data, error } = await this.client
      .from('xp_history')
      .select('created_at, amount')
      .eq('user_id', userId)
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: true });

    if (error) throw new DomainError(`Erro ao buscar histórico de XP: ${error.message}`);

    const groupedByDate = (data || []).reduce((acc, record) => {
      const date = new Date(record.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      acc[date] = (acc[date] || 0) + record.amount;
      return acc;
    }, {} as Record<string, number>);

    const result = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      result.push({ date: dateStr, xp: groupedByDate[dateStr] || 0 });
    }
    return result;
  }

  async getDashboardStats(userId: string): Promise<{ xp_total: number; current_level: number }> {
    const { data, error } = await this.client.rpc('get_dashboard_stats', {
      p_user_id: userId
    });

    if (error) {
      console.error('⚠️ RPC get_dashboard_stats failed:', error.message);
      return { xp_total: 0, current_level: 1 };
    }

    return {
      xp_total: data.xp_total,
      current_level: data.current_level
    };
  }

  async getAvailableAchievements(): Promise<Achievement[]> {
    // Para simplificar e garantir que o frontend tenha todos os metadados (ícones, etc)
    // retornamos a lista mestra. No futuro, isso pode vir de uma tabela 'master_achievements'.
    return [
      {
        id: 'first-lesson',
        title: 'Primeiro Passo',
        description: 'Você concluiu sua primeira aula no sistema!',
        dateEarned: new Date(),
        icon: 'fa-rocket'
      },
      {
        id: 'module-master',
        title: 'Mestre do Módulo',
        description: 'Você completou um módulo inteiro!',
        dateEarned: new Date(),
        icon: 'fa-crown'
      },
      {
        id: 'course-complete',
        title: 'Conquistador do Curso',
        description: 'Você completou todas as aulas deste curso!',
        dateEarned: new Date(),
        icon: 'fa-trophy'
      },
      {
        id: 'xp-1000',
        title: 'Aprendiz Dedicado',
        description: 'Você alcançou 1.000 XP acumulados!',
        dateEarned: new Date(),
        icon: 'fa-bolt'
      },
      {
        id: 'xp-5000',
        title: 'Veterano do Estudo',
        description: 'Você alcançou 5.000 XP acumulados!',
        dateEarned: new Date(),
        icon: 'fa-award'
      },
      {
        id: 'level-5',
        title: 'Mestre do Conhecimento',
        description: 'Respeito! Você atingiu o Nível 5.',
        dateEarned: new Date(),
        icon: 'fa-brain'
      }
    ];
  }
}
