import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { useColors } from '@/context/ThemeContext';
import type { ThemeColors } from '@/constants/Colors';

export interface PartTypeOption<T extends string = string> {
  value: T;
  label: string;
}

interface PartTypeSelectorProps<T extends string> {
  options: ReadonlyArray<PartTypeOption<T>>;
  value: T;
  onChange: (value: T) => void;
  /** greys the selector out and ignores taps (e.g. when the type is fixed by an existing part) */
  disabled?: boolean;
}

/**
 * Horizontally swipeable "Part Type" chips. Extracted from the Create New Part modal on the venue screen
 * (look, selected state and disabled state are unchanged) so the 3D Lab can reuse it.
 */
export function PartTypeSelector<T extends string>({ options, value, onChange, disabled = false }: PartTypeSelectorProps<T>) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={[styles.typeContainer, disabled && styles.disabledTypeContainer]}
    >
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <TouchableOpacity
            key={option.value}
            style={[styles.typeButton, selected && styles.selectedTypeButton, disabled && styles.disabledTypeButton]}
            onPress={() => !disabled && onChange(option.value)}
            disabled={disabled}
          >
            <ThemedText
              style={[styles.typeButtonText, selected && styles.selectedTypeButtonText, disabled && styles.disabledTypeButtonText]}
            >
              {option.label}
            </ThemedText>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    typeContainer: {
      flexDirection: 'row',
    },
    typeButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: colors.surfaceMuted,
      borderRadius: 8,
      marginRight: 8,
    },
    selectedTypeButton: {
      backgroundColor: colors.primary,
    },
    typeButtonText: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    selectedTypeButtonText: {
      color: '#FFFFFF',
    },
    disabledTypeContainer: {
      opacity: 0.6,
    },
    disabledTypeButton: {
      opacity: 0.6,
      backgroundColor: colors.surfaceStrong,
    },
    disabledTypeButtonText: {
      color: colors.textMuted,
    },
  });
