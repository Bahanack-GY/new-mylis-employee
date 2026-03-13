import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { formationsApi } from './api';
import type { CreateFormationDto } from './types';

export const formationKeys = {
    all: ['formations'] as const,
};

export const useFormations = () =>
    useQuery({
        queryKey: formationKeys.all,
        queryFn: formationsApi.getAll,
    });

export const useCreateFormation = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (dto: CreateFormationDto) => formationsApi.create(dto),
        onSuccess: () => {
            toast.success('Inscription enregistrée');
            qc.invalidateQueries({ queryKey: formationKeys.all });
        },
        onError: () => toast.error('Une erreur est survenue'),
    });
};
