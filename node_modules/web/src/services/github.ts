import api from './api';
import { GithubConfigInput } from '@devmanager/shared/dist/index';

export const getGithubConfig = async () => {
    const response = await api.get('/github/config');
    return response.data;
};

export const saveGithubConfig = async (data: GithubConfigInput) => {
    const response = await api.post('/github/config', data);
    return response.data;
};

export const disconnectGithub = async () => {
    const response = await api.delete('/github/config');
    return response.data;
};

export const syncIssues = async () => {
    const response = await api.post('/github/sync');
    return response.data;
};

export const getGithubAuthUrl = async () => {
    const response = await api.get('/github/auth/url');
    return response.data;
};

export const handleGithubCallback = async (code: string) => {
    const response = await api.post('/github/auth/callback', { code });
    return response.data;
};

export const getGithubRepos = async () => {
    const response = await api.get('/github/repos');
    return response.data;
};
