export const getApiBaseUrl = () => {
  return `${import.meta.env.VITE_SUPABASE_FUNCTIONS_URL}/jobs-api?path=`;
};

export const isDevMode = () => {
  return import.meta.env.DEV;
};