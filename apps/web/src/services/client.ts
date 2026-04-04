import api from './api';
import { ClientInput } from '@devmanager/shared/dist/client.schema';

export const getClients = async () => {
    const response = await api.get('/clients');
    return response.data;
};

export const createClient = async (data: ClientInput) => {
    const response = await api.post('/clients', data);
    return response.data;
};


export const getClient = async (id: string) => {
    const response = await api.get(`/clients/${id}`);
    return response.data;
};

export const toggleClientStatus = async (id: string, status: 'active' | 'suspended') => {
    const response = await api.patch(`/clients/${id}/status`, { status });
    return response.data;
};

export const resetClientPassword = async (id: string) => {
    const response = await api.post(`/clients/${id}/reset-password`);
    return response.data;
};

export const deleteClient = async (id: string) => {
    const response = await api.delete(`/clients/${id}`);
    return response.data;
};

export const autoLoginClient = async (id: string) => {
    const response = await api.post(`/clients/${id}/auto-login`);
    return response.data;
};
