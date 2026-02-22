import api from './api';
import { TaskInput } from '@devmanager/shared/dist/index';

export const getTasks = async (projectId: string) => {
    const response = await api.get('/tasks', { params: { projectId } });
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
