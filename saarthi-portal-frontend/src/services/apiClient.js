/**
 * Zero-Trust API Client
 * Supports all Supabase auth storage formats and injects apikey + bearer tokens.
 */

const TOKEN_KEY = 'saarthi_auth_token';

export const getStoredAccessToken = () => {
  try {
    // 1. Direct tokens
    const directToken =
      localStorage.getItem('saarthi_auth_token') ||
      localStorage.getItem('token') ||
      localStorage.getItem('access_token');
    if (directToken) return directToken;

    // 2. Supabase Auth format
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('sb-') || key.includes('-auth-token'))) {
        try {
          const parsed = JSON.parse(localStorage.getItem(key));
          if (parsed?.access_token) return parsed.access_token;
          if (parsed?.token) return parsed.token;
          if (parsed?.currentSession?.access_token) return parsed.currentSession.access_token;
        } catch {}
      }
    }

    // 3. User object token
    const userObj = localStorage.getItem('user');
    if (userObj) {
      try {
        const parsed = JSON.parse(userObj);
        if (parsed?.token) return parsed.token;
        if (parsed?.access_token) return parsed.access_token;
      } catch {}
    }

    return null;
  } catch (err) {
    console.error('Failed to retrieve token from storage:', err);
    return null;
  }
};

export const setStoredAccessToken = (token) => {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch (err) {
    console.error('Failed to write token to storage:', err);
  }
};

export const clearStoredAuth = () => {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem('token');
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    localStorage.removeItem('role');
  } catch (err) {
    console.error('Failed to clear stored auth:', err);
  }
};

export const getAuthHeaders = () => {
  const token = getStoredAccessToken();
  const anonKey =
    import.meta.env.VITE_SUPABASE_ANON_KEY ||
    import.meta.env.VITE_SUPABASE_KEY ||
    '';

  const headers = {
    'Content-Type': 'application/json',
  };

  if (anonKey) {
    headers['apikey'] = anonKey;
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  } else if (anonKey) {
    headers['Authorization'] = `Bearer ${anonKey}`;
  }

  return headers;
};

export const getHeaders = getAuthHeaders;
export const getStoredToken = getStoredAccessToken;
export const setStoredToken = setStoredAccessToken;

export async function apiClient(endpoint, options = {}) {
  const baseURL =
    import.meta.env.VITE_SUPABASE_FUNCTIONS_URL ||
    (import.meta.env.VITE_SUPABASE_URL
      ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`
      : '/api');

  const url = endpoint.startsWith('http')
    ? endpoint
    : `${baseURL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  const defaultHeaders = getAuthHeaders();

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...(options.headers || {}),
    },
  };

  delete config.headers['x-user-role'];
  delete config.headers['X-User-Role'];
  delete config.headers['role'];

  try {
    const response = await fetch(url, config);
    return response;
  } catch (err) {
    console.error(`API request error for ${url}:`, err);
    throw err;
  }
}

export default apiClient;