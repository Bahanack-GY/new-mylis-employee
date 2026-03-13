import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { tasksApi } from './api';
import type { SelfAssignTaskDto } from './types';

export type { SelfAssignTaskDto };

export const taskKeys = {
    all: ['tasks'] as const,
    myTasks: ['tasks', 'my'] as const,
    byEmployee: (employeeId: string) => ['tasks', 'employee', employeeId] as const,
};

export const useMyTasks = () =>
    useQuery({
        queryKey: taskKeys.myTasks,
        queryFn: tasksApi.getMyTasks,
    });

export const useUpdateTaskState = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ taskId, state, blockReason }: { taskId: string; state: string; blockReason?: string }) =>
            tasksApi.updateState(taskId, state, blockReason),
        onSuccess: () => {
            toast.success('Tâche mise à jour');
            queryClient.invalidateQueries({ queryKey: taskKeys.myTasks });
        },
        onError: () => toast.error('Une erreur est survenue'),
    });
};

export const useSelfAssignTask = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (dto: SelfAssignTaskDto) => tasksApi.selfAssign(dto),
        onSuccess: () => {
            toast.success('Tâche assignée');
            queryClient.invalidateQueries({ queryKey: taskKeys.myTasks });
        },
        onError: () => toast.error('Une erreur est survenue'),
    });
};

export const useUpdateTask = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, dto }: { id: string; dto: any }) => tasksApi.updateTask(id, dto),
        onSuccess: () => {
            toast.success('Tâche modifiée');
            queryClient.invalidateQueries({ queryKey: taskKeys.myTasks });
        },
        onError: () => toast.error('Une erreur est survenue'),
    });
};

export const useDeleteTask = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => tasksApi.deleteTask(id),
        onSuccess: () => {
            toast.success('Tâche supprimée');
            queryClient.invalidateQueries({ queryKey: taskKeys.myTasks });
        },
        onError: () => toast.error('Une erreur est survenue'),
    });
};

export const useTaskHistory = (taskId: string | null) =>
    useQuery({
        queryKey: [...taskKeys.all, 'history', taskId],
        queryFn: () => tasksApi.getHistory(taskId!),
        enabled: !!taskId,
    });
