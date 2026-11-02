import React from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import type { ThemeColors } from '@/constants/Colors';

export interface PartTypeOption {
  id: string;
  label: string;
}

interface PartTypeSelectorProps {
  options: PartTypeOption[];
  selectedId: string;
  onSelect: (id: string) => void;
  colors: ThemeColors;
}

export function PartTypeSelector({ options, selectedId, onSelect, colors }: PartTypeSelectorProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
      style={{ backgroundColor: colors.background }}
    >
      {options.map((option) => {
        const isSelected = option.id === selectedId;

        return (
          <TouchableOpacity
            key={option.id}
            activeOpacity={0.8}
            onPress={() => onSelect(option.id)}
            style={[
              styles.typeButton,
              { backgroundColor: isSelected ? colors.primarySoft : colors.surface, borderColor: isSelected ? colors.primaryBorder : colors.border },
            ]}
          >
            <ThemedText
              style={[
                styles.typeButtonText,
                { color: isSelected ? colors.primaryText : colors.textStrong },
              ]}
            >
              {option.label}
            </ThemedText>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 4,
    paddingRight: 8,
  },
  typeButton: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginRight: 8,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeButtonText: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
});
