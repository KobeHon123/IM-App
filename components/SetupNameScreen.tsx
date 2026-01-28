import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { ThemedText } from '@/components/ThemedText';

export function SetupNameScreen() {
  const { user, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSaveName = async () => {
    if (!user) return;

    if (!fullName.trim()) {
      setError('Please enter your name');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      await refreshProfile();
    } catch (err: any) {
      console.error('Error updating name:', err);
      setError(err.message || 'Failed to save name. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <View style={styles.headerSection}>
          <View style={styles.iconContainer}>
            <User color="#2563EB" size={48} />
          </View>
          <ThemedText style={styles.title}>Welcome!</ThemedText>
          <ThemedText style={styles.subtitle}>
            Please set your name to get started
          </ThemedText>
        </View>

        <View style={styles.formSection}>
          {error && (
            <View style={styles.errorContainer}>
              <ThemedText style={styles.errorText}>{error}</ThemedText>
            </View>
          )}

          <View style={styles.inputContainer}>
            <ThemedText style={styles.label}>Full Name</ThemedText>
            <TextInput
              style={styles.input}
              placeholder="Enter your full name"
              placeholderTextColor="#9CA3AF"
              value={fullName}
              onChangeText={(text) => {
                setFullName(text);
                setError(null);
              }}
              autoCapitalize="words"
              autoCorrect={false}
              editable={!isLoading}
            />
          </View>

          <TouchableOpacity
            style={[styles.saveButton, isLoading && styles.saveButtonDisabled]}
            onPress={handleSaveName}
            activeOpacity={0.8}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <ThemedText style={styles.saveButtonText}>Continue</ThemedText>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 48,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  formSection: {
    width: '100%',
  },
  errorContainer: {
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#111827',
  },
  saveButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    textAlignVertical: 'center',
  },
});
