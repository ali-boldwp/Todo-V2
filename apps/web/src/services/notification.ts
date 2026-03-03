import api from './api';

export const getMyNotifications = async (limit = 30) => {
    const response = await api.get('/notifications', { params: { limit } });
    return response.data;
};

export const getMyUnreadNotificationCount = async () => {
    const response = await api.get('/notifications/unread-count');
    return response.data;
};

export const markNotificationRead = async (id: string) => {
    const response = await api.post(`/notifications/${id}/read`);
    return response.data;
};

export const markAllNotificationsRead = async () => {
    const response = await api.post('/notifications/read-all');
    return response.data;
};
