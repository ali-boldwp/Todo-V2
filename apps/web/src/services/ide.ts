import api from './api';

export type IdeUpdateConfigInput = {
    latestVersion: string;
    downloadUrl: string;
    installUrl?: string;
    releaseNotesUrl?: string;
    message?: string;
    minSupportedVersion?: string;
    mandatory?: boolean;
};

export const getIdeUpdateConfig = async () => {
    const response = await api.get('/ide/config');
    return response.data;
};

export const saveIdeUpdateConfig = async (data: IdeUpdateConfigInput) => {
    const response = await api.post('/ide/config', data);
    return response.data;
};
