import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import Slider from '@react-native-community/slider';
import { ThemedText } from '@/components/ThemedText';
import type { ThemeColors } from '@/constants/Colors';

interface ParameterSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (next: number) => void;
  colors: ThemeColors;
  onReset?: () => void;
}

export function ParameterSlider({
  label,
  value,
  min,
  max,
  step,
  unit = '',
  onChange,
  colors,
  onReset,
}: ParameterSliderProps) {
  return (
    <View style={styles.wrapper}>
      <View style={styles.labelRow}>
        <ThemedText style={[styles.label, { color: colors.textStrong }]}>{label}</ThemedText>
        <View style={styles.valueRow}>
          <ThemedText style={[styles.value, { color: colors.primaryText }]}>
            {Number(value).toFixed(step < 1 ? 2 : 0)}
            {unit}
          </ThemedText>
          {onReset ? (
            <TouchableOpacity onPress={onReset} style={[styles.resetButton, { borderColor: colors.border }]}>
              <ThemedText style={[styles.resetText, { color: colors.textSecondary }]}>Reset</ThemedText>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <Slider
        minimumValue={min}
        maximumValue={max}
        step={step}
        value={value}
        onValueChange={onChange}
        minimumTrackTintColor={colors.primary}
        maximumTrackTintColor={colors.borderStrong}
        thumbTintColor={colors.primary}
        style={styles.slider}
      />

      <View style={styles.rangeRow}>
        <ThemedText style={[styles.rangeText, { color: colors.textMuted }]}>{min}{unit}</ThemedText>
        <ThemedText style={[styles.rangeText, { color: colors.textMuted }]}>Max {max}{unit}</ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 8,
    marginBottom: 18,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  value: {
    fontSize: 15,
    fontWeight: '700',
  },
  resetButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  resetText: {
    fontSize: 11,
    fontWeight: '600',
  },
  slider: {
    width: '100%',
    height: 38,
  },
  rangeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rangeText: {
    fontSize: 11,
  },
});
