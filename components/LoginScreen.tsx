import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mail, Lock } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { ThemedText } from '@/components/ThemedText';

export function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password: password.trim(),
        });

        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password.trim(),
        });

        if (error) throw error;
      }
    } catch (err: any) {
      console.error('Auth error', err);
      setError(err.message || 'Failed to authenticate. Please try again.');
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
          <View style={styles.logoContainer}>
            <ThemedText style={styles.logoText}>Immune Manager</ThemedText>
          </View>
          <ThemedText style={styles.title}>
            {isSignUp ? 'Create Account' : 'Welcome Back'}
          </ThemedText>
          <ThemedText style={styles.subtitle}>
            {isSignUp ? 'Sign up to get started' : 'Sign in to continue'}
          </ThemedText>
        </View>

        <View style={styles.loginSection}>
          {error && (
            <View style={styles.errorContainer}>
              <ThemedText style={styles.errorText}>{error}</ThemedText>
            </View>
          )}

          <View style={styles.inputContainer}>
            <View style={styles.inputWrapper}>
              <Mail color="#6B7280" size={20} />
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="#9CA3AF"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  setError(null);
                }}
                autoCapitalize="none"
                keyboardType="email-address"
                autoCorrect={false}
                editable={!isLoading}
              />
            </View>

            <View style={styles.inputWrapper}>
              <Lock color="#6B7280" size={20} />
              <TextInput
                style={styles.input}
                placeholder="Password"
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
          </View>

          <TouchableOpacity
            style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
            onPress={handleAuth}
            activeOpacity={0.8}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <ThemedText style={styles.loginButtonText}>
                {isSignUp ? 'Sign Up' : 'Sign In'}
              </ThemedText>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.switchButton}
            onPress={() => {
              setIsSignUp(!isSignUp);
              setError(null);
            }}
            disabled={isLoading}
          >
            <ThemedText style={styles.switchButtonText}>
              {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
            </ThemedText>
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
  loginSection: {
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
  loginButton: {
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
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    textAlignVertical: 'center',
  },
  switchButton: {
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  switchButtonText: {
    color: '#2563EB',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    textAlignVertical: 'center',
  },
});
