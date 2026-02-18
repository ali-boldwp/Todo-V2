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

export const syncIssues = async () => {
    const response = await api.post('/github/sync');
    return response.data;
};
