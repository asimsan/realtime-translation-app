import OpenAI from 'openai';
import { WebSocket } from 'ws';
import { config } from '@/utils/config';
import { logger } from '@/utils/logger';
import { TranslationRequest, TranslationResponse } from '@/types';

export class OpenAIService {
  private openai: OpenAI;
  private realtimeConnections: Map<string, WebSocket> = new Map();

  constructor() {
    this.openai = new OpenAI({
      apiKey: config.openai.apiKey,
      baseURL: config.openai.baseURL,
    });
  }

  // Text-based translation using chat completions
  async translateText(request: TranslationRequest): Promise<TranslationResponse> {
    try {
      const { text, sourceLanguage = 'auto', targetLanguage } = request;
      
      if (!text) {
        throw new Error('Text is required for translation');
      }

      logger.info('Translating text', { sourceLanguage, targetLanguage, textLength: text.length });

      const systemPrompt = this.buildSystemPrompt(sourceLanguage, targetLanguage);
      
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini', // More cost-effective for text translation
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text }
        ],
        max_tokens: 500,
        temperature: 0.3,
      });

      const translatedText = completion.choices[0]?.message?.content?.trim();
      
      if (!translatedText) {
        throw new Error('No translation received from OpenAI');
      }

      logger.info('Translation completed successfully');

      return {
        success: true,
        translatedText,
        detectedLanguage: sourceLanguage === 'auto' ? this.detectLanguage(text) : sourceLanguage,
        sessionId: request.sessionId,
      };

    } catch (error) {
      logger.error('Translation failed', { error: error.message });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Translation failed',
        sessionId: request.sessionId,
      };
    }
  }

  // Get ephemeral client secret for Realtime API
  async getEphemeralToken(sessionId: string): Promise<{ clientSecret: string; expiresAt: Date }> {
    try {
      logger.info('Requesting ephemeral client secret', { sessionId });

      const sessionConfig = {
        session: {
          type: 'realtime',
          model: config.openai.model,
          audio: {
            input: {
              format: { type: 'audio/pcm', rate: 24000 },
              turn_detection: { type: 'server_vad' },
            },
            output: {
              voice: config.openai.voice,
              format: { type: 'audio/pcm', rate: 24000 },
            },
          },
          instructions: this.buildRealtimeInstructions(),
        },
      };

      const response = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.openai.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sessionConfig),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to get ephemeral token: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      const clientSecret = data.value;

      if (!clientSecret) {
        throw new Error('No client secret returned from OpenAI');
      }

      // Ephemeral tokens typically expire in 1 hour
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

      logger.info('Ephemeral token obtained successfully', { sessionId, expiresAt });

      return { clientSecret, expiresAt };

    } catch (error) {
      logger.error('Failed to get ephemeral token', { sessionId, error: error.message });
      throw error;
    }
  }

  // Validate API key and check Realtime access
  async validateApiKey(): Promise<{ isValid: boolean; hasRealtimeAccess: boolean; error?: string }> {
    try {
      logger.info('Validating OpenAI API key');

      // Test basic API access
      const modelsResponse = await this.openai.models.list();
      
      if (!modelsResponse.data || modelsResponse.data.length === 0) {
        return {
          isValid: false,
          hasRealtimeAccess: false,
          error: 'No models available - invalid API key',
        };
      }

      logger.info('Basic API access confirmed', { modelCount: modelsResponse.data.length });

      // Test Realtime API access
      try {
        await this.getEphemeralToken('validation-test');
        logger.info('Realtime API access confirmed');
        
        return {
          isValid: true,
          hasRealtimeAccess: true,
        };
      } catch (realtimeError) {
        logger.warn('Realtime API access not available', { error: realtimeError.message });
        
        return {
          isValid: true,
          hasRealtimeAccess: false,
          error: 'Realtime API access not enabled',
        };
      }

    } catch (error) {
      logger.error('API key validation failed', { error: error.message });
      
      return {
        isValid: false,
        hasRealtimeAccess: false,
        error: error instanceof Error ? error.message : 'Validation failed',
      };
    }
  }

  private buildSystemPrompt(sourceLanguage: string, targetLanguage: string): string {
    const languageMap = {
      'en': 'English',
      'ne': 'Nepali (नेपाली)',
      'auto': 'automatically detected language',
    };

    const sourceLang = languageMap[sourceLanguage] || sourceLanguage;
    const targetLang = languageMap[targetLanguage] || targetLanguage;

    return `You are an expert translator specializing in ${sourceLang} and ${targetLang} languages. 

Your task:
${sourceLanguage === 'auto' 
  ? `1. Automatically detect the input language
2. If the input is in English, translate to Nepali
3. If the input is in Nepali, translate to English
4. If the input is in another language, translate to ${targetLang}`
  : `Translate the following text from ${sourceLang} to ${targetLang}`
}

Guidelines:
- Provide accurate, natural translations that preserve meaning and tone
- Maintain cultural context and appropriate formality levels
- For conversational text, use natural speech patterns
- For names and proper nouns, keep them as-is unless there's a standard translated form
- Only respond with the translation, no explanations or additional text

Translation:`;
  }

  private buildRealtimeInstructions(): string {
    return `# Real-time Translation Agent

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
- Respond promptly to maintain natural conversation flow`;
  }

  private detectLanguage(text: string): string {
    // Simple language detection based on script
    const nepaliPattern = /[\u0900-\u097F]/;
    return nepaliPattern.test(text) ? 'ne' : 'en';
  }
}
