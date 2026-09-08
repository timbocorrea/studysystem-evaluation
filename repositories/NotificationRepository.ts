import { supabaseClient as supabase } from '@/services/Dependencies';
import { Notification, NotificationType } from '../domain/entities';

export class NotificationRepository {
    private client = supabase;

    /**
     * Busca todas as notificações de um usuário
     */
    async getNotifications(userId: string): Promise<Notification[]> {
        const { data, error } = await this.client
            .from('notifications')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Erro ao buscar notificações:', error);
            return [];
        }

        return (data || []).map(row => new Notification(
            row.id,
            row.user_id,
            row.title,
            row.message,
            row.type as NotificationType,
            row.sender_id,
            row.link,
            row.is_read,
            new Date(row.created_at)
        ));
    }

    /**
     * Cria uma nova notificação
     */
    async createNotification(
        userId: string,
        title: string,
        message: string,
        type: NotificationType,
        senderId: string | null = null,
        link: string | null = null
    ): Promise<Notification | null> {
        const { data, error } = await this.client
            .from('notifications')
            .insert({
                user_id: userId,
                sender_id: senderId,
                title,
                message,
                type,
                link
            })
            .select()
            .single();

        if (error) {
            console.error('Erro ao criar notificação:', error);
            return null;
        }

        return new Notification(
            data.id,
            data.user_id,
            data.title,
            data.message,
            data.type as NotificationType,
            data.sender_id,
            data.link,
            data.is_read,
            new Date(data.created_at)
        );
    }

    /**
     * Marca uma notificação como lida
     */
    async markAsRead(notificationId: string): Promise<boolean> {
        const { error } = await this.client
            .from('notifications')
            .update({ is_read: true })
            .eq('id', notificationId);

        if (error) {
            console.error('Erro ao marcar notificação como lida:', error);
            return false;
        }

        return true;
    }

    /**
     * Marca todas as notificações de um usuário como lidas
     */
    async markAllAsRead(userId: string): Promise<boolean> {
        const { error } = await this.client
            .from('notifications')
            .update({ is_read: true })
            .eq('user_id', userId)
            .eq('is_read', false);

        if (error) {
            console.error('Erro ao marcar todas as notificações como lidas:', error);
            return false;
        }

        return true;
    }

    /**
     * Exclui uma notificação
     */
    async deleteNotification(notificationId: string): Promise<boolean> {
        const { error } = await this.client
            .from('notifications')
            .delete()
            .eq('id', notificationId);

        if (error) {
            console.error('Erro ao excluir notificação:', error);
            return false;
        }

        return true;
    }

    /**
     * Se inscreve em tempo real para novas notificações
     */
    subscribeToNotifications(userId: string, onNewNotification: (notif: Notification) => void) {
        return this.client
            .channel(`notifications:${userId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${userId}`
                },
                (payload) => {
                    const row = payload.new;
                    onNewNotification(new Notification(
                        row.id,
                        row.user_id,
                        row.title,
                        row.message,
                        row.type as NotificationType,
                        row.sender_id,
                        row.link,
                        row.is_read,
                        new Date(row.created_at)
                    ));
                }
            )
            .subscribe();
    }

    /**
     * Envia notificações em massa para uma lista de usuários
     */
    async sendNotificationToUsers(
        userIds: string[],
        title: string,
        message: string,
        _instructorId: string,
        type: NotificationType = 'system'
    ): Promise<boolean> {
        if (!userIds || userIds.length === 0) return true;

        const { error } = await this.client.rpc('send_instructor_notifications', {
            p_recipient_ids: userIds,
            p_title: title,
            p_message: message,
        });

        if (error) {
            console.error('Erro ao enviar notificações em lote:', error);
            return false;
        }

        return true;
    }
}
