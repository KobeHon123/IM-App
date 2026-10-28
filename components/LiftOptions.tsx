import React, { useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { useColors } from '@/context/ThemeContext';
import { LIFT_BRAILLE, LIFT_SURFACES } from '@/lib/floorUtils';
import type { ThemeColors } from '@/constants/Colors';

interface LiftOptionsProps {
  surface?: string;
  braille?: string;
  disabled?: boolean;
  onChange: (next: { surface?: string; braille?: string }) => void;
}

export function LiftOptions({ surface, braille, disabled, onChange }: LiftOptionsProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const renderOptions = (label: string, options: readonly string[], value: string | undefined, key: 'surface' | 'braille') => (
    <View style={styles.group}>
      <ThemedText style={styles.label}>{label}</ThemedText>
      <View style={styles.row}>
        {options.map((option) => (
          <TouchableOpacity
            key={option}
            style={[styles.option, value === option && styles.optionSelected, disabled && styles.optionDisabled]}
            onPress={() => !disabled && onChange({ surface, braille, [key]: value === option ? undefined : option })}
            disabled={disabled}
          >
            <ThemedText style={[styles.optionText, value === option && styles.optionTextSelected]}>{option}</ThemedText>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <>
      {renderOptions('Surface', LIFT_SURFACES, surface, 'surface')}
      {renderOptions('Braille', LIFT_BRAILLE, braille, 'braille')}
    </>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    group: { marginBottom: 20 },
    label: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 8 },
    row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    option: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.borderStrong,
      backgroundColor: colors.surface,
    },
    optionSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
    optionDisabled: { opacity: 0.5 },
    optionText: { fontSize: 14, fontWeight: '500', color: colors.textStrong },
    optionTextSelected: { color: '#FFFFFF' },
  });
