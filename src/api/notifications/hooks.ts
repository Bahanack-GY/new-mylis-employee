import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { notificationsApi } from './api';

export const notificationKeys = {
    all: ['notifications'] as const,
};

export const useNotifications = () =>
    useQuery({
        queryKey: notificationKeys.all,
        queryFn: notificationsApi.getAll,
    });

export const useMarkAsRead = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => notificationsApi.markAsRead(id),
        onSuccess: () => qc.invalidateQueries({ queryKey: notificationKeys.all }),
    });
};

export const useMarkAllAsRead = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: () => notificationsApi.markAllAsRead(),
        onSuccess: () => {
            toast.success('Toutes les notifications marquées comme lues');
            qc.invalidateQueries({ queryKey: notificationKeys.all });
        },
        onError: () => toast.error('Une erreur est survenue'),
    });
};
