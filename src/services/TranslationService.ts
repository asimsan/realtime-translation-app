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
  private audioChunks: Uint8Array[] = [];
  private isAccumulatingAudio: boolean = false;
  private responseTimeout: NodeJS.Timeout | null = null;

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
      console.log('🎧 LIVE TRANSLATION SETUP');
      console.log('📋 Required setup for optimal experience:');
      console.log('  1. Connect your AirPods to your Mac');
      console.log('  2. Set system audio output to AirPods');
      console.log('  3. Keep MacBook microphone as input');
      console.log('  4. This creates isolated input/output channels');
      
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
      
      console.log('✅ Live translation system initialized');
      console.log('🎤 Source: MacBook microphone');
      console.log('🎧 Output: AirPods (translated audio only)');
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
      console.log('🛑 Stopping translation...');
      
      // Stop recording
      await this.audioService.stopRecording();
      
      // Reset to idle state immediately
      this.updateState({ 
        isRecording: false,
        isTranslating: false,
        isPlaying: false
      });

      // Clear any accumulated audio chunks and timeouts
      this.audioChunks = [];
      this.isAccumulatingAudio = false;
      
      if (this.responseTimeout) {
        clearTimeout(this.responseTimeout);
        this.responseTimeout = null;
      }


      console.log('✅ Translation stopped and reset to idle state');

    } catch (error) {
      this.handleError(error as Error);
      this.updateState({ 
        isRecording: false, 
        isTranslating: false,
        isPlaying: false
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
    console.log('Realtime message:', message.type, message);

    switch (message.type) {
      case 'session.created':
        console.log('Session created successfully');
        break;

      case 'session.updated':
        console.log('Session updated successfully');
        break;

      case 'input_audio_buffer.speech_started':
        console.log('🎤 Speech detected - clearing previous transcription');
        // Clear previous transcription when new speech starts
        this.updateState({ currentText: '', translatedText: '' });
        break;

      case 'input_audio_buffer.speech_stopped':
        console.log('Speech ended');
        // With semantic VAD, the API will automatically handle audio buffer commits
        break;

      case 'input_audio_buffer.committed':
        console.log('Audio buffer committed');
        break;

      case 'input_audio_buffer.transcription.completed':
        console.log('🎤 Input transcription completed:', message.transcript || message);
        const transcript = message.transcript || (message as any).transcript;
        if (transcript) {
          this.updateState({ currentText: transcript });
          // Detect language of the transcription
          const isNepali = /[\u0900-\u097F]/.test(transcript);
          const isGerman = /[äöüß]/.test(transcript.toLowerCase()) || 
                          /\b(ich|du|er|sie|es|wir|ihr|und|oder|aber|mit|von|zu|auf|für|ist|sind|hat|haben|wird|werden|der|die|das|den|dem|des|ein|eine|einen|einem|einer|eines)\b/.test(transcript.toLowerCase());
          const detectedLang = isNepali ? 'Nepali' : (isGerman ? 'German' : 'English');
          console.log(`✅ User said in ${detectedLang}:`, transcript);
        } else {
          console.warn('❌ No transcript found in transcription.completed message');
          console.log('🔍 Full message object:', JSON.stringify(message, null, 2));
        }
        break;

      case 'input_audio_buffer.transcription.delta':
        console.log('🎤 Input transcription delta:', message.delta || message);
        const delta = message.delta || (message as any).delta;
        if (delta) {
          // Update with streaming transcription
          const currentTranscript = this.state.currentText + delta;
          this.updateState({ currentText: currentTranscript });
          // Detect language of the current transcript
          const isNepali = /[\u0900-\u097F]/.test(currentTranscript);
          const isGerman = /[äöüß]/.test(currentTranscript.toLowerCase()) || 
                          /\b(ich|du|er|sie|es|wir|ihr|und|oder|aber|mit|von|zu|auf|für|ist|sind|hat|haben|wird|werden|der|die|das|den|dem|des|ein|eine|einen|einem|einer|eines)\b/.test(currentTranscript.toLowerCase());
          const detectedLang = isNepali ? 'Nepali' : (isGerman ? 'German' : 'English');
          console.log(`📝 Streaming transcript in ${detectedLang}:`, currentTranscript);
        }
        break;

      case 'conversation.item.added':
      case 'conversation.item.created' as any: // Support both GA and beta names
        console.log('Conversation item added/created');
        // Extract transcription if available
        if (message.item?.content?.[0]?.transcript) {
          this.updateState({ currentText: message.item.content[0].transcript });
          console.log('📝 Conversation transcription:', message.item.content[0].transcript);
        }
        // Also check for text content
        if (message.item?.content?.[0]?.text) {
          this.updateState({ currentText: message.item.content[0].text });
          console.log('📝 Conversation text:', message.item.content[0].text);
        }
        break;

      case 'conversation.item.input_audio_transcription.completed':
        console.log('🎤 Input audio transcription completed via conversation item:', message);
        const audioTranscript = (message as any).transcript || (message as any).item?.content?.[0]?.transcript;
        if (audioTranscript) {
          this.updateState({ currentText: audioTranscript });
          console.log('✅ User said (via conversation):', audioTranscript);
        }
        break;

      case 'conversation.item.input_audio_transcription.failed':
        console.warn('❌ Input audio transcription failed:', message);
        break;

      case 'response.created':
        console.log('Response creation started');
        this.updateState({ isTranslating: true });
        // Start accumulating audio for this response
        this.audioChunks = [];
        this.isAccumulatingAudio = true;
        
        // Set a safety timeout to reset state if response doesn't complete
        if (this.responseTimeout) {
          clearTimeout(this.responseTimeout);
        }
        this.responseTimeout = setTimeout(() => {
          console.warn('⏰ Response timeout - resetting to idle state');
          this.updateState({ 
            isTranslating: false,
            isPlaying: false 
          });
          this.isAccumulatingAudio = false;
          this.audioChunks = [];
        }, 10000); // 10 second timeout
        break;

      case 'response.output_text.delta':
      case 'response.text.delta' as any: // Support both GA and beta names
        if (message.delta) {
          const currentTranslated = this.state.translatedText + message.delta;
          this.updateState({ translatedText: currentTranslated });
          console.log('📝 Text translation delta:', message.delta);
          
          // Track translation received
          performanceMonitor.trackTranslationReceived();
        }
        break;

      case 'response.output_audio.delta':
      case 'response.audio.delta' as any: // Support both GA and beta names
        if (message.delta && this.isAccumulatingAudio) {
          // Accumulate audio chunks instead of playing each small chunk
          this.accumulateAudioChunk(message.delta);
        }
        break;

      case 'response.output_audio_transcript.delta':
      case 'response.audio_transcript.delta' as any: // Support both GA and beta names
        if (message.delta) {
          // This is the transcript of what the AI is saying (translated audio)
          const currentTranslated = this.state.translatedText + message.delta;
          this.updateState({ translatedText: currentTranslated });
          // Detect language of the translated output
          const isNepali = /[\u0900-\u097F]/.test(currentTranslated);
          const isGerman = /[äöüß]/.test(currentTranslated.toLowerCase()) || 
                          /\b(ich|du|er|sie|es|wir|ihr|und|oder|aber|mit|von|zu|auf|für|ist|sind|hat|haben|wird|werden|der|die|das|den|dem|des|ein|eine|einen|einem|einer|eines)\b/.test(currentTranslated.toLowerCase());
          const detectedLang = isNepali ? 'Nepali' : (isGerman ? 'German' : 'English');
          console.log(`🔊 Audio transcript delta in ${detectedLang}:`, message.delta);
          console.log(`📝 Updated translated text in ${detectedLang}:`, currentTranslated);
        }
        break;

      case 'response.done':
        // Clear the response timeout
        if (this.responseTimeout) {
          clearTimeout(this.responseTimeout);
          this.responseTimeout = null;
        }
        
        this.updateState({ 
          isTranslating: false,
          isPlaying: false 
        });
        
        // Play accumulated audio when response is complete
        if (this.audioChunks.length > 0) {
          this.playAccumulatedAudio();
        }
        this.isAccumulatingAudio = false;
        
        // Track TTS completion and log performance
        performanceMonitor.trackTTSComplete();
        performanceMonitor.logPerformanceIssues();
        
        console.log('Translation completed');
        break;

      case 'error':
        const errorMessage = message.error?.message || 'Unknown error';
        console.error('API Error:', message.error);
        
        // Handle specific audio buffer errors more gracefully
        if (errorMessage.includes('buffer too small') || errorMessage.includes('Expected at least 100ms')) {
          console.warn('Audio buffer too small, continuing...');
          return; // Don't treat as fatal error
        }
        
        this.handleError(new Error(errorMessage));
        break;

      case 'rate_limits.updated':
        console.log('Rate limits updated:', message.rate_limits);
        break;

      default:
        console.log('Unhandled message type:', message.type, message);
        
        // Try to extract any text content from unhandled messages
        if ((message as any).transcript) {
          console.log('🔍 Found transcript in unhandled message:', (message as any).transcript);
          // Check if it's likely a user transcript (shorter) vs AI transcript (longer)
          if (!(message as any).transcript.includes('translation') && 
              (message as any).transcript.length < 200 && 
              (!this.state.currentText || this.state.currentText === 'Listening...')) {
            this.updateState({ currentText: (message as any).transcript });
          } else if (!this.state.translatedText) {
            this.updateState({ translatedText: (message as any).transcript });
          }
        }
        if ((message as any).text) {
          console.log('🔍 Found text in unhandled message:', (message as any).text);
          if (!this.state.translatedText) {
            this.updateState({ translatedText: (message as any).text });
          }
        }
    }
  }

  private async handleAudioResponse(audioBase64: string): Promise<void> {
    try {
      // CRITICAL: Stop recording during playback to prevent feedback
      const wasRecording = this.state.isRecording;
      if (wasRecording) {
        console.log('🔇 Temporarily stopping recording to prevent audio feedback');
        await this.audioService.stopRecording();
        this.updateState({ isRecording: false });
      }

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
        
        // Resume recording after playback if it was active
        if (wasRecording) {
          console.log('🎤 Resuming recording after playback');
          setTimeout(async () => {
            await this.audioService.startRecording();
            this.updateState({ isRecording: true });
          }, 100); // Small delay to avoid overlap
        }
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
    
    // Clear any pending timeouts
    if (this.responseTimeout) {
      clearTimeout(this.responseTimeout);
      this.responseTimeout = null;
    }

    
    // Reset all states
    this.audioChunks = [];
    this.isAccumulatingAudio = false;
    
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

  private accumulateAudioChunk(audioBase64: string): void {
    try {
      // Convert base64 to Uint8Array and store
      const binaryString = atob(audioBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      this.audioChunks.push(bytes);
      console.log(`📦 Accumulated audio chunk: ${bytes.length} bytes, total chunks: ${this.audioChunks.length}`);
    } catch (error) {
      console.error('Error accumulating audio chunk:', error);
    }
  }

  private async playAccumulatedAudio(): Promise<void> {
    try {
      if (this.audioChunks.length === 0) {
        console.warn('No audio chunks to play');
        return;
      }

      // Calculate total length
      const totalLength = this.audioChunks.reduce((sum, chunk) => sum + chunk.length, 0);
      console.log(`🔊 Playing accumulated audio: ${this.audioChunks.length} chunks, ${totalLength} bytes total`);

      // Combine all chunks into single buffer
      const combinedBuffer = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of this.audioChunks) {
        combinedBuffer.set(chunk, offset);
        offset += chunk.length;
      }

      // Stop recording during playback to prevent feedback
      const wasRecording = this.state.isRecording;
      if (wasRecording) {
        console.log('🔇 Temporarily stopping recording to prevent audio feedback');
        await this.audioService.stopRecording();
        this.updateState({ isRecording: false });
      }

      // Play the combined audio
      this.updateState({ isPlaying: true });
      await this.ttsService.playAudioBuffer(combinedBuffer.buffer);
      this.updateState({ isPlaying: false });

      // Resume recording after playback if it was active
      if (wasRecording) {
        console.log('🎤 Resuming recording after playback');
        setTimeout(async () => {
          await this.audioService.startRecording();
          this.updateState({ isRecording: true });
        }, 100);
      }

      // Clear accumulated chunks
      this.audioChunks = [];

    } catch (error) {
      console.error('Error playing accumulated audio:', error);
      this.updateState({ isPlaying: false });
    }
  }
}
