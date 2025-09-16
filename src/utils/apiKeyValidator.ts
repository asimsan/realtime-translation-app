// Utility to validate OpenAI API key by requesting an ephemeral Realtime client secret

export const validateOpenAIApiKey = async (apiKey: string): Promise<{
  isValid: boolean;
  hasRealtimeAccess: boolean;
  error?: string;
}> => {
  try {
    console.log('🔍 Validating API key via Realtime client secret...');

    const sessionConfig = {
      session: {
        type: 'realtime',
        model: 'gpt-realtime',
        audio: {
          input: {
            format: { type: 'audio/pcm', rate: 24000 },
            turn_detection: { type: 'server_vad' },
          },
          output: {
            voice: 'alloy',
            format: { type: 'audio/pcm', rate: 24000 },
          },
        },
      },
    };

    const response = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sessionConfig),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API Key validation failed:', response.status, errorText);

      if (response.status === 401) {
        return {
          isValid: false,
          hasRealtimeAccess: false,
          error: 'Unauthorized (401): Invalid or revoked API key',
        };
      }

      if (response.status === 403) {
        return {
          isValid: true,
          hasRealtimeAccess: false,
          error: 'Forbidden (403): API key lacks Realtime access. Enable Realtime or use a key with access.',
        };
      }

      return {
        isValid: false,
        hasRealtimeAccess: false,
        error: `HTTP ${response.status}: ${errorText}`,
      };
    }

    const data = await response.json();
    const ephemeral = data?.value;
    const hasRealtimeAccess = typeof ephemeral === 'string' && ephemeral.length > 0;

    console.log('✅ API key usable for Realtime:', hasRealtimeAccess);

    return {
      isValid: true,
      hasRealtimeAccess,
      error: hasRealtimeAccess ? undefined : 'Realtime client secret not returned',
    };
  } catch (error) {
    console.error('❌ API key validation error:', error);
    return {
      isValid: false,
      hasRealtimeAccess: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

export const testRealtimeConnection = async (apiKey: string): Promise<{
  canConnect: boolean;
  error?: string;
}> => {
  return new Promise(async (resolve) => {
    console.log('🔗 Testing Realtime WebSocket connection via ephemeral key...');

    let ws: WebSocket | null = null;
    let isResolved = false;

    try {
      const sessionConfig = {
        session: {
          type: 'realtime',
          model: 'gpt-realtime',
        },
      };

      const tokenResponse = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sessionConfig),
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error('❌ Failed to obtain ephemeral key for test:', tokenResponse.status, errorText);
        resolve({ canConnect: false, error: `Ephemeral key error: ${tokenResponse.status}` });
        return;
      }

      const tokenData = await tokenResponse.json();
      const clientSecret: string | undefined = tokenData?.value;
      if (!clientSecret) {
        resolve({ canConnect: false, error: 'No ephemeral key returned' });
        return;
      }

      const url = 'wss://api.openai.com/v1/realtime?model=gpt-realtime';
      const protocols = ['realtime', `openai-insecure-api-key.${clientSecret}`];

      ws = new WebSocket(url, protocols as any);

      const timeout = setTimeout(() => {
        if (!isResolved) {
          console.error('❌ WebSocket connection timeout');
          try { ws?.close(); } catch {}
          isResolved = true;
          resolve({ canConnect: false, error: 'Connection timeout (10s)' });
        }
      }, 10000);

      ws.onopen = () => {
        console.log('✅ Realtime WebSocket connection successful');
        clearTimeout(timeout);
        if (!isResolved) {
          try { ws?.close(); } catch {}
          isResolved = true;
          resolve({ canConnect: true });
        }
      };

      ws.onerror = (error) => {
        console.error('❌ WebSocket connection failed:', error);
        clearTimeout((error as any)?.timeoutId);
        if (!isResolved) {
          isResolved = true;
          resolve({ canConnect: false, error: 'WebSocket connection failed' });
        }
      };

      ws.onclose = (event) => {
        console.log('🔌 WebSocket closed during test:', event.code, event.reason);
        if (!isResolved) {
          isResolved = true;
          if (event.code === 1000) {
            resolve({ canConnect: true });
          } else {
            resolve({ canConnect: false, error: `Closed ${event.code}: ${event.reason}` });
          }
        }
      };
    } catch (error) {
      console.error('❌ Realtime connection test error:', error);
      if (!isResolved) {
        isResolved = true;
        resolve({ canConnect: false, error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }
  });
};
