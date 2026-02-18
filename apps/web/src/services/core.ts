import api from './api';
import { ClientInput, ProjectInput } from '@devmanager/shared/dist/index';

export const getClients = async () => {
    const response = await api.get('/clients');
    return response.data;
};

export const createClient = async (data: ClientInput) => {
    const response = await api.post('/clients', data);
    return response.data;
};

export const getProjects = async () => {
    const response = await api.get('/projects');
    return response.data;
};

export const createProject = async (data: ProjectInput) => {
    const response = await api.post('/projects', data);
    return response.data;
};

export const getProject = async (id: string) => {
    const response = await api.get(`/projects/${id}`);
    return response.data;
};
