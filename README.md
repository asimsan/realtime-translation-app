# Real-Time English to Nepali Translation App

A real-time speech translation mobile app that allows users to speak in English and have the speech translated and played in **Nepali** through AirPods. The app uses **OpenAI's GPT Realtime API** for speech recognition and translation, optimized for low-latency, hands-free operation.

## 🚀 Features

- **Real-time translation:** Low-latency streaming (<700ms) from English → Nepali
- **AirPods integration:** Optimized for audio capture and playback using AirPods
- **Speech Recognition:** Powered by OpenAI Whisper for accurate transcription
- **Natural Translation:** Uses GPT-4 for contextually accurate translations
- **Text-to-Speech:** High-quality Nepali voice synthesis
- **Beautiful UI:** Modern, gradient-based interface with visual feedback
- **Echo cancellation:** English speech is masked; only Nepali is heard

## 🏗️ Architecture

```
[English Speech] → [AirPods Mic] → [App Audio Capture]
                                         ↓
[OpenAI Realtime API] ← [WebSocket Stream] ← [Audio Processing]
    ↓
[ASR: English audio → text] → [Translation: English → Nepali] → [TTS: Nepali text → audio]
    ↓
[Real-time Audio Stream] → [AirPods Playback] → [Nepali Voice Output]
```

## 🛠️ Tech Stack

- **Frontend:** React Native (Expo)
- **Speech Recognition:** OpenAI Whisper Realtime
- **Translation:** OpenAI GPT-4 Realtime
- **Text-to-Speech:** Expo Speech + OpenAI TTS
- **Audio Processing:** Expo AV
- **Real-time Streaming:** WebSocket + OpenAI Realtime API
- **State Management:** React Hooks
- **Storage:** AsyncStorage

## 📋 Prerequisites

Before you begin, ensure you have:

1. **Node.js** (v16 or higher)
2. **Expo CLI** (`npm install -g @expo/cli`)
3. **OpenAI API Key** with Realtime API access
4. **iOS device or simulator** (recommended for AirPods)
5. **AirPods or compatible Bluetooth headphones**

## 🚀 Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd realtime-translation-app
npm install
```

### 2. Get OpenAI API Key

1. Visit [platform.openai.com](https://platform.openai.com)
2. Sign in to your account
3. Navigate to the API section
4. Create a new API key with Realtime API access
5. Copy the key (starts with `sk-`)

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

1. When you first open the app, you'll see a configuration screen
2. Enter your OpenAI API key
3. The app will validate the key and save it locally
4. You're ready to start translating!

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

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **OpenAI** for the Realtime API and GPT-4 models
- **Expo** for the excellent React Native framework
- **React Native community** for audio and speech libraries

## 📞 Support

For support and questions:

1. Check the troubleshooting section above
2. Review the OpenAI API documentation
3. Create an issue in the repository
4. Contact the development team

---

**Made with ❤️ for real-time communication**
