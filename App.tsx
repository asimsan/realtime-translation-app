import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ConfigScreen } from './src/components/ConfigScreen';
import { TranslationScreen } from './src/components/TranslationScreen';

export default function App() {
  const [isConfigured, setIsConfigured] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSavedConfig();
  }, []);

  const loadSavedConfig = async () => {
    try {
      const configured = await AsyncStorage.getItem('backend_configured');
      setIsConfigured(configured === 'true');
    } catch (error) {
      console.error('Error loading config:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfigComplete = () => {
    setIsConfigured(true);
  };

  if (isLoading) {
    return null; // Or a loading screen
  }

  return (
    <>
      <StatusBar style="light" />
      {isConfigured ? (
        <TranslationScreen />
      ) : (
        <ConfigScreen onConfigComplete={handleConfigComplete} />
      )}
    </>
  );
}
