import AsyncStorage from '@react-native-async-storage/async-storage';

export interface AppConfig {
  openai: {
    apiKey: string;
    model: string;
    voice: string;
  };
  performance: {
    targetLatency: number;
    maxAudioBufferSize: number;
    audioSampleRate: number;
    audioChannels: number;
  };
  features: {
    echoCancellation: boolean;
    noiseSuppression: boolean;
    performanceLogging: boolean;
    detailedLogging: boolean;
  };
  languages: {
    source: string;
    target: string;
    fallbackTTS: string;
  };
}

const DEFAULT_CONFIG: Omit<AppConfig, 'openai'> = {
  performance: {
    targetLatency: 700,
    maxAudioBufferSize: 1024,
    audioSampleRate: 24000, // Updated to match API requirements
    audioChannels: 1
  },
  features: {
    echoCancellation: true,
    noiseSuppression: true,
    performanceLogging: true,
    detailedLogging: false
  },
  languages: {
    source: 'auto', // Auto-detect for multilingual support
    target: 'auto', // Auto-translate appropriately
    fallbackTTS: 'hi-IN'
  }
};

export class ConfigService {
  private static config: AppConfig | null = null;

  static async loadConfig(): Promise<AppConfig> {
    if (this.config) {
      return this.config;
    }

    try {
      // Load API key from AsyncStorage
      const apiKey = await AsyncStorage.getItem('openai_api_key');
      
      if (!apiKey) {
        throw new Error('API key not found. Please configure in settings.');
      }

      // Load other settings from AsyncStorage or use defaults
      const savedConfig = await AsyncStorage.getItem('app_config');
      const userConfig = savedConfig ? JSON.parse(savedConfig) : {};

      this.config = {
        openai: {
          apiKey,
          model: 'gpt-realtime', // Updated model
          voice: userConfig.openai?.voice || 'alloy'
        },
        performance: {
          ...DEFAULT_CONFIG.performance,
          ...userConfig.performance
        },
        features: {
          ...DEFAULT_CONFIG.features,
          ...userConfig.features
        },
        languages: {
          ...DEFAULT_CONFIG.languages,
          ...userConfig.languages
        }
      };

      return this.config;
    } catch (error) {
      console.error('Error loading config:', error);
      throw error;
    }
  }

  static async updateConfig(updates: Partial<AppConfig>): Promise<void> {
    const currentConfig = await this.loadConfig();
    
    const newConfig = {
      ...currentConfig,
      ...updates,
      openai: {
        ...currentConfig.openai,
        ...updates.openai
      },
      performance: {
        ...currentConfig.performance,
        ...updates.performance
      },
      features: {
        ...currentConfig.features,
        ...updates.features
      },
      languages: {
        ...currentConfig.languages,
        ...updates.languages
      }
    };

    // Save non-sensitive config to AsyncStorage
    const configToSave = {
      openai: {
        model: newConfig.openai.model,
        voice: newConfig.openai.voice
      },
      performance: newConfig.performance,
      features: newConfig.features,
      languages: newConfig.languages
    };

    await AsyncStorage.setItem('app_config', JSON.stringify(configToSave));
    
    // Update API key separately if provided
    if (updates.openai?.apiKey) {
      await AsyncStorage.setItem('openai_api_key', updates.openai.apiKey);
    }

    this.config = newConfig;
  }

  static getConfig(): AppConfig | null {
    return this.config;
  }

  static clearConfig(): void {
    this.config = null;
  }
}
