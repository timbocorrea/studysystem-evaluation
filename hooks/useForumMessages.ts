import { useEffect, useState, useCallback, useRef } from 'react';
import { supabaseClient as supabase } from '@/services/Dependencies';
import { LessonForumRepository } from '@/repositories/LessonForumRepository';
import { ForumMessage } from '@/domain/entities';

export function useForumMessages(lessonId: string) {
  const [messages, setMessages] = useState<ForumMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Referência para evitar loop de dependência na subscrição e manter o repositório estável
  const forumRepo = useRef(new LessonForumRepository());

  /**
   * Carga inicial das mensagens
   */
  const loadInitialMessages = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await forumRepo.current.getMessagesByLesson(lessonId);
      setMessages(data);
      setError(null);
    } catch (err) {
      console.error('Erro ao carregar fórum:', err);
      setError('Não foi possível carregar as mensagens.');
    } finally {
      setIsLoading(false);
    }
  }, [lessonId]);

  /**
   * Lógica de Subscrição Realtime
   */
  useEffect(() => {
    if (!lessonId) return;

    loadInitialMessages();

    // Configuração do Canal Realtime
    const channel = supabase
      .channel(`lesson_forum_${lessonId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'lesson_forum_messages',
          filter: `lesson_id=eq.${lessonId}`,
        },
        async (payload) => {
          const newMsgRaw = payload.new as any;
          
          // Se fui eu que mandei, a gente já atualizou via estado local otimista (se implementado)
          // Mas aqui mantemos simples: se o ID já existe, não duplica
          setMessages((prev) => {
            if (prev.some(m => m.id === newMsgRaw.id)) return prev;
            
            // Busca o perfil do remetente assincronamente para manter consistência
            (async () => {
              const userProfile = await forumRepo.current.getUserProfile(newMsgRaw.user_id);
              const newMessage: ForumMessage = {
                ...newMsgRaw,
                profiles: userProfile
              } as ForumMessage;
              
              setMessages(current => {
                 if (current.some(m => m.id === newMessage.id)) {
                    return current.map(m => m.id === newMessage.id ? newMessage : m);
                 }
                 return [...current, newMessage];
              });
            })();

            // Retorna o estado atual temporariamente (o async vai atualizar depois)
            // Ou podemos inserir sem perfil primeiro e atualizar depois
            return [...prev, { ...newMsgRaw, profiles: undefined } as ForumMessage];
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'lesson_forum_messages',
        },
        (payload) => {
          setMessages((prev) => prev.filter((msg) => msg.id !== payload.old.id));
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'lesson_forum_messages',
          filter: `lesson_id=eq.${lessonId}`,
        },
        async (payload) => {
          const updatedMsgRaw = payload.new as any;
          
          setMessages((prev) => {
            const index = prev.findIndex(m => m.id === updatedMsgRaw.id);
            if (index === -1) return prev;

            // Se mudou o conteúdo, fixa ou edição, fazemos o refresh do perfil apenas se necessário
            // ou injetamos o perfil que já tínhamos no estado anterior
            const existingMsg = prev[index];
            const updatedMessage: ForumMessage = {
                ...updatedMsgRaw,
                profiles: existingMsg.profiles
            };

            const newList = [...prev];
            newList[index] = updatedMessage;
            return newList;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [lessonId, loadInitialMessages]);

  /**
   * Envio de nova mensagem
   */
  const sendMessage = async (content: string, userId: string, parentId?: string, imageUrl?: string) => {
    const sentMsg = await forumRepo.current.createMessage(lessonId, userId, content, parentId, imageUrl);
    if (sentMsg) {
      setMessages(prev => {
        if (prev.some(m => m.id === sentMsg.id)) return prev;
        return [...prev, sentMsg];
      });
      return sentMsg;
    } else {
      setError('Falha ao enviar mensagem.');
      throw new Error('Falha ao enviar mensagem');
    }
  };

  /**
   * Deleta uma mensagem
   */
  const deleteMessage = async (messageId: string) => {
    const success = await forumRepo.current.deleteMessage(messageId);
    if (success) {
        setMessages(prev => prev.filter(m => m.id !== messageId));
    }
    return success;
  };

  /**
   * Edita uma mensagem
   */
  const editMessage = async (messageId: string, content: string) => {
    const updated = await forumRepo.current.updateMessage(messageId, content);
    if (updated) {
        setMessages(prev => prev.map(m => m.id === messageId ? updated : m));
    }
    return updated;
  };

  /**
   * Fixa/Desfixa uma mensagem
   */
  const togglePin = async (messageId: string, isPinned: boolean) => {
    const updated = await forumRepo.current.togglePin(messageId, isPinned);
    if (updated) {
        setMessages(prev => prev.map(m => m.id === messageId ? updated : m));
    }
    return updated;
  };

  /**
   * Upload de imagem para o fórum
   */
  const uploadImage = async (file: File) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `forum/${lessonId}/${user.id}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('lesson-forum-attachments')
      .upload(filePath, file);

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw uploadError;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('lesson-forum-attachments')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    deleteMessage,
    editMessage,
    togglePin,
    uploadImage
  };
}
