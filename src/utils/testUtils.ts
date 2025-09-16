import { OpenAIConfig } from '../types';

export const validateOpenAIKey = async (apiKey: string): Promise<boolean> => {
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });
    
    return response.status === 200;
  } catch (error) {
    console.error('API key validation failed:', error);
    return false;
  }
};

export const testRealtimeConnection = async (config: OpenAIConfig): Promise<boolean> => {
  return new Promise((resolve) => {
    try {
      const ws = new WebSocket(`wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01&authorization=Bearer%20${encodeURIComponent(config.apiKey)}&openai-beta=realtime%3Dv1`);

      const timeout = setTimeout(() => {
        ws.close();
        resolve(false);
      }, 5000);

      ws.onopen = () => {
        clearTimeout(timeout);
        ws.close();
        resolve(true);
      };

      ws.onerror = () => {
        clearTimeout(timeout);
        resolve(false);
      };

    } catch (error) {
      console.error('Realtime connection test failed:', error);
      resolve(false);
    }
  });
};

export const getLatencyOptimizations = () => ({
  audioChunkSize: 100, // ms
  maxLatency: 700, // ms target
  bufferSize: 1024, // bytes
  sampleRate: 16000, // Hz
  channels: 1, // mono
});

export const getRecommendedSettings = () => ({
  speakingRate: 0.8, // Slightly slower for better comprehension
  pauseDetection: 500, // ms of silence to detect end of speech
  volumeThreshold: 0.1, // Minimum volume to start recording
  echoCancellation: true,
  noiseSuppression: true,
});
