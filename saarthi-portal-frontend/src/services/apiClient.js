/**
 * Centralized API Client for Saarthi Portal
 * Automatically handles:
 * - Environment base URL resolution
 * - Authorization Bearer token injection from localStorage
 * - JSON serialization & header handling
 * - Uniform error normalization
 */

const FUNCTIONS_BASE_URL =
    import.meta.env.VITE_SUPABASE_FUNCTIONS_URL || 'https://nrgmjczvxchyavisdalq.supabase.co/functions/v1';
const API_BASE_URL =
    import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export const getStoredAccessToken = () => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('token') || localStorage.getItem('adminToken') || null;
};

export const getAuthHeaders = (customHeaders = {}, isFormData = false) => {
    const headers = {...customHeaders };

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

    // Retrieve active JWT token
    getToken() {
        return getStoredAccessToken();
    }

    // Get standard headers with optional token injection
    getHeaders(customHeaders = {}, isFormData = false) {
        return getAuthHeaders(customHeaders, isFormData);
    }

    // Process and format response
    async handleResponse(response) {
        if (!response.ok) {
            let errorData;
            try {
                errorData = await response.json();
            } catch {
                errorData = { message: `Request failed with status ${response.status}: ${response.statusText}` };
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

    // HTTP GET
    async get(endpoint, queryParams = {}, customHeaders = {}) {
        let url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

        if (queryParams && Object.keys(queryParams).length > 0) {
            const searchParams = new URLSearchParams();
            Object.entries(queryParams).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    searchParams.append(key, value);
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

    // HTTP POST
    async post(endpoint, body = {}, customHeaders = {}) {
        const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: this.getHeaders(customHeaders),
            body: JSON.stringify(body),
        });

        return this.handleResponse(response);
    }

    // HTTP PUT
    async put(endpoint, body = {}, customHeaders = {}) {
        const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
        const response = await fetch(url, {
            method: 'PUT',
            headers: this.getHeaders(customHeaders),
            body: JSON.stringify(body),
        });

        return this.handleResponse(response);
    }

    // HTTP DELETE
    async delete(endpoint, customHeaders = {}) {
        const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
        const response = await fetch(url, {
            method: 'DELETE',
            headers: this.getHeaders(customHeaders),
        });

        return this.handleResponse(response);
    }

    // Multipart Form Data Upload
    async upload(endpoint, formData, customHeaders = {}) {
        const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: this.getHeaders(customHeaders, true),
            body: formData,
        });

        return this.handleResponse(response);
    }
}

// Export default instances for Supabase Functions and Microservice API
export const functionsApi = new ApiClient(FUNCTIONS_BASE_URL);
export const backendApi = new ApiClient(API_BASE_URL);
export const apiClient = functionsApi;

export default apiClient;