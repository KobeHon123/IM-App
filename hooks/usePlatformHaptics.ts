import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

/**
 * Cross-platform hook for haptic feedback
 * On mobile: Uses expo-haptics for vibration
 * On web: No-op (browsers don't support haptics)
 */
export const usePlatformHaptics = () => {
  const impactAsync = async (
    style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Medium
  ): Promise<void> => {
    if (Platform.OS === 'web') {
      // Web doesn't support haptics
      return;
    }

    try {
      await Haptics.impactAsync(style);
    } catch (error) {
      console.error('Error triggering impact haptic:', error);
    }
  };

  const notificationAsync = async (
    type: Haptics.NotificationFeedbackType = Haptics.NotificationFeedbackType.Success
  ): Promise<void> => {
    if (Platform.OS === 'web') {
      // Web doesn't support haptics
      return;
    }

    try {
      await Haptics.notificationAsync(type);
    } catch (error) {
      console.error('Error triggering notification haptic:', error);
    }
  };

  const selectionAsync = async (): Promise<void> => {
    if (Platform.OS === 'web') {
      // Web doesn't support haptics
      return;
    }

    try {
      await Haptics.selectionAsync();
    } catch (error) {
      console.error('Error triggering selection haptic:', error);
    }
  };

  return {
    impactAsync,
    notificationAsync,
    selectionAsync,
  };
};
