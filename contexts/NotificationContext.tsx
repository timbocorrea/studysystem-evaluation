import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Notification } from '../domain/entities';
import { NotificationRepository } from '../repositories/NotificationRepository';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';

interface NotificationContextType {
    notifications: Notification[];
    unreadCount: number;
    isLoading: boolean;
    markAsRead: (id: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    deleteNotification: (id: string) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const repo = React.useMemo(() => new NotificationRepository(), []);

    const fetchNotifications = async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const data = await repo.getNotifications(user.id);
            setNotifications(data);
        } catch (error) {
            console.error('Erro ao buscar notificações:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (!user) {
            setNotifications([]);
            return;
        }

        fetchNotifications();

        // Inscreve para tempo real
        const subscription = repo.subscribeToNotifications(user.id, (newNotif) => {
            setNotifications(prev => [newNotif, ...prev]);
            
            // Toast de aviso se for mensagem direta ou resposta importante
            toast.info(newNotif.title, {
                description: newNotif.message,
                action: newNotif.link ? {
                    label: 'Ver',
                    onClick: () => window.location.href = newNotif.link!
                } : undefined
            });
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [user, repo]);

    const markAsRead = async (id: string) => {
        const success = await repo.markAsRead(id);
        if (success) {
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } as Notification : n));
        }
    };

    const markAllAsRead = async () => {
        if (!user) return;
        const success = await repo.markAllAsRead(user.id);
        if (success) {
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true } as Notification)));
        }
    };

    const deleteNotification = async (id: string) => {
        const success = await repo.deleteNotification(id);
        if (success) {
            setNotifications(prev => prev.filter(n => n.id !== id));
        }
    };

    const unreadCount = notifications.filter(n => !n.isRead).length;

    return (
        <NotificationContext.Provider value={{
            notifications,
            unreadCount,
            isLoading,
            markAsRead,
            markAllAsRead,
            deleteNotification
        }}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotifications deve ser usado dentro de um NotificationProvider');
    }
    return context;
};
