// Backend service validation and health check utilities

import { BackendAPIService } from '../services/BackendAPIService';

export interface BackendHealthStatus {
  isHealthy: boolean;
  hasRealtimeAccess: boolean;
  backendReachable: boolean;
  error?: string;
}

export const validateBackendService = async (
  backendUrl: string = 'http://localhost:3001'
): Promise<BackendHealthStatus> => {
  try {
    console.log('🔍 Validating backend service...', { backendUrl });
    
    const apiService = new BackendAPIService(backendUrl);
    
    try {
      // Check if backend is reachable and healthy
      const healthData = await apiService.checkHealth();
      
      console.log('✅ Backend service is reachable and healthy');
      console.log('🔍 OpenAI status:', healthData.openai);
      
      return {
        isHealthy: true,
        hasRealtimeAccess: healthData.openai.hasRealtimeAccess,
        backendReachable: true,
        error: healthData.openai.error,
      };
      
    } catch (healthError) {
      console.error('❌ Backend health check failed:', healthError);
      
      // Try basic connectivity test
      try {
        const response = await fetch(`${backendUrl}/health`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        
        if (response.ok) {
          return {
            isHealthy: false,
            hasRealtimeAccess: false,
            backendReachable: true,
            error: 'Backend reachable but API health check failed',
          };
        } else {
          return {
            isHealthy: false,
            hasRealtimeAccess: false,
            backendReachable: true,
            error: `Backend returned status ${response.status}`,
          };
        }
      } catch (connectError) {
        return {
          isHealthy: false,
          hasRealtimeAccess: false,
          backendReachable: false,
          error: 'Cannot reach backend service',
        };
      }
    }
    
  } catch (error) {
    console.error('❌ Backend validation error:', error);
    return {
      isHealthy: false,
      hasRealtimeAccess: false,
      backendReachable: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

export const testRealtimeConnection = async (
  backendUrl: string = 'http://localhost:3001'
): Promise<{
  canConnect: boolean;
  error?: string;
}> => {
  try {
    console.log('🔗 Testing Realtime connection via backend...');
    
    const apiService = new BackendAPIService(backendUrl);
    
    // Check realtime status first
    const realtimeStatus = await apiService.checkRealtimeStatus();
    
    if (!realtimeStatus.available) {
      return {
        canConnect: false,
        error: realtimeStatus.error || 'Realtime API not available',
      };
    }
    
    // Try to get a token (this tests the full flow)
    try {
      await apiService.getRealtimeToken();
      console.log('✅ Realtime connection test successful');
      
      return {
        canConnect: true,
      };
    } catch (tokenError) {
      console.error('❌ Failed to get realtime token:', tokenError);
      
      return {
        canConnect: false,
        error: tokenError instanceof Error ? tokenError.message : 'Token generation failed',
      };
    }
    
  } catch (error) {
    console.error('❌ Realtime connection test error:', error);
    
    return {
      canConnect: false,
      error: error instanceof Error ? error.message : 'Connection test failed',
    };
  }
};

export const getBackendUrl = (): string => {
  // In development, use localhost
  if (__DEV__ || process.env.NODE_ENV === 'development') {
    return 'http://localhost:3001';
  }
  
  // In production, use environment variable or default
  return process.env.REACT_APP_BACKEND_URL || 'https://your-backend-domain.com';
};
