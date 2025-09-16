import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { validateOpenAIApiKey } from '../utils/apiKeyValidator';

interface Props {
  onConfigComplete: (apiKey: string) => void;
}

export const ConfigScreen: React.FC<Props> = ({ onConfigComplete }) => {
  const [apiKey, setApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadSavedConfig();
  }, []);

  const loadSavedConfig = async () => {
    try {
      const savedApiKey = await AsyncStorage.getItem('openai_api_key');
      if (savedApiKey) {
        setApiKey(savedApiKey);
      }
    } catch (error) {
      console.error('Error loading saved config:', error);
    }
  };

  const validateAndSave = async () => {
    if (!apiKey.trim()) {
      Alert.alert('Error', 'Please enter your OpenAI API key');
      return;
    }

    if (!apiKey.startsWith('sk-')) {
      Alert.alert('Error', 'Invalid API key format. OpenAI API keys start with "sk-"');
      return;
    }

    setIsLoading(true);

    try {
      // Validate using ephemeral client secret endpoint
      const result = await validateOpenAIApiKey(apiKey.trim());
      if (!result.isValid) {
        Alert.alert('Error', `Invalid API key. ${result.error || ''}`.trim());
        return;
      }

      if (!result.hasRealtimeAccess) {
        Alert.alert('Warning', 'API key validated, but Realtime access not detected. You can proceed, but realtime features may not work until access is enabled.');
      }

      // Save the API key
      await AsyncStorage.setItem('openai_api_key', apiKey.trim());
      onConfigComplete(apiKey.trim());
    } catch (error) {
      Alert.alert('Error', 'Failed to validate API key. Please check your internet connection.');
      console.error('API key validation error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const clearSavedData = async () => {
    try {
      await AsyncStorage.removeItem('openai_api_key');
      setApiKey('');
      Alert.alert('Success', 'Saved data cleared');
    } catch (error) {
      console.error('Error clearing saved data:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.gradient}
      >
        <KeyboardAvoidingView
          style={styles.keyboardContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* Header */}
          <View style={styles.header}>
            <Ionicons name="settings" size={48} color="#ffffff" />
            <Text style={styles.title}>Setup Required</Text>
            <Text style={styles.subtitle}>Configure your OpenAI API key to get started</Text>
          </View>

          {/* Configuration Form */}
          <View style={styles.formContainer}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>OpenAI API Key</Text>
              <TextInput
                style={styles.input}
                value={apiKey}
                onChangeText={setApiKey}
                placeholder="sk-..."
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={validateAndSave}
              disabled={isLoading || !apiKey.trim()}
            >
              <Text style={styles.buttonText}>
                {isLoading ? 'Validating...' : 'Save & Continue'}
              </Text>
            </TouchableOpacity>

            {apiKey && (
              <TouchableOpacity
                style={[styles.button, styles.secondaryButton]}
                onPress={clearSavedData}
              >
                <Text style={styles.secondaryButtonText}>Clear Saved Data</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Instructions */}
          <View style={styles.instructionsContainer}>
            <Text style={styles.instructionsTitle}>How to get your API key:</Text>
            <Text style={styles.instructionsText}>
              1. Visit platform.openai.com{'\n'}
              2. Sign in to your account{'\n'}
              3. Go to API section{'\n'}
              4. Create a new API key{'\n'}
              5. Copy and paste it here
            </Text>
            
            <View style={styles.warningContainer}>
              <Ionicons name="warning" size={20} color="#ffcc00" />
              <Text style={styles.warningText}>
                Keep your API key secure. It will be stored locally on your device.
              </Text>
            </View>
          </View>

          {/* Features */}
          <View style={styles.featuresContainer}>
            <Text style={styles.featuresTitle}>What you'll get:</Text>
            <View style={styles.featuresList}>
              <View style={styles.feature}>
                <Ionicons name="mic" size={20} color="#ffffff" />
                <Text style={styles.featureText}>Real-time speech recognition</Text>
              </View>
              <View style={styles.feature}>
                <Ionicons name="language" size={20} color="#ffffff" />
                <Text style={styles.featureText}>English to Nepali translation</Text>
              </View>
              <View style={styles.feature}>
                <Ionicons name="volume-high" size={20} color="#ffffff" />
                <Text style={styles.featureText}>Natural voice synthesis</Text>
              </View>
              <View style={styles.feature}>
                <Ionicons name="headset" size={20} color="#ffffff" />
                <Text style={styles.featureText}>AirPods optimization</Text>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
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
  keyboardContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 15,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#ffffff',
    opacity: 0.8,
    marginTop: 8,
    textAlign: 'center',
  },
  formContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    padding: 25,
    marginBottom: 30,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  button: {
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    marginVertical: 5,
  },
  primaryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    opacity: 0.8,
  },
  instructionsContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
  },
  instructionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 10,
  },
  instructionsText: {
    fontSize: 14,
    color: '#ffffff',
    opacity: 0.8,
    lineHeight: 22,
    marginBottom: 15,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 204, 0, 0.1)',
    borderRadius: 8,
    padding: 12,
  },
  warningText: {
    fontSize: 12,
    color: '#ffffff',
    marginLeft: 8,
    flex: 1,
  },
  featuresContainer: {
    flex: 1,
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 15,
  },
  featuresList: {
    flex: 1,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureText: {
    fontSize: 14,
    color: '#ffffff',
    marginLeft: 12,
    opacity: 0.9,
  },
});
