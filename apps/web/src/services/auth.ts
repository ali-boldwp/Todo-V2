import api from './api';
import { LoginInput, RegisterInput } from '@devmanager/shared/dist/auth.schema';

export const login = async (data: LoginInput) => {
    const response = await api.post('/auth/login', data);
    return response.data;
};

export const register = async (data: RegisterInput) => {
    const response = await api.post('/auth/register', data);
    return response.data;
};

export const getMe = async () => {
    const response = await api.get('/auth/me');
    return response.data;
};

export const getGithubSetupUrl = async () => {
    const response = await api.get('/auth/github/setup/url');
    return response.data as { url: string };
};

export const getGithubSetupStatus = async () => {
    const response = await api.get('/auth/github/setup/status');
    return response.data as {
        githubSetupCompleted: boolean;
        githubUsername: string | null;
        githubConnectedAt: string | null;
    };
};
