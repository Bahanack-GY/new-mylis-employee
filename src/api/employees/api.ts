import api from '../config';
import type { LeaderboardEntry } from './types';

export const employeesApi = {
    getLeaderboard: (limit: number = 5) =>
        api.get<LeaderboardEntry[]>('/employees/leaderboard', { params: { limit } }).then(r => r.data),
};
