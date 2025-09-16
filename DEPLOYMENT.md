# Deployment Guide

## 📱 Building for Production

### iOS Deployment

1. **Prerequisites**
   ```bash
   # Install Xcode from App Store
   # Install Expo CLI
   npm install -g @expo/cli
   ```

2. **Build Configuration**
   ```bash
   # Configure for production
   expo build:ios --type archive
   ```

3. **App Store Connect**
   - Upload to App Store Connect
   - Configure app metadata
   - Submit for review

### Android Deployment

1. **Build APK/AAB**
   ```bash
   # For Play Store (AAB)
   expo build:android --type app-bundle
   
   # For direct distribution (APK)
   expo build:android --type apk
   ```

2. **Google Play Console**
   - Upload to Google Play Console
   - Configure store listing
   - Submit for review

## 🔧 Configuration

### Environment Setup

1. **Copy configuration template**
   ```bash
   cp config.example.json config.json
   ```

2. **Update configuration**
   ```json
   {
     "openai": {
       "apiKey": "YOUR_ACTUAL_API_KEY"
     }
   }
   ```

### Performance Optimization

1. **Audio Settings**
   - Sample Rate: 16kHz (optimal for speech)
   - Channels: Mono (reduces bandwidth)
   - Buffer Size: 1024 bytes (low latency)

2. **Network Optimization**
   - Enable HTTP/2 for WebSocket connections
   - Use compression for audio data
   - Implement retry logic for failed connections

## 🚀 Production Checklist

- [ ] **API Keys**: Replace all development keys with production keys
- [ ] **Permissions**: Verify all audio/microphone permissions are correctly configured
- [ ] **Error Handling**: Ensure robust error handling for network failures
- [ ] **Performance**: Test latency under various network conditions
- [ ] **Battery**: Optimize for battery usage during extended sessions
- [ ] **Privacy**: Ensure compliance with privacy policies
- [ ] **Accessibility**: Test with voice control and accessibility features
- [ ] **Internationalization**: Verify Nepali text rendering and TTS quality

## 📊 Monitoring

### Performance Metrics
- Translation latency (target: <700ms)
- Audio processing time
- Network request timing
- Battery usage
- Memory consumption

### Error Tracking
- API failures
- Audio device connection issues
- WebSocket disconnections
- TTS failures

## 🔒 Security

1. **API Key Protection**
   - Store keys securely on device
   - Never log sensitive data
   - Implement key rotation if needed

2. **Audio Data**
   - Audio is processed in real-time
   - No permanent storage of audio data
   - Comply with OpenAI data usage policies

3. **Network Security**
   - Use HTTPS/WSS for all connections
   - Implement certificate pinning
   - Validate server certificates

## 🐛 Troubleshooting

### Common Issues

1. **High Latency**
   - Check network connection
   - Verify OpenAI API region
   - Monitor audio buffer sizes

2. **Audio Quality**
   - Ensure AirPods are properly connected
   - Check microphone permissions
   - Verify audio session configuration

3. **Translation Accuracy**
   - Test with clear speech
   - Check background noise levels
   - Verify language settings

### Debug Tools

```bash
# Check performance logs
expo logs --platform ios

# Monitor network requests
# Use Flipper or React Native Debugger
```

## 📱 Device Testing

### Recommended Test Devices
- iPhone 12+ with AirPods Pro
- iPhone SE with AirPods (3rd generation)
- Samsung Galaxy S21+ with Galaxy Buds
- Google Pixel 6+ with Pixel Buds

### Test Scenarios
1. **Quiet Environment**: Clear speech, minimal background noise
2. **Noisy Environment**: Restaurant, traffic, multiple speakers
3. **Low Bandwidth**: 3G network, poor WiFi
4. **Extended Sessions**: 30+ minute continuous usage
5. **Device Switching**: Switching between different audio devices

## 📈 Performance Targets

| Metric | Target | Acceptable | Poor |
|--------|--------|------------|------|
| Translation Latency | <500ms | <700ms | >1000ms |
| Audio Processing | <100ms | <200ms | >300ms |
| TTS Generation | <200ms | <400ms | >600ms |
| Battery Usage | <5%/hour | <10%/hour | >15%/hour |
| Memory Usage | <100MB | <200MB | >300MB |

## 🔄 Update Strategy

1. **OTA Updates**: Use Expo Updates for non-native changes
2. **Store Updates**: For native module changes or major features
3. **Rollback Plan**: Maintain previous version for quick rollback
4. **A/B Testing**: Test new features with subset of users

## 📞 Support

### User Support
- In-app troubleshooting guide
- FAQ section for common issues
- Contact form for technical issues
- Performance feedback collection

### Technical Support
- Error reporting and analytics
- Performance monitoring dashboard
- User feedback analysis
- API usage monitoring
