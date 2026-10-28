import React, { useState, useRef, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Text, TextInput, Alert, type ScrollViewInstance } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Plus, Trash2, Play, Pause, RotateCcw, ArrowLeft } from 'lucide-react-native';
import { ThemedText } from '@/components/ThemedText';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
<<<<<<< HEAD
import { useStopwatches, MAX_STOPWATCHES } from '@/context/StopwatchContext';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { useColors } from '@/context/ThemeContext';
import type { ThemeColors } from '@/constants/Colors';

export default function StopwatchScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const {
    stopwatches,
    addStopwatch: addToContext,
    deleteStopwatch,
    toggleStopwatch,
    resetStopwatch,
    getElapsedSeconds,
  } = useStopwatches();
  const [inputLabel, setInputLabel] = useState('');
  const scrollViewRef = useRef<ScrollViewInstance>(null);
=======
import { Swipeable } from 'react-native-gesture-handler';
import { useRouter } from 'expo-router';

interface Stopwatch {
  id: string;
  elapsed: number; // in seconds
  isRunning: boolean;
  label: string;
}

export default function StopwatchScreen() {
  const router = useRouter();
  const [stopwatches, setStopwatches] = useState<Stopwatch[]>([]);
  const [inputLabel, setInputLabel] = useState('');
  const [inputDuration, setInputDuration] = useState('');
  const intervalRef = useRef<NodeJS.Timeout | number | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const isRunningRef = useRef(false);

  // Load stopwatches from AsyncStorage on mount
  useEffect(() => {
    loadStopwatches();
  }, []);

  const loadStopwatches = async () => {
    try {
      const saved = await AsyncStorage.getItem('stopwatches');
      if (saved) {
        setStopwatches(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error loading stopwatches:', error);
    }
  };

  // Save stopwatches to AsyncStorage whenever they change
  useEffect(() => {
    AsyncStorage.setItem('stopwatches', JSON.stringify(stopwatches));
  }, [stopwatches]);

  // Update isRunningRef when stopwatches change
  useEffect(() => {
    const hasRunning = stopwatches.some(s => s.isRunning);
    if (hasRunning !== isRunningRef.current) {
      isRunningRef.current = hasRunning;
      if (hasRunning) {
        intervalRef.current = setInterval(() => {
          setStopwatches(prev =>
            prev.map(stopwatch => {
              if (stopwatch.isRunning) {
                return { ...stopwatch, elapsed: stopwatch.elapsed + 1 };
              }
              return stopwatch;
            })
          );
        }, 1000);
      } else {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    }
  }, [stopwatches]);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);
>>>>>>> 545897cc8f0debf77bdca2f658ade5a7abf5c977

  const addStopwatch = () => {
    if (stopwatches.length >= MAX_STOPWATCHES) {
      Alert.alert('Maximum Stopwatches', `You can only create up to ${MAX_STOPWATCHES} stopwatches`);
      return;
    }

    addToContext(inputLabel);
    setInputLabel('');

    // Scroll to bottom to show the new stopwatch
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const renderRightActions = (id: string) => {
    return (
      <View style={styles.actionContainer}>
        <TouchableOpacity
          style={styles.deleteAction}
          onPress={() => deleteStopwatch(id)}
        >
          <Trash2 size={24} color="#FFFFFF" strokeWidth={2} />
        </TouchableOpacity>
      </View>
    );
  };

  const renderLeftActions = (id: string) => {
    return (
      <View style={styles.actionContainer}>
        <TouchableOpacity
          style={styles.resetAction}
          onPress={() => resetStopwatch(id)}
        >
          <RotateCcw size={24} color="#FFFFFF" strokeWidth={2} />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <GestureHandlerRootView style={styles.container}>
<<<<<<< HEAD
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <ThemedText style={styles.headerTitle}>Stopwatch</ThemedText>
        </View>

=======
      <SafeAreaView style={styles.container} edges={['top']}>
>>>>>>> 545897cc8f0debf77bdca2f658ade5a7abf5c977
        <ScrollView 
          ref={scrollViewRef}
          style={styles.content} 
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <ArrowLeft color="#2563EB" size={24} />
            </TouchableOpacity>
            <ThemedText style={styles.headerTitle}>Stopwatch</ThemedText>
            <View style={styles.headerPlaceholder} />
          </View>

          {/* Stopwatches List */}
          {stopwatches.length === 0 ? (
            <View style={styles.emptyState}>
              <ThemedText style={styles.emptyText}>No stopwatches yet. Create one to get started!</ThemedText>
            </View>
          ) : (
            <View style={styles.stopwatchesList}>
              {stopwatches.map((stopwatch) => (
                <Swipeable
                  key={stopwatch.id}
                  renderLeftActions={() => renderLeftActions(stopwatch.id)}
                  renderRightActions={() => renderRightActions(stopwatch.id)}
                >
                  <View style={styles.stopwatchCard}>
                    {/* Left: Play/Pause Button */}
                    <TouchableOpacity
                      style={[
                        styles.playPauseButton,
                        stopwatch.startedAt !== null ? styles.pauseButton : styles.playButton,
                      ]}
                      onPress={() => toggleStopwatch(stopwatch.id)}
                    >
                      {stopwatch.startedAt !== null ? (
                        <Pause size={24} color="#FFFFFF" strokeWidth={2.5} />
                      ) : (
                        <Play size={20} color="#FFFFFF" strokeWidth={2.5} />
                      )}
                    </TouchableOpacity>

                    {/* Middle: Label */}
                    <ThemedText style={styles.stopwatchLabel}>{stopwatch.label}</ThemedText>

                    {/* Right: Time Display */}
                    <Text style={styles.timeText}>
                      {formatTime(getElapsedSeconds(stopwatch))}
                    </Text>
                  </View>
                </Swipeable>
              ))}
            </View>
          )}
        </ScrollView>

        {/* Create Stopwatch FAB-like Section at Bottom */}
        <View style={styles.createSection}>
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.input, styles.labelInput]}
              placeholder="Stopwatch name (optional)"
              placeholderTextColor={colors.textMuted}
              value={inputLabel}
              onChangeText={setInputLabel}
              returnKeyType="done"
            />
            <TouchableOpacity style={styles.addButton} onPress={addStopwatch}>
              <Plus size={24} color="#FFFFFF" strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
<<<<<<< HEAD
    backgroundColor: colors.surface,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
=======
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  headerPlaceholder: {
    width: 40,
>>>>>>> 545897cc8f0debf77bdca2f658ade5a7abf5c977
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  createSection: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  input: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  labelInput: {
    flex: 1,
  },
  addButton: {
    backgroundColor: colors.primary,
    borderRadius: 24,
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textMuted,
  },
  stopwatchesList: {
    gap: 12,
  },
  stopwatchCard: {
<<<<<<< HEAD
    backgroundColor: colors.surface,
    borderRadius: 12,
=======
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
>>>>>>> 545897cc8f0debf77bdca2f658ade5a7abf5c977
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 10, height: 10 },
    shadowRadius: 8,
    elevation: 3,
  },
  playPauseButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  playButton: {
    backgroundColor: '#10B981',
  },
  pauseButton: {
    backgroundColor: '#F59E0B',
  },
  stopwatchLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  timeText: {
    fontSize: 24,
    fontWeight: '700',
    fontFamily: 'monospace',
    color: colors.primaryText,
    marginLeft: 12,
  },
  actionContainer: {
    justifyContent: 'center',
  },
  deleteAction: {
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
<<<<<<< HEAD
    width: 56,
    height: 56,
    borderRadius: 28,
    marginTop: 9,
=======
    width: 52,
    height: 52,
    borderRadius: 40,
    marginLeft: 12,
>>>>>>> 545897cc8f0debf77bdca2f658ade5a7abf5c977
  },
  resetAction: {
    backgroundColor: '#6B7280',
    justifyContent: 'center',
    alignItems: 'center',
<<<<<<< HEAD
    width: 56,
    height: 56,
    borderRadius: 28,
    marginTop: 9,
=======
    width: 52,
    height: 52,
    borderRadius: 40,
    marginRight: 12,
>>>>>>> 545897cc8f0debf77bdca2f658ade5a7abf5c977
  },
});
