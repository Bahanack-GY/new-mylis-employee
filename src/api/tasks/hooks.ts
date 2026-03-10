import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApi } from './api';
import type { SelfAssignTaskDto } from './types';

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
            queryClient.invalidateQueries({ queryKey: taskKeys.myTasks });
        },
    });
};

export const useSelfAssignTask = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (dto: SelfAssignTaskDto) => tasksApi.selfAssign(dto),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: taskKeys.myTasks });
        },
    });
};
