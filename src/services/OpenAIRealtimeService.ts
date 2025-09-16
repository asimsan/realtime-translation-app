import { OpenAIConfig, RealtimeMessage } from '../types';
import { BackendAPIService } from './BackendAPIService';

export class OpenAIRealtimeService {
  private ws: WebSocket | null = null;
  private backendAPI: BackendAPIService;
  private onMessage: (message: RealtimeMessage) => void;
  private onError: (error: Error) => void;

  constructor(
    config: OpenAIConfig,
    onMessage: (message: RealtimeMessage) => void,
    onError: (error: Error) => void
  ) {
    this.backendAPI = new BackendAPIService(config.backendUrl);
    this.onMessage = onMessage;
    this.onError = onError;
  }

  async connect(): Promise<void> {
    try {
      console.log('🔗 Connecting to Realtime API via backend...');
      
      // Step 1: Get ephemeral token from our backend
      console.log('🔑 Getting ephemeral token from backend...');
      const tokenData = await this.backendAPI.getRealtimeToken();
      
      // Step 2: Connect using ephemeral key via WebSocket subprotocols
      console.log('🌐 WebSocket URL:', tokenData.websocketUrl);
      console.log('🔑 Using ephemeral client secret for authentication');

      this.ws = new WebSocket(tokenData.websocketUrl, tokenData.protocols as any);

      this.ws.onopen = () => {
        console.log('✅ Connected to OpenAI Realtime API');
        console.log('📡 WebSocket state:', this.ws?.readyState);
        this.initializeSession();
      };

      this.ws.onmessage = (event) => {
        try {
          console.log('📨 Received message from API:', event.data);
          const message = JSON.parse(event.data);
          console.log('📋 Parsed message type:', message.type);
          this.onMessage(message);
        } catch (error) {
          console.error('❌ Error parsing message:', error);
          console.error('📄 Raw message data:', event.data);
        }
      };

      this.ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        this.onError(new Error('WebSocket connection error'));
      };

      this.ws.onclose = (event) => {
        console.log('🔌 WebSocket closed:', event.code, event.reason);
        
        const closeReasons: Record<number, string> = {
          1000: 'Normal closure',
          1001: 'Going away',
          1002: 'Protocol error',
          1003: 'Unsupported data',
          1006: 'Abnormal closure',
          1007: 'Invalid frame payload data',
          1008: 'Policy violation',
          1009: 'Message too big',
          1010: 'Mandatory extension',
          1011: 'Internal server error',
          1015: 'TLS handshake failure'
        };
        
        if (closeReasons[event.code]) {
          console.log(`🔍 Reason: ${closeReasons[event.code]}`);
        }
      };

    } catch (error) {
      this.onError(error as Error);
    }
  }

  private initializeSession(): void {
    if (!this.ws) {
      console.error('❌ Cannot initialize session: WebSocket is null');
      return;
    }

    if (this.ws.readyState !== WebSocket.OPEN) {
      console.error('❌ Cannot initialize session: WebSocket not open, state:', this.ws.readyState);
      return;
    }

    console.log('🔧 Initializing session for real-time translation...');
    
    // Configure session for translation with proper audio format
    const sessionConfig = {
      type: 'session.update',
      session: {
        type: 'realtime',
        model: 'gpt-realtime-2025-08-25',
        output_modalities: ['audio'],
        instructions: `You are a word-for-word TRANSLATION MACHINE. You NEVER engage in conversation.

ABSOLUTE RULES:
1. NEPALI input → Translate to ENGLISH exactly
2. GERMAN input → Translate to NEPALI exactly  
3. ENGLISH input → Translate to NEPALI exactly

CRITICAL: You are NOT a chatbot. You are a translation machine.

BEHAVIOR:
- Translate ONLY the exact words given
- NEVER add your own words
- NEVER respond to the meaning
- NEVER ask questions back
- NEVER engage with the content
- Act like Google Translate - just convert words

EXAMPLES:
Input: "I would like to say you something" → Output: "म तपाईंलाई केहि भन्न चाहन्छु"
(NOT "म तपाईंलाई केहि भन्न चाहन्छु। तपाईं के भन्न चाहनुहुन्छ?")

Input: "What do you want?" → Output: "तपाईं के चाहनुहुन्छ?"
(NOT "तपाईं के चाहनुहुन्छ? म तपाईंलाई मद्दत गर्न सक्छु।")

Input: "Can you help me?" → Output: "के तपाईं मलाई मद्दत गर्न सक्नुहुन्छ?"
(NOT answering the question - just translate it)

Input: "Kannst du mir helfen?" → Output: "के तपाईं मलाई मद्दत गर्न सक्नुहुन्छ?"

WRONG BEHAVIOR (NEVER DO THIS):
- Adding follow-up questions
- Responding to requests
- Engaging with the meaning
- Being helpful beyond translation

RIGHT BEHAVIOR (ALWAYS DO THIS):
- Translate the words exactly
- Stop after translation
- Say nothing extra

You are a machine. Not a person. Not a helper. Just a translator.`,
        tools: [],
        tool_choice: 'auto',
        max_output_tokens: 'inf',
        audio: {
          input: {
            format: {
              type: 'audio/pcm',
              rate: 24000
            },
            transcription: {
              model: "whisper-1"
            },
            turn_detection: {
              type: 'server_vad',
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 800,
              create_response: true,
              interrupt_response: true
            }
          },
          output: {
            format: {
              type: 'audio/pcm',
              rate: 24000
            },
            voice: 'alloy',
            speed: 1.0
          }
        }
      }
    };

    console.log('📡 Sending session configuration:', sessionConfig);
    this.ws.send(JSON.stringify(sessionConfig));
    console.log('✅ Session configured for real-time translation');
  }

  sendAudioData(audioData: ArrayBuffer): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('⚠️  WebSocket not connected, state:', this.ws?.readyState);
      return;
    }

    console.log(`📤 Sending audio data: ${audioData.byteLength} bytes`);

    // Convert audio data to base64 using proper chunking for large buffers
    const uint8Array = new Uint8Array(audioData);
    let binary = '';
    const chunkSize = 0x8000; // 32KB chunks to avoid stack overflow
    
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.subarray(i, i + chunkSize);
      binary += String.fromCharCode.apply(null, Array.from(chunk));
    }
    
    const base64Audio = btoa(binary);

    const message = {
      type: 'input_audio_buffer.append',
      audio: base64Audio
    };

    console.log(`📡 WebSocket state: ${this.ws.readyState} (1=OPEN), sending ${base64Audio.length} base64 chars`);
    this.ws.send(JSON.stringify(message));
    console.log('✅ Audio data sent to OpenAI');
  }

  commitAudioBuffer(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const message = {
      type: 'input_audio_buffer.commit'
    };

    this.ws.send(JSON.stringify(message));
  }

  clearAudioBuffer(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const message = {
      type: 'input_audio_buffer.clear'
    };

    this.ws.send(JSON.stringify(message));
  }

  requestTranslation(text: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const message = {
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: `Translate this text: "${text}"`
          }
        ]
      }
    };

    this.ws.send(JSON.stringify(message));
    
    // Request response
    const createResponse = {
      type: 'response.create',
      response: {
        modalities: ['text', 'audio'],
        instructions: 'Provide only the translation without explanation.'
      }
    };

    this.ws.send(JSON.stringify(createResponse));
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
