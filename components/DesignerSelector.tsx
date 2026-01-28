import React, { useState, useEffect } from 'react';
import {
  View,
  TextInput,
  FlatList,
  TouchableOpacity,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { X } from 'lucide-react-native';
import { Profile } from '@/types';
import { ThemedText } from '@/components/ThemedText';

interface DesignerSelectorProps {
  value: string;
  onChangeText: (text: string) => void;
  profiles: Profile[];
  // called when user selects a suggestion (profile or custom) from the list
  onSelectProfile?: (name: string) => void;
  placeholder?: string;
  placeholderTextColor?: string;
  inputStyle?: any;
  editable?: boolean;
}

export const DesignerSelector: React.FC<DesignerSelectorProps> = ({
  value,
  onChangeText,
  profiles,
  onSelectProfile,
  placeholder = 'Enter designer name (optional)',
  placeholderTextColor = '#6B728080',
  inputStyle,
  editable = true,
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredProfiles, setFilteredProfiles] = useState<Profile[]>([]);
  const [isSelected, setIsSelected] = useState(() => {
    // Check if the initial value matches a profile name - if so, mark as selected
    if (value && value.trim() !== '') {
      const matchingProfile = profiles.find(
        p => (p.fullName && p.fullName === value) || p.email === value
      );
      return !!matchingProfile || value.trim() !== '';
    }
    return false;
  });

  // Update isSelected when value changes from parent (e.g., when editing modal opens)
  useEffect(() => {
    if (value && value.trim() !== '') {
      const matchingProfile = profiles.find(
        p => (p.fullName && p.fullName === value) || p.email === value
      );
      if (matchingProfile) {
        setIsSelected(true);
      }
    }
  }, [value, profiles]);

  useEffect(() => {
    if (!value || value.trim() === '') {
      setFilteredProfiles([]);
      setShowSuggestions(false);
      setIsSelected(false);
    } else if (!isSelected) {
      // Only filter and show suggestions if not already selected
      const filtered = profiles.filter(
        p =>
          (p.fullName && p.fullName.toLowerCase().includes(value.toLowerCase())) ||
          p.email.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredProfiles(filtered);
      // Show suggestions if there are matching profiles OR if user typed custom text
      setShowSuggestions(true);
    }
  }, [value, profiles, isSelected]);

  const handleSelectProfile = (profile: Profile) => {
    const displayName = profile.fullName || profile.email;
    if (typeof (onSelectProfile as any) === 'function') {
      // parent will handle selection (e.g. add tag and clear input)
      onSelectProfile!(displayName);
      setShowSuggestions(false);
    } else {
      // fallback: update input value and mark selected
      onChangeText(displayName);
      setShowSuggestions(false);
      setIsSelected(true);
    }
  };

  const handleClearSelection = () => {
    onChangeText('');
    setIsSelected(false);
    setShowSuggestions(false);
  };

  const displayName = (profile: Profile) => profile.fullName || profile.email;

  if (isSelected && value && value.trim() !== '') {
    return (
      <View style={styles.container}>
        <View style={[styles.selectedDesignerBox, inputStyle]}>
          <ThemedText style={styles.selectedDesignerText}>{value}</ThemedText>
          {editable && (
            <TouchableOpacity
              onPress={handleClearSelection}
              style={styles.clearButton}
            >
              <X color="#111827" size={18} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.container}>
        <TextInput
          style={[styles.input, inputStyle]}
          value={value || ''}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={placeholderTextColor}
          editable={editable}
          onFocus={() => {
            if (editable && value && value.trim() !== '' && filteredProfiles.length > 0) {
              setShowSuggestions(true);
            }
          }}
        />
        {editable && showSuggestions && value && value.trim() !== '' && (
          <View style={styles.suggestionsContainer}>
            <FlatList
              data={filteredProfiles}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.suggestionItem}
                  onPress={() => handleSelectProfile(item)}
                >
                  <View>
                    <ThemedText style={styles.suggestionName}>{displayName(item)}</ThemedText>
                    <ThemedText style={styles.suggestionEmail}>{item.email}</ThemedText>
                  </View>
                </TouchableOpacity>
              )}
              ListFooterComponent={
                filteredProfiles.length === 0 ? (
                  <TouchableOpacity
                    style={styles.customSuggestionItem}
                    onPress={() => {
                      if (typeof (onSelectProfile as any) === 'function') {
                        onSelectProfile!(value);
                        setShowSuggestions(false);
                      } else {
                        onChangeText(value);
                        setShowSuggestions(false);
                        setIsSelected(true);
                      }
                    }}
                  >
                    <ThemedText style={styles.customSuggestionText}>
                      "{value}" (custom)
                    </ThemedText>
                  </TouchableOpacity>
                ) : null
              }
            />
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },
  selectedDesignerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 48,
  },
  selectedDesignerText: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '600',
    flex: 1,
  },
  clearButton: {
    padding: 4,
    marginLeft: 8,
  },
  suggestionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderTopWidth: 0,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    maxHeight: 200,
    zIndex: 1000,
    marginTop: -1,
  },
  suggestionItem: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  suggestionName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 4,
  },
  suggestionEmail: {
    fontSize: 12,
    color: '#6B7280',
  },
  customSuggestionItem: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#F3F4F6',
  },
  customSuggestionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    fontStyle: 'italic',
  },
});
