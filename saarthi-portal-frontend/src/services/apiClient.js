/**
 * Centralized API Client for Saarthi Portal
 * 
 * Features:
 * - Environment base URL resolution
 * - Unified Bearer token injection
 * - Automated 401 Unauthorized / 403 Forbidden interception
 * - Global session cleanup & event-driven redirect triggers
 * - JSON serialization & error normalization
 */

const FUNCTIONS_BASE_URL =
    import.meta.env.VITE_SUPABASE_FUNCTIONS_URL || 'https://nrgmjczvxchyavisdalq.supabase.co/functions/v1';
const API_BASE_URL =
    import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const AUTH_TOKEN_KEY = 'saarthi_auth_token';

/**
 * Retrieve active JWT token from persistent storage
 */
export const getStoredAccessToken = () => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(AUTH_TOKEN_KEY) || localStorage.getItem('token') || null;
};

/**
 * Set active JWT token in persistent storage
 */
export const setStoredAccessToken = (token) => {
    if (typeof window === 'undefined') return;
    if (token) {
        localStorage.setItem(AUTH_TOKEN_KEY, token);
    } else {
        localStorage.removeItem(AUTH_TOKEN_KEY);
        localStorage.removeItem('token');
        localStorage.removeItem('adminToken');
    }
};

/**
 * Remove active session tokens and notify system
 */
export const clearStoredAuth = () => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem('token');
    localStorage.removeItem('adminToken');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userId');
    localStorage.removeItem('user');
    window.dispatchEvent(new Event('auth:unauthorized'));
};

/**
 * Build request headers securely
 * Note: Avoid sending mutable userRole headers; role verification relies strictly on JWT claims.
 */
export const getAuthHeaders = (customHeaders = {}, isFormData = false) => {
    const headers = { ...customHeaders };

    if (!isFormData && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
    }

    const token = getStoredAccessToken();
    if (token && !headers.Authorization) {
        headers.Authorization = `Bearer ${token}`;
    }

    return headers;
};

class ApiClient {
    constructor(baseUrl) {
        this.baseUrl = baseUrl;
    }

    getToken() {
        return getStoredAccessToken();
    }

    getHeaders(customHeaders = {}, isFormData = false) {
        return getAuthHeaders(customHeaders, isFormData);
    }

    /**
     * Process response, catch authentication faults, and normalize errors
     */
    async handleResponse(response) {
        if (response.status === 401) {
            clearStoredAuth();
        }

        if (!response.ok) {
            let errorData;
            try {
                errorData = await response.json();
            } catch {
                errorData = { 
                    message: `Request failed with status ${response.status}: ${response.statusText}` 
                };
            }

            const error = new Error(errorData.message || errorData.error || 'API request failed');
            error.status = response.status;
            error.data = errorData;
            throw error;
        }

        try {
            return await response.json();
        } catch {
            return null;
        }
    }

    /**
     * HTTP GET
     */
    async get(endpoint, queryParams = {}, customHeaders = {}) {
        let url = endpoint.startsWith('http') 
            ? endpoint 
            : `${this.baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

        if (queryParams && Object.keys(queryParams).length > 0) {
            const searchParams = new URLSearchParams();
            Object.entries(queryParams).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    searchParams.append(key, String(value));
                }
            });
            url += (url.includes('?') ? '&' : '?') + searchParams.toString();
        }

        const response = await fetch(url, {
            method: 'GET',
            headers: this.getHeaders(customHeaders),
        });

        return this.handleResponse(response);
    }

    /**
     * HTTP POST
     */
    async post(endpoint, body = {}, customHeaders = {}) {
        const url = endpoint.startsWith('http') 
            ? endpoint 
            : `${this.baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: this.getHeaders(customHeaders),
            body: JSON.stringify(body),
        });

        return this.handleResponse(response);
    }

    /**
     * HTTP PUT
     */
    async put(endpoint, body = {}, customHeaders = {}) {
        const url = endpoint.startsWith('http') 
            ? endpoint 
            : `${this.baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
        
        const response = await fetch(url, {
            method: 'PUT',
            headers: this.getHeaders(customHeaders),
            body: JSON.stringify(body),
        });

        return this.handleResponse(response);
    }

    /**
     * HTTP DELETE
     */
    async delete(endpoint, customHeaders = {}) {
        const url = endpoint.startsWith('http') 
            ? endpoint 
            : `${this.baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
        
        const response = await fetch(url, {
            method: 'DELETE',
            headers: this.getHeaders(customHeaders),
        });

        return this.handleResponse(response);
    }

    /**
     * Multipart Form Data Upload
     */
    async upload(endpoint, formData, customHeaders = {}) {
        const url = endpoint.startsWith('http') 
            ? endpoint 
            : `${this.baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: this.getHeaders(customHeaders, true),
            body: formData,
        });

        return this.handleResponse(response);
    }
}

export const functionsApi = new ApiClient(FUNCTIONS_BASE_URL);
export const backendApi = new ApiClient(API_BASE_URL);
export const apiClient = functionsApi;

export default apiClient;