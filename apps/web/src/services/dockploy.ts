import api from './api';

export const getDockployConfig = async () => {
    const response = await api.get('/dockploy/config');
    return response.data;
};

export const saveDockployConfig = async (data: {
    baseUrl: string;
    apiToken: string;
    deployPathTemplate?: string;
    appStatusPathTemplate?: string;
}) => {
    const response = await api.post('/dockploy/config', data);
    return response.data;
};

export const getDockployConnectionStatus = async () => {
    const response = await api.get('/dockploy/status');
    return response.data;
};
