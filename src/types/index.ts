export interface TranslationState {
  isRecording: boolean;
  isTranslating: boolean;
  isPlaying: boolean;
  currentText: string;
  translatedText: string;
  detectedLanguage?: string;
  targetLanguage?: string;
  error: string | null;
}

export interface AudioPermissions {
  microphone: boolean;
  notifications: boolean;
}

export interface RealtimeMessage {
  type: 'session.created' | 'session.updated' | 'input_audio_buffer.append' | 'input_audio_buffer.commit' | 'input_audio_buffer.clear' | 'input_audio_buffer.committed' | 'input_audio_buffer.speech_started' | 'input_audio_buffer.speech_stopped' | 'conversation.item.create' | 'conversation.item.added' | 'conversation.item.done' | 'response.create' | 'response.created' | 'response.output_item.added' | 'response.content_part.added' | 'response.output_audio.delta' | 'response.output_audio.done' | 'response.output_audio_transcript.delta' | 'response.output_audio_transcript.done' | 'response.output_text.delta' | 'response.output_text.done' | 'response.content_part.done' | 'response.output_item.done' | 'response.done' | 'rate_limits.updated' | 'error';
  event_id?: string;
  session?: any;
  item?: any;
  response?: any;
  delta?: string;
  audio?: string;
  transcript?: string;
  text?: string;
  error?: any;
  rate_limits?: any;
}

export interface LiveKitOptions {
  url: string;
  token: string;
  room: string;
}

export interface OpenAIConfig {
  apiKey: string;
  model: string;
  voice: string;
}
