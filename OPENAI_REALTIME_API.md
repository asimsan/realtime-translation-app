# OpenAI Realtime API Documentation

## Overview
The OpenAI Realtime API enables low-latency communication with models that natively support speech-to-speech interactions as well as multimodal inputs (audio, images, and text) and outputs (audio and text).

## Connection Methods

### WebSocket Connection (Our Implementation)
Ideal for middle tier server-side applications with consistent low-latency network connections.

**URL Format:**
```
wss://api.openai.com/v1/realtime?model=gpt-realtime
```

**Authentication:**
```javascript
const ws = new WebSocket(url, {
    headers: {
        Authorization: "Bearer " + process.env.OPENAI_API_KEY,
    },
});
```

## Key Changes from Beta to GA

### 1. Beta Header Removal
**OLD (Beta):** Required header `OpenAI-Beta: realtime=v1`
**NEW (GA):** Remove this header completely

### 2. Session Configuration
**NEW FORMAT:** Must specify session type as "realtime"

```javascript
{
    type: "session.update",
    session: {
        type: "realtime",  // Required in GA
        model: "gpt-realtime",
        audio: {
            output: { voice: "marin" },
        },
    },
}
```

### 3. Event Name Changes
- `response.text.delta` → `response.output_text.delta`
- `response.audio.delta` → `response.output_audio.delta`  
- `response.audio_transcript.delta` → `response.output_audio_transcript.delta`
- `conversation.item.created` → `conversation.item.added`

### 4. Content Type Changes
Assistant message content types:
- `type=text` → `type=output_text`
- `type=audio` → `type=output_audio`

## Authentication for Client-Side
For browser/client applications, use ephemeral keys:

```javascript
const response = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
    method: "POST",
    headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
    },
    body: JSON.stringify({
        session: {
            type: "realtime",
            model: "gpt-realtime",
            audio: {
                input: {
                    format: { type: "audio/pcm" }
                },
                output: { 
                    voice: "marin",
                    format: { type: "audio/pcm" }
                },
            },
        },
    }),
});
```

## Supported Audio Formats
The OpenAI Realtime API supports the following audio format types:
- `'audio/pcm'` - PCM audio format (recommended)
- `'audio/pcmu'` - μ-law encoded audio  
- `'audio/pcma'` - A-law encoded audio

**Example Configuration:**
```javascript
audio: {
    input: {
        format: { type: "audio/pcm" }
    },
    output: {
        format: { type: "audio/pcm" },
        voice: "alloy"
    }
}
```

## Cost Considerations
- The Realtime API is expensive (~$0.06/minute for gpt-4o-audio-preview)
- Requires active billing and available credits
- Monitor usage carefully in production applications
