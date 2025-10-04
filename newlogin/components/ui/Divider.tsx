import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';

interface DividerProps {
  title?: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function Divider({ title, style, textStyle }: DividerProps) {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.line} />
      {title && <Text style={[styles.text, textStyle]}>{title}</Text>}
      <View style={styles.line} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  text: {
    marginHorizontal: 12,
    fontSize: 16,
    fontWeight: '500',
    color: '#8e8e93',
  },
});
