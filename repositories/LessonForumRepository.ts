import { supabaseClient as supabase } from '@/services/Dependencies';
import { ForumMessage } from '../domain/entities';

export class LessonForumRepository {
    private client = supabase;

    /**
     * Busca todas as mensagens de uma aula específica
     */
    async getMessagesByLesson(lessonId: string): Promise<ForumMessage[]> {
        const { data, error } = await this.client
            .from('lesson_forum_messages')
            .select(`
                *,
                profiles (
                    name,
                    role
                )
            `)
            .eq('lesson_id', lessonId)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Erro ao buscar mensagens do fórum:', error);
            return [];
        }

        return data as ForumMessage[];
    }

    /**
     * Envia uma nova mensagem para o fórum
     */
    async createMessage(lessonId: string, userId: string, content: string, parentId?: string, imageUrl?: string): Promise<ForumMessage | null> {
        const { data, error } = await this.client
            .from('lesson_forum_messages')
            .insert({
                lesson_id: lessonId,
                user_id: userId,
                content: content,
                parent_id: parentId,
                image_url: imageUrl
            })
            .select(`
                *,
                profiles (
                    name,
                    role
                )
            `)
            .single();

        if (error) {
            console.error('Erro ao enviar mensagem:', error);
            return null;
        }

        const newMessage = data as ForumMessage;

        // Se for uma resposta, notifica o dono da mensagem pai
        if (parentId) {
            try {
                const { error: notificationError } = await this.client.rpc('notify_forum_reply', {
                    p_reply_id: newMessage.id,
                });

                if (notificationError) {
                    console.error('Erro ao criar notificação de fórum:', notificationError);
                }
            } catch (notifyError) {
                console.error('Erro ao criar notificação de fórum:', notifyError);
            }
        }

        return newMessage;
    }

    /**
     * Busca o perfil de um usuário específico (auxiliar para realtime)
     */
    async getUserProfile(userId: string) {
        const { data, error } = await this.client
            .from('profiles')
            .select('name, role')
            .eq('id', userId)
            .single();

        if (error) {
            console.error('Erro ao buscar perfil:', error);
            return null;
        }

        return data;
    }

    /**
     * Deleta uma mensagem do fórum
     */
    async deleteMessage(messageId: string): Promise<boolean> {
        const { error } = await this.client
            .from('lesson_forum_messages')
            .delete()
            .eq('id', messageId);

        if (error) {
            console.error('Erro ao deletar mensagem:', error);
            return false;
        }

        return true;
    }

    /**
     * Atualiza o conteúdo de uma mensagem
     */
    async updateMessage(messageId: string, content: string): Promise<ForumMessage | null> {
        const { data, error } = await this.client
            .from('lesson_forum_messages')
            .update({
                content: content,
                is_edited: true
            })
            .eq('id', messageId)
            .select(`
                *,
                profiles (
                    name,
                    role
                )
            `)
            .single();

        if (error) {
            console.error('Erro ao atualizar mensagem:', error);
            return null;
        }

        return data as ForumMessage;
    }

    /**
     * Fixa ou desfixa uma mensagem
     */
    async togglePin(messageId: string, isPinned: boolean): Promise<ForumMessage | null> {
        const { data, error } = await this.client
            .from('lesson_forum_messages')
            .update({
                is_pinned: isPinned
            })
            .eq('id', messageId)
            .select(`
                *,
                profiles (
                    name,
                    role
                )
            `)
            .single();

        if (error) {
            console.error('Erro ao fixar/desfixar:', error);
            return null;
        }

        return data as ForumMessage;
    }

    /**
     * Busca mensagens pendentes (não respondidas por um instrutor) de cursos do professor
     */
    async getPendingMessages(instructorId: string): Promise<any[]> {
        const { data, error } = await this.client
            .rpc('get_pending_forum_messages', {
                p_instructor_id: instructorId
            });

        if (error) {
            console.error('Erro ao buscar mensagens pendentes:', error);
            return [];
        }

        return data || [];
    }
}
