import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { validateBackendService, getBackendUrl } from '../utils/backendValidator';

interface Props {
  onConfigComplete: () => void;
}

export const ConfigScreen: React.FC<Props> = ({ onConfigComplete }) => {
  const [backendStatus, setBackendStatus] = useState({
    isHealthy: false,
    hasRealtimeAccess: false,
    backendReachable: false,
    error: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [backendUrl] = useState(getBackendUrl());

  useEffect(() => {
    checkBackendStatus();
  }, []);

  const checkBackendStatus = async () => {
    setIsLoading(true);
    try {
      const status = await validateBackendService(backendUrl);
      setBackendStatus(status);
    } catch (error) {
      console.error('Error checking backend status:', error);
      setBackendStatus({
        isHealthy: false,
        hasRealtimeAccess: false,
        backendReachable: false,
        error: 'Failed to check backend status',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const continueWithBackend = async () => {
    if (!backendStatus.backendReachable) {
      Alert.alert(
        'Backend Unavailable', 
        'The translation backend service is not reachable. Please ensure the backend server is running and try again.',
        [
          { text: 'Retry', onPress: checkBackendStatus },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
      return;
    }

    if (!backendStatus.isHealthy) {
      Alert.alert(
        'Backend Issues', 
        `The backend service has issues: ${backendStatus.error || 'Unknown error'}. You can continue but some features may not work.`,
        [
          { text: 'Continue Anyway', onPress: () => onConfigComplete() },
          { text: 'Retry', onPress: checkBackendStatus },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
      return;
    }

    if (!backendStatus.hasRealtimeAccess) {
      Alert.alert(
        'Limited Features', 
        'Backend is healthy but Realtime API access is not available. You can use text translation but not real-time voice features.',
        [
          { text: 'Continue', onPress: () => onConfigComplete() },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
      return;
    }

    // All good - proceed
    try {
      await AsyncStorage.setItem('backend_configured', 'true');
      onConfigComplete();
    } catch (error) {
      console.error('Error saving config:', error);
      onConfigComplete(); // Continue anyway
    }
  };

  const clearSavedData = async () => {
    try {
      await AsyncStorage.removeItem('backend_configured');
      Alert.alert('Success', 'Configuration cleared');
      checkBackendStatus(); // Refresh status
    } catch (error) {
      console.error('Error clearing saved data:', error);
    }
  };

  const getStatusIcon = () => {
    if (isLoading) return 'refresh';
    if (!backendStatus.backendReachable) return 'cloud-offline';
    if (!backendStatus.isHealthy) return 'warning';
    if (!backendStatus.hasRealtimeAccess) return 'checkmark-circle-outline';
    return 'checkmark-circle';
  };

  const getStatusColor = () => {
    if (isLoading) return '#ffffff';
    if (!backendStatus.backendReachable) return '#ff6b6b';
    if (!backendStatus.isHealthy) return '#ffa500';
    if (!backendStatus.hasRealtimeAccess) return '#ffcc00';
    return '#4caf50';
  };

  const getStatusText = () => {
    if (isLoading) return 'Checking backend status...';
    if (!backendStatus.backendReachable) return 'Backend service unavailable';
    if (!backendStatus.isHealthy) return 'Backend has issues';
    if (!backendStatus.hasRealtimeAccess) return 'Limited features available';
    return 'All systems ready';
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
            {isLoading ? (
              <ActivityIndicator size="large" color="#ffffff" />
            ) : (
              <Ionicons name={getStatusIcon()} size={48} color={getStatusColor()} />
            )}
            <Text style={styles.title}>Backend Connection</Text>
            <Text style={styles.subtitle}>Checking translation service status</Text>
          </View>

          {/* Status Display */}
          <View style={styles.formContainer}>
            <View style={styles.statusContainer}>
              <Text style={styles.label}>Service Status</Text>
              <View style={styles.statusRow}>
                <Ionicons name={getStatusIcon()} size={24} color={getStatusColor()} />
                <Text style={[styles.statusText, { color: getStatusColor() }]}>
                  {getStatusText()}
                </Text>
              </View>
              
              {backendStatus.error && (
                <Text style={styles.errorText}>{backendStatus.error}</Text>
              )}
              
              <View style={styles.detailsContainer}>
                <Text style={styles.detailsTitle}>Backend URL:</Text>
                <Text style={styles.detailsText}>{backendUrl}</Text>
                
                <View style={styles.checklistContainer}>
                  <View style={styles.checklistItem}>
                    <Ionicons 
                      name={backendStatus.backendReachable ? "checkmark-circle" : "close-circle"} 
                      size={16} 
                      color={backendStatus.backendReachable ? "#4caf50" : "#ff6b6b"} 
                    />
                    <Text style={styles.checklistText}>Backend Reachable</Text>
                  </View>
                  
                  <View style={styles.checklistItem}>
                    <Ionicons 
                      name={backendStatus.isHealthy ? "checkmark-circle" : "close-circle"} 
                      size={16} 
                      color={backendStatus.isHealthy ? "#4caf50" : "#ff6b6b"} 
                    />
                    <Text style={styles.checklistText}>OpenAI API Valid</Text>
                  </View>
                  
                  <View style={styles.checklistItem}>
                    <Ionicons 
                      name={backendStatus.hasRealtimeAccess ? "checkmark-circle" : "close-circle"} 
                      size={16} 
                      color={backendStatus.hasRealtimeAccess ? "#4caf50" : "#ff6b6b"} 
                    />
                    <Text style={styles.checklistText}>Realtime API Access</Text>
                  </View>
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={continueWithBackend}
              disabled={isLoading || !backendStatus.backendReachable}
            >
              <Text style={styles.buttonText}>
                {isLoading ? 'Checking...' : 'Continue'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={checkBackendStatus}
              disabled={isLoading}
            >
              <Text style={styles.secondaryButtonText}>Retry Connection</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={clearSavedData}
            >
              <Text style={styles.secondaryButtonText}>Clear Config</Text>
            </TouchableOpacity>
          </View>

          {/* Instructions */}
          <View style={styles.instructionsContainer}>
            <Text style={styles.instructionsTitle}>Backend Service Info:</Text>
            <Text style={styles.instructionsText}>
              Backend handles all OpenAI API communication{'\n'}
              No API keys needed on your device{'\n'}
              Secure server-side processing{'\n'}
              Automatic rate limiting and error handling
            </Text>
            
            <View style={styles.warningContainer}>
              <Ionicons name="shield-checkmark" size={20} color="#4caf50" />
              <Text style={styles.warningText}>
                Your API keys are secure on the backend server. No sensitive data is stored on your device.
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
  statusContainer: {
    marginBottom: 20,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  errorText: {
    fontSize: 12,
    color: '#ff6b6b',
    marginTop: 5,
    fontStyle: 'italic',
  },
  detailsContainer: {
    marginTop: 15,
    padding: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
  },
  detailsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 5,
  },
  detailsText: {
    fontSize: 12,
    color: '#ffffff',
    opacity: 0.8,
    fontFamily: 'monospace',
    marginBottom: 15,
  },
  checklistContainer: {
    gap: 8,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checklistText: {
    fontSize: 14,
    color: '#ffffff',
    marginLeft: 8,
    opacity: 0.9,
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
