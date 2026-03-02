import api from './api';

export const getChatUsers = async () => {
    const response = await api.get('/chat/users');
    return response.data;
};

export const getConversations = async () => {
    const response = await api.get('/chat/conversations');
    return response.data;
};

export const createOrGetConversation = async (participantId: string) => {
    const response = await api.post('/chat/conversations', { participantId });
    return response.data;
};

export const getConversationMessages = async (conversationId: string) => {
    const response = await api.get(`/chat/conversations/${conversationId}/messages`);
    return response.data;
};

export const sendConversationMessage = async (conversationId: string, text: string) => {
    const response = await api.post(`/chat/conversations/${conversationId}/messages`, { text });
    return response.data;
};
