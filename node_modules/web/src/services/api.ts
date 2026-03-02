import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
    baseURL,
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    const requestUrl = `${config.url || ''}`;
    const isAuthLogin = requestUrl.includes('/auth/login');
    if (token && !isAuthLogin) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            localStorage.removeItem('token');
            window.location.href = '/login';
        }
        if (error.response && error.response.status === 403) {
            const code = error.response?.data?.code;
            const message = `${error.response?.data?.message || ''}`.toLowerCase();
            if (code === 'PROFILE_SETUP_REQUIRED' && window.location.pathname !== '/profile/setup') {
                window.location.href = '/profile/setup';
            } else if (
                message.includes('github setup') &&
                window.location.pathname !== '/github/setup'
            ) {
                window.location.href = '/github/setup';
            }
        }
        return Promise.reject(error);
    }
);

export default api;
