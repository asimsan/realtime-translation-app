import { OpenAIRealtimeService } from './OpenAIRealtimeService';
import { AudioRecordingService } from './AudioRecordingService';
import { WebAudioRecordingService } from './WebAudioRecordingService';
import { TextToSpeechService } from './TextToSpeechService';
import { AudioSessionManager, AudioMode } from './AudioSessionManager';
import { performanceMonitor } from '../utils/PerformanceMonitor';
import { TranslationState, OpenAIConfig, RealtimeMessage } from '../types';
import { Platform } from 'react-native';

export class TranslationService {
  private openaiService: OpenAIRealtimeService;
  private audioService: AudioRecordingService | WebAudioRecordingService;
  private ttsService: TextToSpeechService;
  private audioSessionManager: AudioSessionManager;
  private state: TranslationState;
  private onStateChange: (state: TranslationState) => void;

  constructor(
    config: OpenAIConfig,
    onStateChange: (state: TranslationState) => void
  ) {
    this.onStateChange = onStateChange;
    
    this.state = {
      isRecording: false,
      isTranslating: false,
      isPlaying: false,
      currentText: '',
      translatedText: '',
      error: null
    };

    // Initialize services
    this.audioSessionManager = new AudioSessionManager();
    this.ttsService = new TextToSpeechService();
    
    // Use different audio service based on platform
    console.log('🔍 Platform.OS:', Platform.OS);
    if (Platform.OS === 'web') {
      console.log('🌐 Using WebAudioRecordingService for web platform');
      this.audioService = new WebAudioRecordingService(this.handleAudioData.bind(this));
    } else {
      console.log('📱 Using AudioRecordingService for native platform');
      this.audioService = new AudioRecordingService(this.handleAudioData.bind(this));
    }
    
    this.openaiService = new OpenAIRealtimeService(
      config,
      this.handleRealtimeMessage.bind(this),
      this.handleError.bind(this)
    );
  }

  async initialize(): Promise<void> {
    try {
      // Initialize audio session manager first
      await this.audioSessionManager.initialize();
      
      // Optimize for AirPods and enable echo cancellation
      await this.audioSessionManager.optimizeForAirPods();
      await this.audioSessionManager.enableEchoCancellation();

      // Request permissions
      const permissions = await this.audioService.requestPermissions();
      if (!permissions.microphone) {
        throw new Error('Microphone permission is required');
      }

      // Connect to OpenAI Realtime API
      await this.openaiService.connect();
      
      this.updateState({ error: null });
    } catch (error) {
      this.handleError(error as Error);
    }
  }

  async startTranslation(): Promise<void> {
    console.log('🎵 TranslationService.startTranslation() called');
    try {
      if (this.state.isRecording) {
        console.warn('⚠️  Translation already in progress');
        return;
      }

      console.log('🔧 Setting audio mode to recording...');
      // Set audio mode to recording with echo cancellation
      await this.audioSessionManager.setMode(AudioMode.Recording);
      console.log('✅ Audio mode set to recording');

      console.log('🔄 Updating state to recording...');
      this.updateState({ 
        isRecording: true, 
        error: null,
        currentText: '',
        translatedText: ''
      });
      console.log('✅ State updated to recording');

      // Start performance monitoring
      performanceMonitor.trackTranslationStart();

      console.log('🎤 Starting audio service recording...');
      await this.audioService.startRecording();
      console.log('✅ Audio service recording started');
      console.log('🎵 Translation started with echo cancellation');

    } catch (error) {
      console.error('❌ Error in startTranslation:', error);
      this.handleError(error as Error);
      this.updateState({ isRecording: false });
    }
  }

  async stopTranslation(): Promise<void> {
    try {
      if (!this.state.isRecording) {
        console.warn('Not currently recording');
        return;
      }

      // Stop recording and commit audio buffer for final processing
      await this.audioService.stopRecording();
      this.openaiService.commitAudioBuffer();
      
      this.updateState({ 
        isRecording: false,
        isTranslating: true 
      });

      console.log('Translation stopped, processing final audio...');

    } catch (error) {
      this.handleError(error as Error);
      this.updateState({ 
        isRecording: false, 
        isTranslating: false 
      });
    }
  }

  private handleAudioData(audioData: ArrayBuffer): void {
    if (this.state.isRecording) {
      console.log(`📡 Sending audio data: ${audioData.byteLength} bytes`);
      
      // Track audio capture performance
      performanceMonitor.trackAudioCaptured();
      
      // Send audio data to OpenAI Realtime API
      this.openaiService.sendAudioData(audioData);
    }
  }

