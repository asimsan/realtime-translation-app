import * as Speech from 'expo-speech';
import { setAudioModeAsync } from 'expo-audio';
import { Platform } from 'react-native';

export class TextToSpeechService {
  private currentSound: any = null;
  private isPlaying: boolean = false;

  constructor() {
    this.setupAudioSession();
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
      const audioContext = new AudioContext();
      
      // OpenAI sends PCM16 data at 24kHz
      const sampleRate = 24000;
      const numberOfChannels = 1; // Mono
      const int16Array = new Int16Array(audioBuffer);
      
      // Create AudioBuffer
      const buffer = audioContext.createBuffer(numberOfChannels, int16Array.length, sampleRate);
      const channelData = buffer.getChannelData(0);
      
      // Convert Int16 to Float32 (Web Audio API format)
      for (let i = 0; i < int16Array.length; i++) {
        channelData[i] = int16Array[i] / 32768.0; // Convert to -1.0 to 1.0 range
      }
      
      // Create source and play
      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContext.destination);
      
      this.isPlaying = true;
      source.onended = () => {
        this.isPlaying = false;
        this.currentSound = null;
      };
      
      this.currentSound = source;
      source.start();
      
      console.log(`🔊 Playing PCM audio: ${audioBuffer.byteLength} bytes, ${int16Array.length} samples`);
      
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
