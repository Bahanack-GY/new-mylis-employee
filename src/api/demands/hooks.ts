import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
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
        onSuccess: () => {
            toast.success('Demande soumise avec succès');
            qc.invalidateQueries({ queryKey: ['demands'] });
        },
        onError: () => toast.error('Une erreur est survenue'),
    });
};

export const useUploadProforma = () =>
    useMutation({
        mutationFn: (file: File) => demandsApi.uploadProforma(file),
        onSuccess: () => toast.success('Proforma uploadé'),
        onError: () => toast.error('Échec de l\'upload'),
    });

export const useUploadImage = () =>
    useMutation({
        mutationFn: (file: File) => demandsApi.uploadImage(file),
    });
