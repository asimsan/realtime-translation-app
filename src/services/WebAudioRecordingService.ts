import { AudioPermissions } from '../types';

export class WebAudioRecordingService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private isRecording: boolean = false;
  private onAudioData: (audioData: ArrayBuffer) => void;
  private stream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;

  constructor(onAudioData: (audioData: ArrayBuffer) => void) {
    this.onAudioData = onAudioData;
  }

  async requestPermissions(): Promise<AudioPermissions> {
    try {
      console.log('🎤 Requesting microphone permissions for live translation...');
      
      // Get available audio devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter(device => device.kind === 'audioinput');
      
      console.log('🔍 Available audio input devices:');
      audioInputs.forEach((device, index) => {
        console.log(`  ${index}: ${device.label || 'Unknown Device'} (${device.deviceId})`);
      });

      // Try to find MacBook's built-in microphone
      const macbookMic = audioInputs.find(device => 
        device.label.toLowerCase().includes('built-in') ||
        device.label.toLowerCase().includes('macbook') ||
        device.label.toLowerCase().includes('internal')
      );

      const preferredDeviceId = macbookMic?.deviceId;
      
      if (preferredDeviceId) {
        console.log(`✅ Using MacBook built-in microphone: ${macbookMic?.label}`);
      } else {
        console.log('⚠️  MacBook microphone not found, using default');
      }
      
      // Request microphone with device-specific configuration
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          deviceId: preferredDeviceId ? { exact: preferredDeviceId } : undefined,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 24000, // Match OpenAI's expected rate
          channelCount: 1,    // Mono
        }
      });
      
      console.log('✅ Microphone permission granted with enhanced audio processing');
      console.log('🎵 Audio stream tracks:', stream.getAudioTracks().length);
      
      // Log the actual audio settings
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        const settings = audioTrack.getSettings();
        console.log('🔧 Audio settings:', {
          sampleRate: settings.sampleRate,
          channelCount: settings.channelCount,
          echoCancellation: settings.echoCancellation,
          noiseSuppression: settings.noiseSuppression,
          autoGainControl: settings.autoGainControl
        });
      }
      
      // Stop the stream since we're just testing permissions
      stream.getTracks().forEach(track => track.stop());
      
      return {
        microphone: true,
        notifications: true,
      };
    } catch (error) {
      console.error('❌ Error requesting microphone permissions:', error);
      console.error('🔍 Error name:', (error as Error).name);
      console.error('🔍 Error message:', (error as Error).message);
      return {
        microphone: false,
        notifications: false,
      };
    }
  }

  async startRecording(): Promise<void> {
    try {
      if (this.isRecording) {
        console.warn('⚠️  Already recording');
        return;
      }

      console.log('🎤 Starting audio recording...');
      
      // Get microphone access with enhanced audio processing
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      
      console.log('✅ Got media stream');
      console.log('🎵 Audio tracks:', this.stream.getAudioTracks().length);

      // Create audio context
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 24000,
      });

      const source = this.audioContext.createMediaStreamSource(this.stream);
      this.analyser = this.audioContext.createAnalyser();
      
      // Create AudioWorklet or fallback to ScriptProcessor for real-time audio processing
      try {
        // Try modern AudioWorklet first (if available)
        if (this.audioContext.audioWorklet) {
          console.log('🎵 Using modern AudioWorklet for audio processing');
          // For now, fallback to ScriptProcessor - AudioWorklet requires external modules
        }
      } catch (error) {
        console.log('🎵 AudioWorklet not available, using ScriptProcessor');
      }

      // Fallback to ScriptProcessor (deprecated but widely supported)
      this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);
      
      source.connect(this.analyser);
      this.analyser.connect(this.processor);
      this.processor.connect(this.audioContext.destination);

      // Process audio data in real-time
      this.processor.onaudioprocess = (audioProcessingEvent) => {
        if (this.isRecording) {
          const inputBuffer = audioProcessingEvent.inputBuffer;
          const channelData = inputBuffer.getChannelData(0);
          
          // Check for actual audio signal
          const audioLevel = Math.max(...Array.from(channelData).map(Math.abs));
          console.log('🎵 Audio level:', audioLevel.toFixed(4), 'Buffer size:', channelData.length);
          
          // Convert float32 to PCM16
          const pcm16Buffer = this.float32ToPCM16(channelData);
          console.log('📦 Sending audio buffer:', pcm16Buffer.byteLength, 'bytes');
          this.onAudioData(pcm16Buffer);
        }
      };

      this.isRecording = true;
      console.log('✅ Web audio recording started successfully');
      console.log('🎵 Audio context state:', this.audioContext.state);
      console.log('🎵 Audio context sample rate:', this.audioContext.sampleRate);

    } catch (error) {
      console.error('Error starting recording:', error);
      throw error;
    }
  }

  private float32ToPCM16(float32Array: Float32Array): ArrayBuffer {
    const buffer = new ArrayBuffer(float32Array.length * 2);
    const view = new DataView(buffer);
    let offset = 0;
    
    for (let i = 0; i < float32Array.length; i++, offset += 2) {
      let s = Math.max(-1, Math.min(1, float32Array[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    
    return buffer;
  }

  async stopRecording(): Promise<string | null> {
    try {
      if (!this.isRecording) {
        console.warn('Not currently recording');
        return null;
      }

      this.isRecording = false;

      if (this.processor) {
        this.processor.disconnect();
        this.processor = null;
      }

      if (this.analyser) {
        this.analyser.disconnect();
        this.analyser = null;
      }

      if (this.audioContext) {
        await this.audioContext.close();
        this.audioContext = null;
      }

      if (this.stream) {
        this.stream.getTracks().forEach(track => track.stop());
        this.stream = null;
      }

      console.log('Web audio recording stopped');
      return 'web-recording-completed';

    } catch (error) {
      console.error('Error stopping recording:', error);
      throw error;
    }
  }

  getIsRecording(): boolean {
    return this.isRecording;
  }

  async cleanup(): Promise<void> {
    await this.stopRecording();
  }
}
