# Voice Agents Guide for Real-time Translation App

Based on OpenAI's official Voice Agents documentation - adapted for our English ⇄ Nepali translation use case.

## Architecture Overview

Our app uses the **Speech-to-Speech (Realtime) Architecture** for optimal translation experience:

### Why Speech-to-Speech for Translation?
- **Low latency interactions** - Real-time conversation flow
- **Rich multimodal understanding** - Captures emotion, tone, and intent
- **Natural, fluid conversational flow** - Preserves speaking patterns
- **Enhanced user experience** - No intermediate text conversion delays

## Our Implementation Architecture

```
User Speech (English/Nepali) 
    ↓
WebSocket Connection to OpenAI Realtime API
    ↓  
gpt-realtime model processes audio directly
    ↓
Model detects language and translates
    ↓
Translated speech output (Nepali/English)
```

## Transport Method: WebSocket

We use **WebSocket** for our browser-based application because:
- Reliable for client-side browser applications
- Good balance of latency and reliability
- Compatible with Expo web platform
- Easier to implement authentication and error handling

## Agent Design for Translation

### Core Responsibilities
1. **Auto-detect input language** (English or Nepali)
2. **Translate to target language** (English → Nepali, Nepali → English)
3. **Maintain conversational context** for multi-turn conversations
4. **Preserve tone and emotion** in translation

### Prompt Engineering for Translation

Our current prompt structure:
```javascript
instructions: `You are a helpful translator. Auto-detect if the input is in English or Nepali, then translate it to the other language. 

If English input: translate to Nepali
If Nepali input: translate to English

Respond naturally and conversationally in the target language.`
```

### Enhanced Prompt Template (Future Improvement)

```text
# Personality and Tone
## Identity
You are an expert real-time translator specializing in English and Nepali languages. You have deep cultural understanding of both languages and can capture nuances, emotions, and context.

## Task
Automatically detect whether the user is speaking in English or Nepali, then provide an accurate, natural translation to the other language. Maintain the original speaker's tone, emotion, and intent.

## Demeanor
Professional, helpful, and culturally sensitive

## Tone
Natural and conversational, matching the original speaker's energy level

## Level of Enthusiasm
Match the original speaker's enthusiasm level

## Level of Formality
Adapt formality level based on the original speech (casual vs formal)

## Level of Emotion
Preserve and convey the emotional context of the original speech

## Filler Words
Occasionally use natural filler words appropriate to the target language

## Pacing
Maintain natural pacing for the target language

# Instructions
- Always auto-detect the input language (English or Nepali)
- Translate to the opposite language (English → Nepali, Nepali → English)
- Preserve the speaker's emotional tone and intent
- For cultural references, provide culturally appropriate equivalents
- If uncertain about meaning, provide the most contextually appropriate translation
- Maintain conversation flow and context across multiple exchanges
- For mixed-language input, translate each part to the appropriate target language
```

## Technical Implementation

### Session Configuration
```javascript
const sessionConfig = {
  type: 'session.update',
  session: {
    type: 'realtime',
    model: 'gpt-realtime',
    audio: {
      input: {
        format: {
          type: 'audio/pcm',
          sample_rate: 24000,
          channels: 1,
          bit_depth: 16
        },
        turn_detection: {
          type: 'semantic_vad' // Voice activity detection
        }
      },
      output: {
        voice: 'alloy',
        format: {
          type: 'audio/pcm',
          sample_rate: 24000,
          channels: 1,
          bit_depth: 16
        }
      }
    },
    instructions: "..." // Translation instructions
  }
};
```

### Key Events We Handle

#### Input Events
- `input_audio_buffer.speech_started` - User starts speaking
- `input_audio_buffer.speech_stopped` - User stops speaking
- `input_audio_buffer.committed` - Audio ready for processing

#### Output Events
- `response.created` - Translation generation starts
- `response.output_text.delta` - Text translation chunks
- `response.output_audio.delta` - Audio translation chunks
- `response.output_audio_transcript.delta` - Transcript of spoken translation
- `response.done` - Translation complete

### Audio Processing Flow

1. **Audio Capture** (WebAudioRecordingService)
   - Capture microphone input at 24kHz
   - Convert to PCM16 format
   - Stream to OpenAI in real-time chunks

2. **Translation Processing** (OpenAIRealtimeService)
   - Send audio chunks via WebSocket
   - Receive translated audio and text
   - Handle semantic VAD for natural conversation flow

3. **Audio Playback** (TextToSpeechService)
   - Play translated audio response
   - Display text translation on screen

## Error Handling and Edge Cases

### Common Issues
1. **WebSocket connection failures** - Retry with exponential backoff
2. **Audio permission denied** - Guide user to enable microphone
3. **Language detection errors** - Provide manual language selection fallback
4. **Network latency** - Buffer audio chunks appropriately

### Fallback Strategies
1. **Text-based translation** - If audio fails, allow text input
2. **Manual language selection** - Override auto-detection when needed
3. **Conversation history** - Maintain context for better translations

## Performance Optimization

### Current Optimizations
- **Semantic VAD** - Automatic speech boundary detection
- **Audio chunking** - Efficient real-time streaming
- **WebSocket connection reuse** - Maintain persistent connection

### Future Improvements
- **Audio quality adaptation** - Adjust based on network conditions
- **Conversation memory** - Remember context across sessions
- **Cultural adaptation** - Learn user's preferred translation style

## Cost Considerations

- **Realtime API cost**: ~$0.06/minute
- **Monitor usage**: Track session duration and audio volume
- **Optimization**: Use semantic VAD to reduce processing of silence

## Security and Privacy

- **Ephemeral sessions** - Audio not stored by OpenAI
- **API key protection** - Secure key management
- **User consent** - Clear microphone permission requests

## Future Enhancements

1. **Multi-language support** - Add more language pairs
2. **Context awareness** - Remember conversation topics
3. **Cultural adaptation** - Improve cultural reference translation
4. **Offline mode** - Basic translation without internet
5. **Voice customization** - Different voices for different languages

## Development Guidelines

### Testing Translation Quality
1. Test with various accents and speaking speeds
2. Verify cultural context preservation
3. Check emotional tone maintenance
4. Test interruption and conversation flow

### Debugging Audio Issues
1. Monitor WebSocket connection status
2. Check audio format compatibility
3. Verify microphone permissions
4. Test on different browsers and devices

### Performance Monitoring
1. Track translation latency
2. Monitor audio quality metrics
3. Measure user satisfaction
4. Log error rates and types
