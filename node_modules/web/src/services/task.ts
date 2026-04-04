import api from './api';
import { TaskInput } from '@devmanager/shared/dist/index';

export const getTasks = async (projectId?: string) => {
    const params = projectId ? { projectId } : undefined;
    const response = await api.get('/tasks', { params });
    return response.data;
};

export const getTaskActivityLogs = async (id: string) => {
    const response = await api.get(`/tasks/${id}/logs`);
    return response.data;
};

export const createTask = async (data: TaskInput) => {
    const response = await api.post('/tasks', data);
    return response.data;
};

export const updateTask = async (id: string, data: Partial<TaskInput>) => {
    const response = await api.patch(`/tasks/${id}`, data);
    return response.data;
};

export const deleteTask = async (id: string) => {
    const response = await api.delete(`/tasks/${id}`);
    return response.data;
};

export const startTaskWork = async (id: string) => {
    const response = await api.post(`/tasks/${id}/start`);
    return response.data;
};

export const stopTaskWork = async (id: string) => {
    const response = await api.post(`/tasks/${id}/stop`);
    return response.data;
};

export const pauseTaskWork = async (id: string) => {
    const response = await api.post(`/tasks/${id}/pause`);
    return response.data;
};

export const resumeTaskWork = async (id: string) => {
    const response = await api.post(`/tasks/${id}/resume`);
    return response.data;
};

export const finishTaskWork = async (id: string, force?: boolean) => {
    const response = await api.post(`/tasks/${id}/finish`, { force });
    return response.data;
};

export const fixTaskBranch = async (id: string) => {
    const response = await api.post(`/tasks/${id}/fix-branch`);
    return response.data;
};

export const approveTaskVerification = async (id: string, comment?: string) => {
    const response = await api.post(`/tasks/${id}/verify/approve`, { comment });
    return response.data;
};

export const rejectTaskVerification = async (id: string, comment?: string) => {
    const response = await api.post(`/tasks/${id}/verify/reject`, { comment });
    return response.data;
};

export const uploadAttachment = async (
    taskId: string,
    file: File
): Promise<any> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async () => {
            try {
                const base64 = (reader.result as string).split(',')[1]; // strip data URL prefix
                const response = await api.post(`/tasks/${taskId}/attachments`, {
                    name: file.name,
                    mimeType: file.type,
                    size: file.size,
                    data: base64,
                });
                resolve(response.data);
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
    });
};

export const deleteAttachment = async (taskId: string, index: number) => {
    const response = await api.delete(`/tasks/${taskId}/attachments/${index}`);
    return response.data;
};

export const downloadAttachment = async (taskId: string, index: number) => {
    const response = await api.get(`/tasks/${taskId}/attachments/${index}/download`);
    return response.data;
};

export const approveTaskClient = async (id: string, comment?: string) => {
    const response = await api.post(`/tasks/${id}/client-approve`, { comment });
    return response.data;
};

export const rejectTaskClient = async (id: string, comment?: string) => {
    const response = await api.post(`/tasks/${id}/client-reject`, { comment });
    return response.data;
};
