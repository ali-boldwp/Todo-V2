import api from './api';
import { EpicInput, SprintInput } from '@devmanager/shared/dist/index';

export const getEpics = async (projectId: string) => {
    const response = await api.get('/planning/epics', { params: { projectId } });
    return response.data;
};

export const createEpic = async (data: EpicInput) => {
    const response = await api.post('/planning/epics', data);
    return response.data;
};

export const getSprints = async (projectId: string) => {
    const response = await api.get('/planning/sprints', { params: { projectId } });
    return response.data;
};

export const createSprint = async (data: SprintInput) => {
    const response = await api.post('/planning/sprints', data);
    return response.data;
};
