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

export const updateProject = async (id: string, data: Partial<ProjectInput>) => {
    const response = await api.put(`/projects/${id}`, data);
    return response.data;
};

export const deleteProject = async (id: string) => {
    const response = await api.delete(`/projects/${id}`);
    return response.data;
};

export const getProject = async (id: string) => {
    const response = await api.get(`/projects/${id}`);
    return response.data;
};

// --- Documents ---
export const uploadProjectDocument = async (projectId: string, data: { title: string; description: string; fileData: string; mimeType: string; fileName: string }) => {
    const response = await api.post(`/projects/${projectId}/documents`, data);
    return response.data;
};

export const deleteProjectDocument = async (projectId: string, docId: string) => {
    const response = await api.delete(`/projects/${projectId}/documents/${docId}`);
    return response.data;
};

export const downloadProjectDocument = async (projectId: string, docId: string) => {
    const response = await api.get(`/projects/${projectId}/documents/${docId}/download`);
    return response.data;
};
