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
        console.error('❌ WebSocket error details:', error);
        console.error('📡 WebSocket state during error:', this.ws?.readyState);
        this.onError(new Error('WebSocket connection error: ' + JSON.stringify(error)));
      };

      this.ws.onclose = (event) => {
        console.log(`🔌 Disconnected from OpenAI Realtime API`);
        console.log(`📊 Close code: ${event.code}`);
        console.log(`📝 Close reason: ${event.reason}`);
        console.log(`🔄 Was clean: ${event.wasClean}`);
        
        // Log common close codes
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

  // Removed getEphemeralKey method - now handled by backend

  private initializeSession(): void {
    if (!this.ws) {
      console.error('❌ Cannot initialize session: WebSocket is null');
      return;
    }

    if (this.ws.readyState !== WebSocket.OPEN) {
      console.error('❌ Cannot initialize session: WebSocket not open, state:', this.ws.readyState);
      return;
    }

    console.log('✅ Session already configured via ephemeral key endpoint');
    console.log('🔧 WebSocket connection ready for audio streaming');
    return; // Skip sending session config since it's already configured

    // Configure the session according to the new Realtime API documentation
    const sessionConfig = {
      type: 'session.update',
      session: {
        type: 'realtime',
        model: 'gpt-realtime',
        output_modalities: ['audio', 'text'],
        audio: {
          input: {
            format: {
              type: 'audio/pcm',
              rate: 24000
            },
            turn_detection: {
              type: 'server_vad'
            }
          },
          output: {
            format: {
              type: 'audio/pcm',
              rate: 24000
            },
            voice: 'alloy'
          }
        },
        instructions: `# Translation Agent

You are an expert real-time translator specializing in English and Nepali languages. You have deep cultural understanding of both languages and can capture nuances, emotions, and context.

## Core Task
Automatically detect whether the user is speaking in English or Nepali, then provide an accurate, natural translation to the other language. Maintain the original speaker's tone, emotion, and intent.

## Translation Rules
- If input is English: translate to Nepali (नेपाली)
- If input is Nepali: translate to English
- For mixed-language input: translate each part appropriately
- Preserve emotional tone and cultural context
- Maintain conversational flow across multiple exchanges

## Communication Style
- Natural and conversational
- Match the original speaker's formality level (casual vs formal)
- Preserve enthusiasm and energy levels
- Use appropriate cultural references for the target language
- Include natural speech patterns when appropriate

## Special Instructions
- If uncertain about cultural references, provide contextually appropriate equivalents
- For names and proper nouns, repeat them clearly for confirmation
- Maintain conversation context across multiple turns
- Respond promptly to maintain natural conversation flow`,
        tools: [],
        tool_choice: 'none',
        temperature: 0.3
      }
    };

    console.log('📤 Sending session config:', JSON.stringify(sessionConfig, null, 2));
    this.ws?.send(JSON.stringify(sessionConfig));
    console.log('✅ Session config sent successfully');
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

    // Create response with proper output_modalities structure
    const createResponse = {
      type: 'response.create',
      response: {
        output_modalities: ['text', 'audio'],
        instructions: 'Automatically detect the input language and translate appropriately. If English, translate to Nepali. If Nepali, translate to English. Provide both text and audio output.'
      }
    };

    this.ws.send(JSON.stringify(createResponse));
  }

  requestLanguageDetection(text: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const message = {
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: `Detect language and translate: "${text}"`
          }
        ]
      }
    };

    this.ws.send(JSON.stringify(message));

    // Create response for language detection
    const createResponse = {
      type: 'response.create',
      response: {
        output_modalities: ['text', 'audio'],
        instructions: 'First identify the language of the input text, then translate it appropriately. Format your response as: "[DETECTED: language] Translation: [translated text]". If English, translate to Nepali. If Nepali, translate to English.'
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
