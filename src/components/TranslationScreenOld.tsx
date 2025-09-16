import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  Animated,
  Dimensions,
  StatusBar,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { TranslationService } from '../services/TranslationService';
import { TranslationState, OpenAIConfig } from '../types';
import { validateBackendService, testRealtimeConnection, getBackendUrl } from '../utils/backendValidator';
import { AudioVisualizer } from './AudioVisualizer';

const { width, height } = Dimensions.get('window');

interface Props {}

export const TranslationScreen: React.FC<Props> = () => {
  const [translationState, setTranslationState] = useState<TranslationState>({
    isRecording: false,
    isTranslating: false,
    isPlaying: false,
    currentText: '',
    translatedText: '',
    error: null,
  });

  const translationService = useRef<TranslationService | null>(null);
  const pulseAnimation = useRef(new Animated.Value(1)).current;
  const waveAnimation = useRef(new Animated.Value(0)).current;
  const fadeInAnimation = useRef(new Animated.Value(0)).current;
  const slideUpAnimation = useRef(new Animated.Value(50)).current;
  const scaleAnimation = useRef(new Animated.Value(0.95)).current;
  const rotateAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    initializeService();
    startInitialAnimations();
    return () => {
      translationService.current?.stop();
    };
  }, []);

  useEffect(() => {
    if (translationState.isRecording) {
      startRecordingAnimations();
    } else {
      stopRecordingAnimations();
    }
  }, [translationState.isRecording]);

  useEffect(() => {
    if (translationState.isTranslating) {
      startTranslatingAnimations();
    } else {
      stopTranslatingAnimations();
    }
  }, [translationState.isTranslating]);

  const initializeService = async () => {
    try {
      console.log('🚀 Initializing translation service...');
      
      const backendUrl = getBackendUrl();
      
      // Step 1: Validate backend service
      console.log('🔍 Step 1: Validating backend service...');
      const backendStatus = await validateBackendService(backendUrl);
      
      if (!backendStatus.backendReachable) {
        throw new Error('Backend service is not reachable. Please ensure the backend server is running.');
      }
      
      if (!backendStatus.isHealthy) {
        console.warn('⚠️ Backend service has issues:', backendStatus.error);
        Alert.alert(
          'Backend Issues', 
          `Backend service has issues: ${backendStatus.error}. You can continue but some features may not work.`,
          [
            { text: 'Continue Anyway', style: 'default' },
            { text: 'Cancel', style: 'cancel', onPress: () => { return; } }
          ]
        );
      }
      
      if (!backendStatus.hasRealtimeAccess) {
        console.warn('⚠️ Realtime access not available');
        Alert.alert(
          'Limited Features', 
          'Realtime API access is not available. You can use text translation but not real-time voice features.',
          [
            { text: 'Continue', style: 'default' },
            { text: 'Cancel', style: 'cancel', onPress: () => { return; } }
          ]
        );
      }
      
      // Step 2: Test WebSocket connection
      console.log('🔍 Step 2: Testing Realtime WebSocket connection...');
      const connectionTest = await testRealtimeConnection(backendUrl);
      
      if (!connectionTest.canConnect) {
        console.warn('⚠️ Realtime connection test failed:', connectionTest.error);
        // Don't throw here - allow fallback to text translation
      }
      
      console.log('✅ Backend validation passed, initializing service...');
      
      const config: OpenAIConfig = {
        model: 'gpt-realtime',
        voice: 'alloy',
        backendUrl,
      };

      translationService.current = new TranslationService(config, setTranslationState);
      await translationService.current.initialize();
      console.log('✅ Translation service initialized successfully');
    } catch (error) {
      console.error('❌ Initialization failed:', error);
      Alert.alert('Initialization Error', `Failed to initialize translation service: ${error.message}`);
    }
  };

  const startInitialAnimations = () => {
    Animated.parallel([
      Animated.timing(fadeInAnimation, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideUpAnimation, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnimation, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const startRecordingAnimations = () => {
    // Smooth pulsing animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnimation, {
          toValue: 1.05,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnimation, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Gentle wave animation
    Animated.loop(
      Animated.timing(waveAnimation, {
        toValue: 1,
        duration: 2500,
        useNativeDriver: true,
      })
    ).start();
  };

  const stopRecordingAnimations = () => {
    pulseAnimation.stopAnimation();
    waveAnimation.stopAnimation();
    
    Animated.parallel([
      Animated.spring(pulseAnimation, {
        toValue: 1,
        tension: 120,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(waveAnimation, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const startTranslatingAnimations = () => {
    Animated.loop(
      Animated.timing(rotateAnimation, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      })
    ).start();
  };

  const stopTranslatingAnimations = () => {
    rotateAnimation.stopAnimation();
    Animated.timing(rotateAnimation, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const handleRecordPress = async () => {
    console.log('🎤 Record button pressed');
    console.log('🔍 Translation service exists:', !!translationService.current);
    console.log('🔍 Current recording state:', translationState.isRecording);

    try {
      // Initialize service if it doesn't exist
      if (!translationService.current) {
        console.log('🔄 Translation service not initialized, initializing now...');
        await initializeService();
        
        if (!translationService.current) {
          console.error('❌ Failed to initialize translation service');
          Alert.alert('Error', 'Failed to initialize translation service. Please check your API key.');
          return;
        }
        console.log('✅ Translation service initialized successfully');
      }

      if (translationState.isRecording) {
        console.log('🛑 Stopping recording...');
        await translationService.current.stopTranslation();
        console.log('✅ Recording stopped');
      } else {
        console.log('🎤 Starting recording...');
        await translationService.current.startTranslation();
        console.log('✅ Recording started');
      }
    } catch (error) {
      console.error('❌ Failed to toggle recording:', error);
      console.error('❌ Error details:', error.message);
      console.error('❌ Error stack:', error.stack);
      Alert.alert('Error', `Failed to toggle recording: ${error.message}`);
    }
  };

  const handlePlayTranslation = async () => {
    if (!translationService.current || !translationState.translatedText) return;

    try {
      await translationService.current.speakTranslation();
    } catch (error) {
      Alert.alert('Error', 'Failed to play translation');
      console.error(error);
    }
  };

  const getRecordButtonText = () => {
    if (translationState.isRecording) return 'Stop Recording';
    if (translationState.isTranslating) return 'Processing...';
    return 'Start Recording';
  };

  const getStatusText = () => {
    if (translationState.isRecording) return 'Listening...';
    if (translationState.isTranslating) return 'Translating...';
    if (translationState.isPlaying) return 'Playing...';
    return 'Ready to translate';
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.gradient}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>🇩🇪 Deutsch • 🇬🇧 English • 🇳🇵 नेपाली</Text>
          <Text style={styles.subtitle}>Multilingual Real-time Translation</Text>
        </View>

        {/* Status */}
        <View style={styles.statusContainer}>
          <Text style={styles.statusText}>{getStatusText()}</Text>
          {translationState.error && (
            <Text style={styles.errorText}>{translationState.error}</Text>
          )}
        </View>

        {/* Visual Feedback */}
        <View style={styles.visualContainer}>
          {translationState.isRecording && (
            <>
              <Animated.View
                style={[
                  styles.waveCircle,
                  {
                    transform: [{ scale: pulseAnimation }],
                    opacity: waveAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.3, 0.1],
                    }),
                  },
                ]}
              />
              <Animated.View
                style={[
                  styles.waveCircle,
                  styles.waveCircle2,
                  {
                    transform: [{ scale: pulseAnimation }],
                    opacity: waveAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.2, 0.05],
                    }),
                  },
                ]}
              />
            </>
          )}
        </View>

        {/* Main Content */}
        <View style={styles.contentContainer}>
          {/* Input Text */}
          <View style={styles.textContainer}>
            <View style={styles.labelContainer}>
              <Text style={styles.languageLabel}>Input</Text>
              <View style={styles.transcriptionBadge}>
                <Ionicons 
                  name="mic" 
                  size={12} 
                  color="#4caf50" 
                  style={styles.transcriptionIcon} 
                />
                <Text style={styles.transcriptionLabel}>Whisper</Text>
              </View>
            </View>
            <View style={[
              styles.textBox,
              translationState.isRecording && styles.textBoxRecording
            ]}>
              <Text style={[
                styles.text,
                translationState.isRecording && styles.textRecording
              ]}>
                {translationState.currentText || (
                  translationState.isRecording 
                    ? 'Listening...' 
                    : 'Speak in German, English, or Nepali...'
                )}
              </Text>
              {translationState.isRecording && (
                <View style={styles.recordingIndicator}>
                  <Ionicons name="radio-button-on" size={8} color="#ff4444" />
                  <Text style={styles.recordingText}>Recording</Text>
                </View>
              )}
            </View>
          </View>

          {/* Arrow */}
          <View style={styles.arrowContainer}>
            <Ionicons name="arrow-down" size={24} color="#ffffff" />
          </View>

          {/* Translation Text */}
          <View style={styles.textContainer}>
            <Text style={styles.languageLabel}>Translation</Text>
            <View style={styles.textBox}>
              <Text style={styles.text}>
                {translationState.translatedText || 'Translation will appear here...'}
              </Text>
              {translationState.translatedText && (
                <TouchableOpacity
                  style={styles.playButton}
                  onPress={handlePlayTranslation}
                  disabled={translationState.isPlaying}
                >
                  <Ionicons
                    name={translationState.isPlaying ? "volume-high" : "play"}
                    size={20}
                    color="#667eea"
                  />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* Audio Visualizer */}
        <View style={styles.visualizerContainer}>
          <AudioVisualizer 
            isRecording={translationState.isRecording}
            audioLevel={0.5} // You can connect this to actual audio level
          />
        </View>

        {/* Record Button */}
        <View style={styles.recordContainer}>
          <TouchableOpacity
            style={[
              styles.recordButton,
              translationState.isRecording && styles.recordButtonActive,
            ]}
            onPress={handleRecordPress}
            disabled={translationState.isTranslating}
          >
            <Animated.View
              style={[
                styles.recordButtonInner,
                { transform: [{ scale: translationState.isRecording ? pulseAnimation : 1 }] },
              ]}
            >
              <Ionicons
                name={translationState.isRecording ? "stop" : "mic"}
                size={32}
                color="#ffffff"
              />
            </Animated.View>
          </TouchableOpacity>
          <Text style={styles.recordButtonText}>{getRecordButtonText()}</Text>
        </View>

        {/* Translation Rules */}
        <View style={styles.rulesContainer}>
          <Text style={styles.rulesTitle}>Translation Directions:</Text>
          <View style={styles.ruleItem}>
            <Text style={styles.ruleText}>🇳🇵 नेपाली → 🇬🇧 English</Text>
          </View>
          <View style={styles.ruleItem}>
            <Text style={styles.ruleText}>🇩🇪 Deutsch → 🇳🇵 नेपाली</Text>
          </View>
          <View style={styles.ruleItem}>
            <Text style={styles.ruleText}>🇬🇧 English → 🇳🇵 नेपाली</Text>
          </View>
        </View>

        {/* Instructions */}
        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionsText}>
            • Connect your AirPods for best experience{'\n'}
            • Speak in German, English, or Nepali - auto-detected{'\n'}
            • Real-time chunk translation for continuous speech{'\n'}
            • Translation will play automatically
          </Text>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#ffffff',
    opacity: 0.8,
    marginTop: 5,
  },
  statusContainer: {
    alignItems: 'center',
    paddingVertical: 15,
  },
  statusText: {
    fontSize: 18,
    color: '#ffffff',
    fontWeight: '500',
  },
  errorText: {
    fontSize: 14,
    color: '#ff6b6b',
    marginTop: 5,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  visualContainer: {
    position: 'absolute',
    top: height * 0.3,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 0,
  },
  waveCircle: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#ffffff',
  },
  waveCircle2: {
    width: 300,
    height: 300,
    borderRadius: 150,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
    zIndex: 1,
  },
  textContainer: {
    marginVertical: 15,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  languageLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    opacity: 0.9,
  },
  transcriptionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  transcriptionIcon: {
    marginRight: 4,
  },
  transcriptionLabel: {
    fontSize: 10,
    color: '#4caf50',
    fontWeight: '600',
  },
  textBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    padding: 20,
    minHeight: 80,
    position: 'relative',
  },
  textBoxRecording: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  text: {
    fontSize: 16,
    color: '#ffffff',
    lineHeight: 24,
  },
  textRecording: {
    color: '#e8f5e8',
  },
  recordingIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 68, 68, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  recordingText: {
    fontSize: 10,
    color: '#ff4444',
    fontWeight: '600',
    marginLeft: 4,
  },
  playButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    width: 35,
    height: 35,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowContainer: {
    alignItems: 'center',
    marginVertical: 10,
  },
  visualizerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
  },
  recordContainer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  recordButtonActive: {
    backgroundColor: 'rgba(255, 107, 107, 0.3)',
    borderColor: 'rgba(255, 107, 107, 0.5)',
  },
  recordButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordButtonText: {
    fontSize: 16,
    color: '#ffffff',
    marginTop: 10,
    fontWeight: '500',
  },
  rulesContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  rulesTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
  },
  ruleItem: {
    paddingVertical: 4,
  },
  ruleText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 22,
  },
  instructionsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  instructionsText: {
    fontSize: 14,
    color: '#ffffff',
    opacity: 0.7,
    textAlign: 'center',
    lineHeight: 20,
  },
});