  private handleRealtimeMessage(message: RealtimeMessage): void {
    console.log('Realtime message:', message.type);

    switch (message.type) {
      case 'session.created':
        console.log('Session created successfully');
        break;

      case 'session.updated':
        console.log('Session updated successfully');
        break;

      case 'input_audio_buffer.speech_started':
        console.log('Speech detected');
        break;

      case 'input_audio_buffer.speech_stopped':
        console.log('Speech ended');
        // With semantic VAD, the API will automatically handle audio buffer commits
        break;

      case 'input_audio_buffer.committed':
        console.log('Audio buffer committed');
        break;

      case 'conversation.item.added':
      case 'conversation.item.created' as any: // Support both GA and beta names
        console.log('Conversation item added/created');
        // Extract transcription if available
        if (message.item?.content?.[0]?.transcript) {
          this.updateState({ currentText: message.item.content[0].transcript });
          console.log('Transcription:', message.item.content[0].transcript);
        }
        break;

      case 'response.created':
        console.log('Response creation started');
        this.updateState({ isTranslating: true });
        break;

      case 'response.output_text.delta':
      case 'response.text.delta' as any: // Support both GA and beta names
        if (message.delta) {
          const currentTranslated = this.state.translatedText + message.delta;
          this.updateState({ translatedText: currentTranslated });
          
          // Track translation received
          performanceMonitor.trackTranslationReceived();
        }
        break;

      case 'response.output_audio.delta':
      case 'response.audio.delta' as any: // Support both GA and beta names
        if (message.delta) {
          // Handle streaming audio response
          this.handleAudioResponse(message.delta);
        }
        break;

      case 'response.output_audio_transcript.delta':
      case 'response.audio_transcript.delta' as any: // Support both GA and beta names
        if (message.delta) {
          // This is the transcript of what the model is saying
          console.log('Audio transcript delta:', message.delta);
        }
        break;

      case 'response.done':
        this.updateState({ 
          isTranslating: false,
          isPlaying: false 
        });
        
        // Track TTS completion and log performance
        performanceMonitor.trackTTSComplete();
        performanceMonitor.logPerformanceIssues();
        
        console.log('Translation completed');
        break;

      case 'error':
        const errorMessage = message.error?.message || 'Unknown error';
        console.error('API Error:', message.error);
        this.handleError(new Error(errorMessage));
        break;

      case 'rate_limits.updated':
        console.log('Rate limits updated:', message.rate_limits);
        break;

      default:
        console.log('Unhandled message type:', message.type);
    }
  }

  private async handleAudioResponse(audioBase64: string): Promise<void> {
    try {
      // Convert base64 audio to ArrayBuffer
      const binaryString = atob(audioBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const audioBuffer = bytes.buffer;

      // Play the audio response
      if (!this.state.isPlaying) {
        this.updateState({ isPlaying: true });
        await this.ttsService.playAudioBuffer(audioBuffer);
      }

    } catch (error) {
      console.error('Error handling audio response:', error);
    }
  }

  async speakTranslation(text?: string): Promise<void> {
    try {
      const textToSpeak = text || this.state.translatedText;
      if (!textToSpeak) {
        console.warn('No text to speak');
        return;
      }

      // Set audio mode to playback to prevent feedback
      await this.audioSessionManager.setMode(AudioMode.Playback);

      this.updateState({ isPlaying: true });
      await this.ttsService.speakNepali(textToSpeak);
      this.updateState({ isPlaying: false });

      // Return to idle mode after playback
      await this.audioSessionManager.setMode(AudioMode.Idle);

    } catch (error) {
      this.handleError(error as Error);
      this.updateState({ isPlaying: false });
    }
  }

  async stop(): Promise<void> {
    try {
      await this.audioService.cleanup();
      await this.ttsService.stop();
      this.openaiService.disconnect();
      await this.audioSessionManager.cleanup();
      
      this.updateState({
        isRecording: false,
        isTranslating: false,
        isPlaying: false,
        error: null
      });

    } catch (error) {
      this.handleError(error as Error);
    }
  }

  private handleError(error: Error): void {
    console.error('Translation service error:', error);
    this.updateState({ 
      error: error.message,
      isRecording: false,
      isTranslating: false,
      isPlaying: false
    });
  }

  private updateState(updates: Partial<TranslationState>): void {
    this.state = { ...this.state, ...updates };
    this.onStateChange(this.state);
  }

  getState(): TranslationState {
    return { ...this.state };
  }
}
