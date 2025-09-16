import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';

interface AudioVisualizerProps {
  isRecording: boolean;
  audioLevel?: number; // 0-1 intensity
  barCount?: number;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  isRecording,
  audioLevel = 0,
  barCount = 5,
}) => {
  const animatedValues = useRef(
    Array.from({ length: barCount }, () => new Animated.Value(0.1))
  ).current;

  useEffect(() => {
    if (isRecording) {
      // Create animated frequency bars
      const animations = animatedValues.map((animatedValue, index) => {
        const delay = index * 100; // Stagger the animations
        const intensity = Math.max(0.1, audioLevel + Math.random() * 0.3);
        
        return Animated.loop(
          Animated.sequence([
            Animated.timing(animatedValue, {
              toValue: intensity,
              duration: 300 + Math.random() * 200,
              useNativeDriver: false,
            }),
            Animated.timing(animatedValue, {
              toValue: 0.1,
              duration: 300 + Math.random() * 200,
              useNativeDriver: false,
            }),
          ]),
          { iterations: -1 }
        );
      });

      // Start all animations with delays
      animations.forEach((animation, index) => {
        setTimeout(() => animation.start(), index * 50);
      });

      return () => {
        animations.forEach(animation => animation.stop());
      };
    } else {
      // Reset all bars to minimum height when not recording
      animatedValues.forEach(animatedValue => {
        Animated.timing(animatedValue, {
          toValue: 0.1,
          duration: 200,
          useNativeDriver: false,
        }).start();
      });
    }
  }, [isRecording, audioLevel, animatedValues]);

  return (
    <View style={styles.container}>
      <View style={styles.barsContainer}>
        {animatedValues.map((animatedValue, index) => (
          <Animated.View
            key={index}
            style={[
              styles.bar,
              {
                height: animatedValue.interpolate({
                  inputRange: [0, 1],
                  outputRange: [4, 40],
                  extrapolate: 'clamp',
                }),
                opacity: isRecording ? 1 : 0.3,
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    paddingVertical: 5,
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    height: 40,
    gap: 3,
  },
  bar: {
    width: 4,
    backgroundColor: '#ffffff',
    borderRadius: 2,
    minHeight: 4,
  },
});
