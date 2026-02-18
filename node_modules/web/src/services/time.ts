import api from './api';

export const getTimeEntries = async () => {
    const response = await api.get('/time');
    return response.data;
};

export const startTimer = async (data: { taskId?: string, projectId?: string, description?: string }) => {
    const response = await api.post('/time/start', data);
    return response.data;
};

export const stopTimer = async () => {
    const response = await api.post('/time/stop');
    return response.data;
};

export const createTimeEntry = async (data: any) => {
    const response = await api.post('/time', data);
    return response.data;
};
