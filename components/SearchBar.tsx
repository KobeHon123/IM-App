import React from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { Search } from 'lucide-react-native';
import { ThemedText } from '@/components/ThemedText';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  rightAction?: { label?: string; icon?: React.ReactNode; onPress: () => void; active?: boolean };
  containerStyle?: ViewStyle;
}

export function SearchBar({ value, onChangeText, placeholder = "Search...", rightAction, containerStyle }: SearchBarProps) {
  return (
    <View style={[styles.container, containerStyle]}>
      <Search color="#6B7280" size={20} style={styles.icon} />
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#6B728080"
      />
      {rightAction && (
        <TouchableOpacity onPress={rightAction.onPress} style={[styles.rightButton, rightAction.active && styles.rightButtonActive]}>
          {rightAction.icon ? rightAction.icon : <ThemedText style={[styles.rightButtonText, rightAction.active && styles.rightButtonTextActive]}>{rightAction.label}</ThemedText>}
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginHorizontal: 16,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  icon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    paddingVertical: 8,
  },
  rightButton: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  rightButtonActive: {
    // no background; icon/text color indicates active state
  },
  rightButtonText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '600',
  },
  rightButtonTextActive: {
    color: '#2563EB',
  },
});