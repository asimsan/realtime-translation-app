# 🗣️ Real-Time English ⇄ Nepali Translation App

[![React Native](https://img.shields.io/badge/React%20Native-0.81.4-blue.svg)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-~54.0.7-black.svg)](https://expo.dev/)
[![OpenAI](https://img.shields.io/badge/OpenAI-Realtime%20API-green.svg)](https://platform.openai.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-~5.9.2-blue.svg)](https://www.typescriptlang.org/)

A real-time speech translation mobile app that enables **bidirectional English ⇄ Nepali translation** through AirPods. The app uses **OpenAI's GPT Realtime API** via a secure backend service for speech recognition and translation, optimized for low-latency, hands-free operation with echo cancellation.

## 📱 Demo

**English Input:** "Hello, how are you today?"  
**Nepali Output:** "नमस्ते, आज तपाईं कस्तो हुनुहुन्छ?" 🔊

**Nepali Input:** "म ठिक छु, धन्यवाद।"  
**English Output:** "I am fine, thank you." 🔊

## ✨ Features

- **🔄 Bidirectional Translation:** English ⇄ Nepali with auto-detection
- **⚡ Real-time Processing:** Low-latency streaming (<700ms) with WebSocket
- **🎧 AirPods Optimization:** Enhanced audio capture and playback
- **🗣️ Natural Speech:** OpenAI Realtime API for seamless voice interaction
- **🎯 Smart Detection:** Automatic language detection and appropriate translation
- **🎨 Beautiful UI:** Modern gradient interface with visual feedback animations
- **🔇 Echo Cancellation:** Clean audio without feedback loops
- **📱 Cross-Platform:** Works on iOS, Android, and Web

## 🏗️ Architecture

```
[Mobile App] → [Backend Service] → [OpenAI Realtime API]
      ↓              ↓                       ↓
[AirPods Audio] → [Secure Proxy] → [Speech Recognition & Translation]
      ↓              ↓                       ↓
[User Interface] ← [Rate Limiting] ← [Real-time Audio Response]
                   [Authentication]
                   [Error Handling]
```

**Security Benefits:**
- 🔒 API keys stored securely on backend
- 🛡️ Rate limiting and request validation
- 🚫 No sensitive data on client devices
- 📊 Centralized logging and monitoring

## 🛠️ Tech Stack

### Frontend
- **Framework:** React Native (Expo)
- **Language:** TypeScript
- **Audio Processing:** Expo AV
- **State Management:** React Hooks
- **Storage:** AsyncStorage

### Backend
- **Runtime:** Node.js + Express.js
- **Language:** TypeScript
- **Authentication:** Session-based + Rate limiting
- **API Integration:** OpenAI Realtime API
- **Security:** Helmet, CORS, Input validation

### Services
- **Speech Recognition:** OpenAI Whisper Realtime
- **Translation:** OpenAI GPT-4 Realtime
- **Text-to-Speech:** OpenAI TTS
- **Real-time Streaming:** WebSocket + OpenAI Realtime API

## 📋 Prerequisites

Before you begin, ensure you have:

1. **Node.js** (v18 or higher)
2. **Expo CLI** (`npm install -g @expo/cli`)
3. **iOS device or simulator** (recommended for AirPods)
4. **AirPods or compatible Bluetooth headphones**

### For Backend Setup (Admin Only)
- **OpenAI API Key** with Realtime API access
- **Server/Hosting** for backend deployment

## 🚀 Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd realtime-translation-app
npm install
```

### 2. Set Up Backend (First Time Only)

See [BACKEND_DEPLOYMENT.md](BACKEND_DEPLOYMENT.md) for complete backend setup instructions.

**Quick local setup:**
```bash
cd backend
cp env.example .env
# Edit .env with your OpenAI API key
npm install
npm run dev
```

### 3. Run the App

```bash
# Start the development server
npm start

# For iOS (recommended)
npm run ios

# For Android
npm run android

# For web (limited functionality)
npm run web
```

### 4. Configure the App

1. When you first open the app, you'll see a backend connection screen
2. The app will automatically check the backend service status
3. Ensure your backend is running on `http://localhost:3001`
4. Once connected, you're ready to start translating!

## 📱 How to Use

### Basic Usage

1. **Connect AirPods:** Ensure your AirPods are connected to your device
2. **Start Recording:** Tap the microphone button to start recording
3. **Speak in English:** Speak clearly into your AirPods microphone
4. **Listen to Translation:** The Nepali translation will play automatically through your AirPods
5. **Stop Recording:** Tap the stop button when finished

### Features

- **Visual Feedback:** Animated waves show when the app is listening
- **Text Display:** See both English transcription and Nepali translation
- **Replay Translation:** Tap the play button to hear the translation again
- **Real-time Processing:** Translation begins as you speak

## 🔧 Configuration

### Audio Settings

The app automatically configures audio settings for optimal AirPods performance:

- **Sample Rate:** 16kHz for optimal speech recognition
- **Channels:** Mono for reduced bandwidth
- **Format:** PCM16 for OpenAI compatibility
- **Latency:** Optimized for real-time streaming

### Performance Tuning

For best results:

1. **Speak clearly** and at a moderate pace
2. **Use AirPods** for best audio quality
3. **Stable internet** connection for real-time processing
4. **Quiet environment** for accurate speech recognition

## 🛠️ Development

### Project Structure

```
src/
├── components/           # React components
│   ├── ConfigScreen.tsx  # API key configuration
│   └── TranslationScreen.tsx # Main translation interface
├── services/             # Core services
│   ├── OpenAIRealtimeService.ts # OpenAI API integration
│   ├── AudioRecordingService.ts # Audio capture
│   ├── TextToSpeechService.ts   # Speech synthesis
│   └── TranslationService.ts    # Main orchestration
├── types/                # TypeScript type definitions
└── utils/                # Utility functions
```

### Key Services

- **OpenAIRealtimeService:** Handles WebSocket connection to OpenAI Realtime API
- **AudioRecordingService:** Manages audio capture with AirPods optimization
- **TextToSpeechService:** Converts Nepali text to speech
- **TranslationService:** Orchestrates the entire translation pipeline

### Adding New Languages

To add support for other languages:

1. Update the `TranslationService` to specify the target language
2. Modify the TTS service to use appropriate voice settings
3. Update the UI to reflect the new language pair

## 🐛 Troubleshooting

### Common Issues

1. **API Key Invalid**
   - Ensure your OpenAI API key has Realtime API access
   - Check that the key starts with `sk-`
   - Verify your OpenAI account has sufficient credits

2. **Audio Not Working**
   - Check microphone permissions
   - Ensure AirPods are properly connected
   - Try restarting the app

3. **Translation Delays**
   - Check internet connection stability
   - Ensure OpenAI API is responding
   - Try speaking more clearly or slowly

4. **No Nepali Voice**
   - The app falls back to Hindi if Nepali TTS is unavailable
   - Consider using OpenAI's TTS for better Nepali support

### Error Messages

- **"Microphone permission required":** Grant microphone access in device settings
- **"WebSocket connection error":** Check internet connection and API key
- **"Translation failed":** Verify API key and account credits

## 🔒 Security & Privacy

- **API Key Storage:** Stored locally using AsyncStorage (encrypted on device)
- **Audio Data:** Streamed in real-time, not stored locally
- **Privacy:** No audio data is permanently stored by the app
- **OpenAI Policy:** Audio data follows OpenAI's data usage policies

## 📈 Performance Optimization

### Current Optimizations

- **Real-time audio streaming** in 100ms chunks
- **WebSocket connection** for low-latency communication
- **Optimized audio format** (PCM16, 16kHz, Mono)
- **Echo cancellation** to prevent feedback

### Future Improvements

- **Voice Activity Detection** for automatic start/stop
- **Background processing** for uninterrupted translation
- **Offline mode** with cached translations
- **Multiple language support**

## 🤝 Contributing

Contributions are welcome! Please read the contributing guidelines and:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

1. Check the troubleshooting section above
2. Review the OpenAI API documentation
3. Create an issue in the repository
4. Contact the development team

---

**Made with ❤️ for real-time communication**
