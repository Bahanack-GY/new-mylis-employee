import api from '../config';
import type { Task, TaskUpdateResponse } from './types';

export const tasksApi = {
    getMyTasks: () =>
        api.get<Task[]>('/tasks/my-tasks').then(r => r.data),

    getByEmployee: (employeeId: string) =>
        api.get<Task[]>(`/tasks/employee/${employeeId}`).then(r => r.data),

    updateState: (taskId: string, state: string, blockReason?: string) =>
        api.patch<TaskUpdateResponse>(`/tasks/update-state/${taskId}`, { state, blockReason }).then(r => r.data),
};
