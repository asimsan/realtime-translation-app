// Debug helpers for troubleshooting the translation app

export const testMicrophoneAccess = async (): Promise<boolean> => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    console.log('✅ Microphone access granted');
    stream.getTracks().forEach(track => track.stop());
    return true;
  } catch (error) {
    console.error('❌ Microphone access denied:', error);
    return false;
  }
};

export const testWebSocketConnection = async (apiKey: string): Promise<boolean> => {
  return new Promise((resolve) => {
    const ws = new WebSocket(`wss://api.openai.com/v1/realtime?model=gpt-realtime&authorization=Bearer%20${encodeURIComponent(apiKey)}&openai-beta=realtime%3Dv1`);
    
    const timeout = setTimeout(() => {
      console.error('❌ WebSocket connection timeout');
      ws.close();
      resolve(false);
    }, 10000);
    
    ws.onopen = () => {
      console.log('✅ WebSocket connection successful');
      clearTimeout(timeout);
      ws.close();
      resolve(true);
    };
    
    ws.onerror = (error) => {
      console.error('❌ WebSocket connection failed:', error);
      clearTimeout(timeout);
      resolve(false);
    };
  });
};

export const logSystemInfo = () => {
  console.log('🔍 System Information:');
  console.log('- Platform:', navigator.platform);
  console.log('- User Agent:', navigator.userAgent);
  console.log('- AudioContext support:', !!(window.AudioContext || (window as any).webkitAudioContext));
  console.log('- MediaDevices support:', !!navigator.mediaDevices);
  console.log('- getUserMedia support:', !!navigator.mediaDevices?.getUserMedia);
};

export const testAudioContextCreation = (): boolean => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const audioContext = new AudioContextClass();
    audioContext.close();
    console.log('✅ AudioContext creation successful');
    return true;
  } catch (error) {
    console.error('❌ AudioContext creation failed:', error);
    return false;
  }
};
