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
