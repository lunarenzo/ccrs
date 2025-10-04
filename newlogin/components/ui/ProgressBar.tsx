import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';

interface ProgressBarProps {
  progress: number;
  style?: ViewStyle;
}

export function ProgressBar({ progress, style }: ProgressBarProps) {
  const clampedProgress = Math.min(100, Math.max(0, progress));

  return (
    <View style={[styles.container, style]}>
      <View style={styles.track}>
        <View style={[styles.bar, { width: `${clampedProgress}%` }]} />
      </View>
      <Text style={styles.progressText}>{`${clampedProgress.toFixed(0)}%`}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  track: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E5E5E7',
    marginRight: 8,
  },
  bar: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: '#007AFF',
  },
  progressText: {
    fontSize: 12,
    color: '#333',
    fontWeight: '600',
    minWidth: 35, // Ensure text doesn't jump around
    textAlign: 'right',
  },
});
