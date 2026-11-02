import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { CheckCircle2, XCircle } from 'lucide-react-native';
import { ThemedText } from '@/components/ThemedText';
import { useColors } from '@/context/ThemeContext';
import type { ThemeColors } from '@/constants/Colors';

export interface ToastMessage {
  id: number;
  tone: 'success' | 'error';
  text: string;
}

interface ToastProps {
  message: ToastMessage | null;
  onHide: () => void;
  durationMs?: number;
}

/** Small banner at the bottom of the screen; the app has no shared toast, so this follows its card styling. */
export function Toast({ message, onHide, durationMs = 3500 }: ToastProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!message) return;
    Animated.timing(opacity, { toValue: 1, duration: 160, useNativeDriver: true }).start();
    const timer = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(({ finished }) => {
        if (finished) onHide();
      });
    }, durationMs);
    return () => clearTimeout(timer);
  }, [message?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!message) return null;
  const isError = message.tone === 'error';
  return (
    <Animated.View style={[styles.wrapper, { opacity }]} pointerEvents="none">
      <View style={[styles.card, isError ? styles.cardError : styles.cardSuccess]}>
        {isError ? <XCircle color={colors.danger} size={20} /> : <CheckCircle2 color="#10B981" size={20} />}
        <ThemedText style={styles.text}>{message.text}</ThemedText>
      </View>
    </Animated.View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    wrapper: { position: 'absolute', left: 16, right: 16, bottom: 24, alignItems: 'center' },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: colors.surface,
      borderWidth: 1,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 6,
      elevation: 6,
      maxWidth: 520,
    },
    cardSuccess: { borderColor: '#10B981' },
    cardError: { borderColor: colors.danger },
    text: { flexShrink: 1, fontSize: 14, color: colors.text, fontWeight: '500' },
  });
