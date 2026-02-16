import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ticketsApi } from './api';
import { taskKeys } from '../tasks/hooks';
import type { CreateTicketDto } from './types';

export const ticketKeys = {
    all: ['tickets'] as const,
    myTickets: ['tickets', 'my'] as const,
    department: ['tickets', 'department'] as const,
};

export const useMyTickets = () =>
    useQuery({
        queryKey: ticketKeys.myTickets,
        queryFn: ticketsApi.getMyTickets,
    });

export const useDepartmentTickets = () =>
    useQuery({
        queryKey: ticketKeys.department,
        queryFn: ticketsApi.getDepartmentTickets,
    });

export const useCreateTicket = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (dto: CreateTicketDto) => ticketsApi.create(dto),
        onSuccess: () => qc.invalidateQueries({ queryKey: ticketKeys.all }),
    });
};

export const useAcceptTicket = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (ticketId: string) => ticketsApi.accept(ticketId),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ticketKeys.department });
            qc.invalidateQueries({ queryKey: ticketKeys.myTickets });
            qc.invalidateQueries({ queryKey: taskKeys.myTasks });
        },
    });
};
