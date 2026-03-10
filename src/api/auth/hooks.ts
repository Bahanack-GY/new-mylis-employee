import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { authApi } from './api';
import type { LoginDto, RegisterDto, UpdateProfileDto } from './types';

export const authKeys = {
    profile: ['auth', 'profile'] as const,
    badges: ['auth', 'my-badges'] as const,
};

export const useProfile = (token?: string | null) =>
    useQuery({
        queryKey: authKeys.profile,
        queryFn: authApi.getProfile,
        enabled: !!token,
    });

import { useAuth } from '../../contexts/AuthContext';

export const useLogin = () => {
    const qc = useQueryClient();
    const navigate = useNavigate();
    const { setToken } = useAuth();

    return useMutation({
        mutationFn: (dto: LoginDto) => authApi.login(dto),
        onSuccess: (data) => {
            if (data.user.role !== 'EMPLOYEE' && data.user.role !== 'HEAD_OF_DEPARTMENT') {
                throw new Error('ACCESS_DENIED');
            }
            setToken(data.access_token);
            qc.invalidateQueries({ queryKey: authKeys.profile });
            navigate('/dashboard');
        },
    });
};

export const useRegister = () =>
    useMutation({ mutationFn: (dto: RegisterDto) => authApi.register(dto) });

export const useUpdateProfile = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (dto: UpdateProfileDto) => authApi.updateProfile(dto),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: authKeys.profile });
        },
    });
};

export const useMyBadges = () =>
    useQuery({
        queryKey: authKeys.badges,
        queryFn: authApi.getMyBadges,
    });

export const useLogout = () => {
    const qc = useQueryClient();
    const navigate = useNavigate();
    const { setToken } = useAuth();

    return () => {
        setToken(null);
        qc.clear();
        navigate('/login');
    };
};
