import axios from 'axios';

export function getClientApi() {
    // FIX: Forçamos '/api' como base para que o Nginx intercepte a rota.
    // O Nginx receberá /api/login, removerá o /api e enviará /login ao backend.
    const baseURL = '/api'; 

    const api = axios.create({
        baseURL,
        headers: {
            'Content-Type': 'application/json',
        },
        withCredentials: true,
        timeout: 10000,
    });

    api.interceptors.request.use((config) => {
        const fullUrl = `${config.baseURL || ''}${config.url || ''}`;
        console.log('[Client API Request]', { method: config.method?.toUpperCase(), fullUrl });

        if (typeof window !== 'undefined') {
            const token = document.cookie
                .split('; ')
                .find(row => row.startsWith('session_token='))
                ?.split('=')[1];
            
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        }
        return config;
    });

    return api;
}