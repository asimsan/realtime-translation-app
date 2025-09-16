// Backend types for the translation service

export interface TranslationRequest {
  text?: string;
  audioData?: string; // base64 encoded audio
  sourceLanguage?: 'auto' | 'en' | 'ne';
  targetLanguage: 'en' | 'ne';
  sessionId?: string;
}

export interface TranslationResponse {
  success: boolean;
  translatedText?: string;
  audioData?: string; // base64 encoded audio response
  detectedLanguage?: string;
  sessionId?: string;
  error?: string;
}

export interface RealtimeSession {
  sessionId: string;
  userId?: string;
  openaiSessionId?: string;
  isActive: boolean;
  createdAt: Date;
  lastActivity: Date;
  config: {
    model: string;
    voice: string;
    sourceLanguage: string;
    targetLanguage: string;
  };
}

export interface OpenAIConfig {
  apiKey: string;
  model: string;
  voice: string;
  baseURL?: string;
}

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
  requestId: string;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetTime: Date;
}

export interface WebSocketMessage {
  type: 'audio' | 'text' | 'config' | 'error' | 'status';
  data: any;
  sessionId: string;
  timestamp: string;
}

export interface ServerConfig {
  port: number;
  corsOrigin: string[];
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };
  openai: OpenAIConfig;
  websocket: {
    port: number;
    heartbeatInterval: number;
  };
}
