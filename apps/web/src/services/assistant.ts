import api from './api';

export const getAssistants = async () => {
    const response = await api.get('/assistants');
    return response.data;
};

export const createAssistant = async (data: any) => {
    const response = await api.post('/assistants', data);
    return response.data;
};

export const deleteAssistant = async (id: string) => {
    const response = await api.delete(`/assistants/${id}`);
    return response.data;
};

export const assignAssistantToProject = async (assistantId: string, projectId: string) => {
    const response = await api.post(`/assistants/${assistantId}/projects`, { projectId });
    return response.data;
};

export const unassignAssistantFromProject = async (assistantId: string, projectId: string) => {
    const response = await api.delete(`/assistants/${assistantId}/projects/${projectId}`);
    return response.data;
};
