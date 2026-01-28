import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Lock } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { ThemedText } from '@/components/ThemedText';

export function ResetPasswordScreen() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleUpdatePassword = async () => {
    if (!password.trim()) {
      setError('Please enter a new password');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const { error } = await supabase.auth.updateUser({
        password: password.trim(),
      });

      if (error) throw error;

      setSuccess(true);
    } catch (err: any) {
      console.error('Update password error', err);
      setError(err.message || 'Failed to update password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <View style={styles.headerSection}>
            <View style={styles.logoContainer}>
              <ThemedText style={styles.logoText}>Immune Manager</ThemedText>
            </View>
            <ThemedText style={styles.title}>Password Updated</ThemedText>
            <ThemedText style={styles.subtitle}>
              Your password has been successfully updated. You can now sign in with your new password.
            </ThemedText>
          </View>

          <View style={styles.successContainer}>
            <ThemedText style={styles.successText}>Password updated successfully!</ThemedText>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <View style={styles.headerSection}>
          <View style={styles.logoContainer}>
            <ThemedText style={styles.logoText}>Immune Manager</ThemedText>
          </View>
          <ThemedText style={styles.title}>Set New Password</ThemedText>
          <ThemedText style={styles.subtitle}>
            Enter your new password below
          </ThemedText>
        </View>

        <View style={styles.formSection}>
          {error && (
            <View style={styles.errorContainer}>
              <ThemedText style={styles.errorText}>{error}</ThemedText>
            </View>
          )}

          <View style={styles.inputContainer}>
            <View style={styles.inputWrapper}>
              <Lock color="#6B7280" size={20} />
              <TextInput
                style={styles.input}
                placeholder="New Password"
                placeholderTextColor="#9CA3AF"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  setError(null);
                }}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
            </View>

            <View style={styles.inputWrapper}>
              <Lock color="#6B7280" size={20} />
              <TextInput
                style={styles.input}
                placeholder="Confirm New Password"
                placeholderTextColor="#9CA3AF"
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  setError(null);
                }}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.updateButton, isLoading && styles.updateButtonDisabled]}
            onPress={handleUpdatePassword}
            activeOpacity={0.8}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <ThemedText style={styles.updateButtonText}>Update Password</ThemedText>
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
  logoContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  logoText: {
    fontSize: 32,
    fontWeight: '800',
    color: '#2563EB',
    letterSpacing: -0.5,
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
    marginBottom: 32,
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
  successContainer: {
    backgroundColor: '#D1FAE5',
    padding: 16,
    borderRadius: 12,
    marginTop: 24,
  },
  successText: {
    color: '#065F46',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '600',
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#111827',
  },
  updateButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  updateButtonDisabled: {
    opacity: 0.6,
  },
  updateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
