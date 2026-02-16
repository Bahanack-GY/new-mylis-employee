import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
        onSuccess: () => qc.invalidateQueries({ queryKey: formationKeys.all }),
    });
};
