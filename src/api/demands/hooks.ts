import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { demandsApi } from './api';
import type { CreateDemandDto } from './types';

export const useMyDemands = () =>
    useQuery({
        queryKey: ['demands', 'my'],
        queryFn: demandsApi.getMyDemands,
    });

export const useCreateDemand = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (dto: CreateDemandDto) => demandsApi.create(dto),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['demands'] }),
    });
};

export const useUploadProforma = () =>
    useMutation({
        mutationFn: (file: File) => demandsApi.uploadProforma(file),
    });

export const useUploadImage = () =>
    useMutation({
        mutationFn: (file: File) => demandsApi.uploadImage(file),
    });
