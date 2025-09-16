// Backend API service for communicating with our translation server

interface BackendConfig {
  baseUrl: string;
  sessionId: string;
}

interface APIResponse<T = any> {
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

interface TranslationRequest {
  text: string;
  sourceLanguage?: 'auto' | 'en' | 'ne';
  targetLanguage: 'en' | 'ne';
}

interface TranslationResponse {
  success: boolean;
  translatedText?: string;
  audioData?: string;
  detectedLanguage?: string;
  sessionId?: string;
  error?: string;
}

interface RealtimeTokenResponse {
  clientSecret: string;
  expiresAt: string;
  websocketUrl: string;
  protocols: string[];
  sessionId: string;
}

export class BackendAPIService {
  private config: BackendConfig;

  constructor(baseUrl: string = 'http://localhost:3001') {
    this.config = {
      baseUrl,
      sessionId: this.generateSessionId(),
    };
  }

  private generateSessionId(): string {
    return 'session_' + Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }

  private getHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      'X-Session-ID': this.config.sessionId,
    };
  }

  private async makeRequest<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<APIResponse<T>> {
    try {
      const url = `${this.config.baseUrl}${endpoint}`;
      
      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.getHeaders(),
          ...options.headers,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || `HTTP ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('Backend API request failed:', error);
      throw error;
    }
  }

  // Health check
  async checkHealth(): Promise<{
    status: string;
    openai: {
      isValid: boolean;
      hasRealtimeAccess: boolean;
      error?: string;
    };
    version: string;
  }> {
    const response = await this.makeRequest<any>('/api/translation/health');
    return response.data;
  }

  // Text translation
  async translateText(request: TranslationRequest): Promise<TranslationResponse> {
    console.log('🌐 Sending translation request to backend...', {
      textLength: request.text.length,
      sourceLanguage: request.sourceLanguage,
      targetLanguage: request.targetLanguage,
    });

    const response = await this.makeRequest<TranslationResponse>('/api/translation/text', {
      method: 'POST',
      body: JSON.stringify(request),
    });

    if (!response.success) {
      throw new Error(response.error?.message || 'Translation failed');
    }

    console.log('✅ Translation completed successfully');
    return response.data!;
  }

  // Get ephemeral token for Realtime API
  async getRealtimeToken(): Promise<RealtimeTokenResponse> {
    console.log('🔑 Requesting realtime token from backend...', {
      sessionId: this.config.sessionId,
    });

    const response = await this.makeRequest<RealtimeTokenResponse>('/api/realtime/token', {
      method: 'POST',
    });

    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to get realtime token');
    }

    console.log('✅ Realtime token obtained successfully');
    return response.data!;
  }

  // Check realtime status
  async checkRealtimeStatus(): Promise<{
    available: boolean;
    basicAccess: boolean;
    error?: string;
  }> {
    const response = await this.makeRequest<any>('/api/realtime/status');
    return response.data;
  }

  // Get session ID
  getSessionId(): string {
    return this.config.sessionId;
  }

  // Update base URL (useful for switching between dev/prod)
  updateBaseUrl(baseUrl: string): void {
    this.config.baseUrl = baseUrl;
  }
}
