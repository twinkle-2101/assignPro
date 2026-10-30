const isProduction = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.PROD : false;
const BASE_URL = isProduction 
    ? 'https://ai-based-evaluation-platform.onrender.com' 
    : 'http://localhost:8080';

const API_BASE_URL = `${BASE_URL}/api`;

export const getApiUrl = (endpoint) => {
    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${API_BASE_URL}${normalizedEndpoint}`;
};

export const getBaseUrl = (path) => {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${BASE_URL}${normalizedPath}`;
};
