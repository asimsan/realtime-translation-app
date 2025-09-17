import * as Speech from 'expo-speech';
import { setAudioModeAsync } from 'expo-audio';
import { Platform } from 'react-native';

export class TextToSpeechService {
  private currentSound: any = null;
  private isPlaying: boolean = false;
  private airpodsDevice: MediaDeviceInfo | null = null;
  private audioContext: AudioContext | null = null;

  constructor() {
    this.setupAudioSession();
    this.findAirPods();
  }

  private async setupAudioSession(): Promise<void> {
    try {
      // Skip audio setup on web platform
      if (Platform.OS === 'web') {
        return;
      }
      
      // Configure audio session for playback
      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
      });
    } catch (error) {
      console.error('Error setting up audio session:', error);
    }
  }

  private async findAirPods(): Promise<void> {
    if (Platform.OS !== 'web') return;

    try {
      console.log('🔍 Searching for AirPods...');
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioOutputs = devices.filter(device => device.kind === 'audiooutput');
      
      console.log('🔊 Available audio output devices:');
      audioOutputs.forEach((device, index) => {
        console.log(`  ${index}: ${device.label || 'Unknown Device'} (${device.deviceId})`);
      });

      // Try to find AirPods
      this.airpodsDevice = audioOutputs.find(device => 
        device.label.toLowerCase().includes('airpods') ||
        device.label.toLowerCase().includes('wireless') ||
        device.label.toLowerCase().includes('bluetooth')
      ) || null;

      if (this.airpodsDevice) {
        console.log(`✅ Found AirPods: ${this.airpodsDevice.label}`);
      } else {
        console.log('⚠️  AirPods not found, using default audio output');
      }
    } catch (error) {
      console.error('Error finding AirPods:', error);
    }
  }

  async speakNepali(text: string): Promise<void> {
    try {
      if (this.isPlaying) {
        await this.stop();
      }

      this.isPlaying = true;

      // Use Hindi voice as fallback for Nepali on most platforms
      const speechOptions: Speech.SpeechOptions = {
        language: 'hi-IN', // Hindi voice for Nepali text
        pitch: 1.0,
        rate: 0.85, // Slightly slower for clarity
        voice: undefined, // Let the system choose the best Hindi voice
      };

      await Speech.speak(text, speechOptions);

    } catch (error) {
      console.error('Error in Nepali text-to-speech:', error);
      this.isPlaying = false;
      throw error;
    }
  }

  async speakEnglish(text: string): Promise<void> {
    try {
      if (this.isPlaying) {
        await this.stop();
      }

      this.isPlaying = true;

      const speechOptions: Speech.SpeechOptions = {
        language: 'en-US',
        pitch: 1.0,
        rate: 0.9,
        voice: undefined,
      };

      await Speech.speak(text, speechOptions);

    } catch (error) {
      console.error('Error in text-to-speech:', error);
      this.isPlaying = false;
      throw error;
    }
  }

  async playAudioBuffer(audioBuffer: ArrayBuffer): Promise<void> {
    try {
      if (this.isPlaying) {
        await this.stop();
      }

      // For web environment, use Web Audio API to properly handle PCM data
      if (typeof window !== 'undefined' && window.AudioContext) {
        await this.playPCMAudio(audioBuffer);
      } else {
        // Fallback for environments without Web Audio API
        console.warn('Web Audio API not available, skipping audio playback');
      }

    } catch (error) {
      console.error('Error playing audio buffer:', error);
      this.isPlaying = false;
      throw error;
    }
  }

  private async playPCMAudio(audioBuffer: ArrayBuffer): Promise<void> {
    try {
      // Resume AudioContext if suspended (browser policy)
      const audioContext = new AudioContext();
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      
      // OpenAI sends PCM16 data at 24kHz
      const sampleRate = 24000;
      const numberOfChannels = 1; // Mono
      const int16Array = new Int16Array(audioBuffer);
      
      // Skip very small audio chunks to avoid crackling
      if (int16Array.length < 240) { // Less than 10ms at 24kHz
        console.log('⚠️ Skipping small audio chunk:', int16Array.length, 'samples');
        return;
      }
      
      // Create AudioBuffer
      const buffer = audioContext.createBuffer(numberOfChannels, int16Array.length, sampleRate);
      const channelData = buffer.getChannelData(0);
      
      // Convert Int16 to Float32 with improved precision
      for (let i = 0; i < int16Array.length; i++) {
        // Improved conversion with smoothing for better audio quality
        channelData[i] = Math.max(-1, Math.min(1, int16Array[i] / 32767.0));
      }
      
      // Create gain node for volume control and smoother playback
      const gainNode = audioContext.createGain();
      gainNode.gain.setValueAtTime(0.8, audioContext.currentTime); // Slightly lower volume
      
      // Create source and connect through gain node
      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(gainNode);
      
      // Route audio specifically to AirPods if available
      if (this.airpodsDevice?.deviceId && (audioContext as any).setSinkId) {
        try {
          await (audioContext as any).setSinkId(this.airpodsDevice.deviceId);
          console.log(`🎧 Audio routed to AirPods: ${this.airpodsDevice.label}`);
        } catch (error) {
          console.warn('⚠️  Could not route to AirPods, using default output:', error);
        }
      }
      
      gainNode.connect(audioContext.destination);
      
      this.isPlaying = true;
      
      // Handle playback completion
      const onEnded = () => {
        this.isPlaying = false;
        this.currentSound = null;
        // Clean up nodes
        gainNode.disconnect();
        source.disconnect();
      };
      
      source.onended = onEnded;
      
      this.currentSound = source;
      source.start();
      
      console.log(`🔊 Playing PCM audio: ${audioBuffer.byteLength} bytes, ${int16Array.length} samples, ${(int16Array.length / sampleRate * 1000).toFixed(1)}ms`);
      
    } catch (error) {
      console.error('Error playing PCM audio:', error);
      this.isPlaying = false;
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      // Stop Expo Speech
      await Speech.stop();

      // Stop current audio sound with platform compatibility
      if (this.currentSound) {
        if (typeof this.currentSound.stop === 'function') {
          this.currentSound.stop();
        } else if (typeof this.currentSound.stopAsync === 'function') {
          await this.currentSound.stopAsync();
        }
        if (typeof this.currentSound.unloadAsync === 'function') {
          await this.currentSound.unloadAsync();
        }
        this.currentSound = null;
      }

      this.isPlaying = false;
    } catch (error) {
      console.error('Error stopping speech:', error);
    }
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }
}
