import React, { useMemo, useRef, useState } from 'react';
import { LayoutChangeEvent, PanResponder, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { useColors } from '@/context/ThemeContext';
import type { ThemeColors } from '@/constants/Colors';
import type { SliderParamSpec } from '@/lib/3d-lab/types';

interface ParameterSliderProps {
  spec: SliderParamSpec;
  value: number;
  onChange: (value: number) => void;
  /** called when the finger is lifted (use it for the expensive work) */
  onChangeEnd?: (value: number) => void;
  disabled?: boolean;
}

const THUMB = 26;

/**
 * Plain JS slider (no native module, so it also works in the installed app without a new build).
 * Drag anywhere on the track; tapping the track jumps there.
 */
export function ParameterSlider({ spec, value, onChange, onChangeEnd, disabled }: ParameterSliderProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [width, setWidth] = useState(0);
  const latest = useRef({ spec, value, onChange, onChangeEnd, width, disabled });
  latest.current = { spec, value, onChange, onChangeEnd, width, disabled };
  const startRatio = useRef(0);

  const toValue = (ratio: number) => {
    const { spec: s } = latest.current;
    const raw = s.min + Math.min(1, Math.max(0, ratio)) * (s.max - s.min);
    const snapped = Math.round(raw / s.step) * s.step;
    return Math.min(s.max, Math.max(s.min, Number(snapped.toFixed(6))));
  };

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !latest.current.disabled,
        onMoveShouldSetPanResponder: () => !latest.current.disabled,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (evt) => {
          const { width: w } = latest.current;
          if (w <= 0) return;
          startRatio.current = (evt.nativeEvent.locationX - THUMB / 2) / (w - THUMB);
          latest.current.onChange(toValue(startRatio.current));
        },
        onPanResponderMove: (_evt, gesture) => {
          const { width: w } = latest.current;
          if (w <= 0) return;
          latest.current.onChange(toValue(startRatio.current + gesture.dx / (w - THUMB)));
        },
        onPanResponderRelease: (_evt, gesture) => {
          const { width: w, onChangeEnd: end } = latest.current;
          if (w <= 0) return;
          end?.(toValue(startRatio.current + gesture.dx / (w - THUMB)));
        },
      }),
    []
  );

  const ratio = (value - spec.min) / (spec.max - spec.min);
  const left = Math.min(1, Math.max(0, ratio)) * Math.max(0, width - THUMB);
  const shown = `${value.toFixed(spec.decimals)} ${spec.unit}`;
  const atDefault = Math.abs(value - spec.default) < spec.step / 2;

  const nudge = (direction: 1 | -1) => {
    const next = toValue((value + direction * spec.step - spec.min) / (spec.max - spec.min));
    onChange(next);
    onChangeEnd?.(next);
  };

  return (
    <View style={[styles.container, disabled && styles.disabled]}>
      <View style={styles.header}>
        <ThemedText style={styles.label}>{spec.label}</ThemedText>
        <ThemedText style={styles.value}>{shown}</ThemedText>
      </View>

      <View
        style={styles.touchArea}
        onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={spec.label}
        accessibilityValue={{ min: spec.min, max: spec.max, now: value, text: shown }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => nudge(e.nativeEvent.actionName === 'increment' ? 1 : -1)}
        {...pan.panHandlers}
      >
        <View style={styles.track} pointerEvents="none">
          <View style={[styles.fill, { width: left + THUMB / 2 }]} />
        </View>
        <View style={[styles.thumb, { left }]} pointerEvents="none" />
      </View>

      <View style={styles.footer}>
        <ThemedText style={styles.hint}>
          {spec.min} {spec.unit}
        </ThemedText>
        <TouchableOpacity
          onPress={() => {
            onChange(spec.default);
            onChangeEnd?.(spec.default);
          }}
          disabled={atDefault || disabled}
          hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
        >
          <ThemedText style={[styles.reset, atDefault && styles.resetDisabled]}>Reset to default ({spec.default}{spec.unit ? ` ${spec.unit}` : ''})</ThemedText>
        </TouchableOpacity>
        <ThemedText style={styles.hint}>
          {spec.max} {spec.unit}
        </ThemedText>
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: { marginBottom: 18 },
    disabled: { opacity: 0.5 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 },
    label: { fontSize: 14, fontWeight: '600', color: colors.text },
    value: { fontSize: 16, fontWeight: '700', color: colors.primaryText },
    touchArea: { height: 40, justifyContent: 'center' },
    track: { height: 6, borderRadius: 3, backgroundColor: colors.surfaceStrong, overflow: 'hidden' },
    fill: { height: 6, backgroundColor: colors.primary },
    thumb: {
      position: 'absolute',
      top: (40 - THUMB) / 2,
      width: THUMB,
      height: THUMB,
      borderRadius: THUMB / 2,
      backgroundColor: '#FFFFFF',
      borderWidth: 2,
      borderColor: colors.primary,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.25,
      shadowRadius: 2,
      elevation: 3,
    },
    footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    hint: { fontSize: 11, color: colors.textMuted },
    reset: { fontSize: 12, fontWeight: '600', color: colors.primaryText },
    resetDisabled: { color: colors.textMuted },
  });
