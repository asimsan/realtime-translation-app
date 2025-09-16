import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ConfigScreen } from './src/components/ConfigScreen';
import { TranslationScreen } from './src/components/TranslationScreen';

export default function App() {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSavedApiKey();
  }, []);

  const loadSavedApiKey = async () => {
    try {
      const savedApiKey = await AsyncStorage.getItem('openai_api_key');
      setApiKey(savedApiKey);
    } catch (error) {
      console.error('Error loading API key:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfigComplete = (newApiKey: string) => {
    setApiKey(newApiKey);
  };

  if (isLoading) {
    return null; // Or a loading screen
  }

  return (
    <>
      <StatusBar style="light" />
      {apiKey ? (
        <TranslationScreen apiKey={apiKey} />
      ) : (
        <ConfigScreen onConfigComplete={handleConfigComplete} />
      )}
    </>
  );
}
