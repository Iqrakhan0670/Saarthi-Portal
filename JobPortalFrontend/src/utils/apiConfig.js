// API Configuration Utility
// Automatically detects development vs production environment

// Check if running in development (localhost or Vite dev mode)
const isDevelopment = 
  typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || 
   window.location.hostname === '127.0.0.1') ||
  (typeof import.meta !== 'undefined' && import.meta.env?.DEV);

/**
 * Get the appropriate API base URL based on environment
 * - Development: Returns empty string (uses Vite proxy)
 * - Production: Returns the VITE_API_URL from environment
 */
export const getApiBaseUrl = () => {
  if (isDevelopment) {
    return ''; // Use Vite proxy (relative paths)
  }
  return import.meta.env.VITE_API_URL || '';
};

/**
 * Check if running in development mode
 */
export const isDevMode = () => {
  return isDevelopment;
};
