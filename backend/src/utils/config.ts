import dotenv from 'dotenv';
import { ServerConfig } from '@/types';

// Load environment variables
dotenv.config();

const getEnvVar = (name: string, defaultValue?: string): string => {
  const value = process.env[name];
  if (!value && !defaultValue) {
    throw new Error(`Environment variable ${name} is required`);
  }
  return value || defaultValue!;
};

const getEnvNumber = (name: string, defaultValue?: number): number => {
  const value = process.env[name];
  if (!value && defaultValue === undefined) {
    throw new Error(`Environment variable ${name} is required`);
  }
  return value ? parseInt(value, 10) : defaultValue!;
};

const getEnvArray = (name: string, defaultValue: string[] = []): string[] => {
  const value = process.env[name];
  if (!value) return defaultValue;
  return value.split(',').map(item => item.trim());
};

export const config: ServerConfig = {
  port: getEnvNumber('PORT', 3001),
  corsOrigin: getEnvArray('CORS_ORIGIN', ['http://localhost:8081']),
  rateLimit: {
    windowMs: getEnvNumber('RATE_LIMIT_WINDOW_MS', 900000), // 15 minutes
    maxRequests: getEnvNumber('RATE_LIMIT_MAX_REQUESTS', 100),
  },
  openai: {
    apiKey: getEnvVar('OPENAI_API_KEY'),
    model: getEnvVar('REALTIME_MODEL', 'gpt-realtime'),
    voice: getEnvVar('REALTIME_VOICE', 'alloy'),
    baseURL: process.env.OPENAI_BASE_URL,
  },
  websocket: {
    port: getEnvNumber('WS_PORT', 3002),
    heartbeatInterval: getEnvNumber('WS_HEARTBEAT_INTERVAL', 30000),
  },
};

export const isDevelopment = process.env.NODE_ENV === 'development';
export const isProduction = process.env.NODE_ENV === 'production';
export const logLevel = getEnvVar('LOG_LEVEL', 'info');
