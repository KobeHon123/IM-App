import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Text, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, Trash2, Play, Pause, RotateCcw } from 'lucide-react-native';
import { ThemedText } from '@/components/ThemedText';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Swipeable } from 'react-native-gesture-handler';

interface Stopwatch {
  id: string;
  elapsed: number; // in seconds
  isRunning: boolean;
  label: string;
}

export default function StopwatchScreen() {
  const [stopwatches, setStopwatches] = useState<Stopwatch[]>([]);
  const [inputLabel, setInputLabel] = useState('');
  const [inputDuration, setInputDuration] = useState('');
  const intervalRef = useRef<NodeJS.Timeout | number | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  // Main stopwatch loop
  useEffect(() => {
    if (stopwatches.some(s => s.isRunning)) {
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

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [stopwatches]);

  const addStopwatch = () => {
    if (stopwatches.length >= 10) {
      Alert.alert('Maximum Stopwatches', 'You can only create up to 10 stopwatches');
      return;
    }

    const newStopwatch: Stopwatch = {
      id: Date.now().toString(),
      elapsed: 0,
      isRunning: false,
      label: inputLabel || `Stopwatch ${stopwatches.length + 1}`,
    };

    setStopwatches([...stopwatches, newStopwatch]);
    setInputLabel('');
    
    // Scroll to bottom to show the new stopwatch
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const deleteStopwatch = (id: string) => {
    setStopwatches(stopwatches.filter(s => s.id !== id));
  };

  const toggleStopwatch = (id: string) => {
    setStopwatches(stopwatches.map(s =>
      s.id === id
        ? { ...s, isRunning: !s.isRunning }
        : s
    ));
  };

  const resetStopwatch = (id: string) => {
    setStopwatches(stopwatches.map(s =>
      s.id === id
        ? { ...s, elapsed: 0, isRunning: false }
        : s
    ));
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
      <TouchableOpacity
        style={styles.deleteAction}
        onPress={() => deleteStopwatch(id)}
      >
        <Trash2 size={24} color="#FFFFFF" strokeWidth={2} />
      </TouchableOpacity>
    );
  };

  const renderLeftActions = (id: string) => {
    return (
      <TouchableOpacity
        style={styles.resetAction}
        onPress={() => resetStopwatch(id)}
      >
        <RotateCcw size={24} color="#FFFFFF" strokeWidth={2} />
      </TouchableOpacity>
    );
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <ThemedText style={styles.headerTitle}>Stopwatch</ThemedText>
        </View>

        <ScrollView 
          ref={scrollViewRef}
          style={styles.content} 
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
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
                        stopwatch.isRunning ? styles.pauseButton : styles.playButton,
                      ]}
                      onPress={() => toggleStopwatch(stopwatch.id)}
                    >
                      {stopwatch.isRunning ? (
                        <Pause size={24} color="#FFFFFF" strokeWidth={2.5} />
                      ) : (
                        <Play size={20} color="#FFFFFF" strokeWidth={2.5} />
                      )}
                    </TouchableOpacity>

                    {/* Middle: Label */}
                    <ThemedText style={styles.stopwatchLabel}>{stopwatch.label}</ThemedText>

                    {/* Right: Time Display */}
                    <Text style={styles.timeText}>
                      {formatTime(stopwatch.elapsed)}
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
              placeholderTextColor="#9CA3AF"
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  createSection: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  input: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  labelInput: {
    flex: 1,
  },
  addButton: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
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
    color: '#9CA3AF',
  },
  stopwatchesList: {
    gap: 12,
  },
  stopwatchCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
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
    color: '#111827',
    flex: 1,
  },
  timeText: {
    fontSize: 24,
    fontWeight: '700',
    fontFamily: 'monospace',
    color: '#2563EB',
    marginLeft: 12,
  },
  deleteAction: {
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    borderRadius: 12,
  },
  resetAction: {
    backgroundColor: '#6B7280',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    borderRadius: 12,
    marginRight: 12,
  },
});
