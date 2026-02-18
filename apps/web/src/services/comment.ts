import api from './api';
import { CommentInput } from '@devmanager/shared/dist/index';

export const getComments = async (taskId: string) => {
    const response = await api.get('/comments', { params: { taskId } });
    return response.data;
};

export const createComment = async (data: CommentInput) => {
    const response = await api.post('/comments', data);
    return response.data;
};
