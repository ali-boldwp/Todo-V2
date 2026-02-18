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
