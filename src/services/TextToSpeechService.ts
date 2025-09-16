import * as Speech from 'expo-speech';
import { setAudioModeAsync } from 'expo-audio';

export class TextToSpeechService {
  private currentSound: any = null;
  private isPlaying: boolean = false;

  constructor() {
    this.setupAudioSession();
  }

  private async setupAudioSession(): Promise<void> {
    try {
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

      // Check if Nepali voice is available
      const voices = await Speech.getAvailableVoicesAsync();
      console.log('Available voices:', voices);

      // Look for Nepali or closest alternative
      const nepaliVoice = voices.find(voice => 
        voice.language.includes('ne') || 
        voice.language.includes('hindi') || 
        voice.language.includes('hi')
      );

      const speechOptions: Speech.SpeechOptions = {
        voice: nepaliVoice?.identifier,
        language: nepaliVoice?.language || 'hi-IN', // Fallback to Hindi if Nepali not available
        pitch: 1.0,
        rate: 0.8, // Slightly slower for better comprehension
        volume: 1.0,
        onStart: () => {
          console.log('Speech started');
        },
        onDone: () => {
          console.log('Speech completed');
          this.isPlaying = false;
        },
        onStopped: () => {
          console.log('Speech stopped');
          this.isPlaying = false;
        },
        onError: (error) => {
          console.error('Speech error:', error);
          this.isPlaying = false;
        }
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

      // Convert ArrayBuffer to base64 for expo-audio
      const uint8Array = new Uint8Array(audioBuffer);
      const base64Audio = btoa(String.fromCharCode.apply(null, Array.from(uint8Array)));
      const uri = `data:audio/wav;base64,${base64Audio}`;

      // For now, use a simple Audio element for web or native audio APIs
      if (typeof window !== 'undefined') {
        // Web environment
        const audio = new Audio(uri);
        audio.play();
        this.currentSound = audio;
        this.isPlaying = true;
        
        audio.onended = () => {
          this.isPlaying = false;
          this.currentSound = null;
        };
      } else {
        // Native environment - use expo-av for now
        console.log('Native audio playback not implemented yet');
        this.isPlaying = false;
      }

    } catch (error) {
      console.error('Error playing audio buffer:', error);
      this.isPlaying = false;
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      // Stop Expo Speech
      await Speech.stop();

      // Stop current audio sound
      if (this.currentSound) {
        await this.currentSound.stopAsync();
        await this.currentSound.unloadAsync();
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

  async getAvailableVoices(): Promise<Speech.Voice[]> {
    try {
      return await Speech.getAvailableVoicesAsync();
    } catch (error) {
      console.error('Error getting available voices:', error);
      return [];
    }
  }

  async isSpeaking(): Promise<boolean> {
    try {
      return await Speech.isSpeakingAsync();
    } catch (error) {
      console.error('Error checking if speaking:', error);
      return false;
    }
  }
}
