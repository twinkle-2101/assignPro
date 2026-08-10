const BASE_URL = process.env.NODE_ENV === 'production' ? 'https://ai-based-evaluation-platform.onrender.com'  // Remove any trailing slash ? process.env.REACT_APP_BASE_URL
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
