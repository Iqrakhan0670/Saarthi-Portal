
// utils/envLoader.js
let envCache = {};
let isInitialized = false;

// Initialize cache from process.env (called after dotenv.config())
export const initEnvCache = () => {
  envCache = { ...process.env };
  isInitialized = true;
  console.log('✅ Environment variables loaded:', Object.keys(envCache).length, 'variables');
};

export const getEnv = (name, required = true) => {
  // Always check process.env first in case of changes
  const value = process.env[name];
  
  if (required && (value === undefined || value === null || value.trim() === '')) {
    // Don't throw during initial load, just return undefined
    if (!isInitialized) {
      return undefined;
    }
    throw new Error(`Environment variable ${name} is required but not set.`);
  }

  return value;
};

export const getJsonEnv = (name, required = true) => {
  if (envCache[name] !== undefined) {
    return envCache[name];
  }

  const value = getEnv(name, required);
  if (!value) {
    return required ? null : undefined; // Or throw, depending on desired behavior for required but empty JSON
  }

  try {
    const parsed = JSON.parse(value);
    envCache[name] = parsed;
    return parsed;
  } catch (error) {
    throw new Error(`Environment variable ${name} contains invalid JSON: ${error.message}`);
  }
};

export const clearEnvCache = () => {
  envCache = {};
};
