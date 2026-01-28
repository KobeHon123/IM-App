import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WifiOff, RefreshCw } from 'lucide-react-native';
import { ThemedText } from '@/components/ThemedText';

interface NoConnectionScreenProps {
  onRetry: () => void;
}

export function NoConnectionScreen({ onRetry }: NoConnectionScreenProps) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <WifiOff color="#EF4444" size={80} strokeWidth={1.5} />
        </View>
        <ThemedText style={styles.title}>No Internet Connection</ThemedText>
        <ThemedText style={styles.description}>
          Please check your internet connection and try again. This app requires an active internet connection to work properly.
        </ThemedText>
        <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
          <RefreshCw color="#FFFFFF" size={20} />
          <ThemedText style={styles.retryButtonText}>Try Again</ThemedText>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  iconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
