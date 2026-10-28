import { View, Image, StyleSheet } from 'react-native';
import { useEffect, useMemo } from 'react';
import { useColors, useTheme } from '@/context/ThemeContext';
import type { ThemeColors } from '@/constants/Colors';

interface SplashScreenProps {
  onAnimationComplete?: () => void;
}

export const SplashScreen = ({ onAnimationComplete }: SplashScreenProps) => {
  const colors = useColors();
  const { isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  useEffect(() => {
    // Complete quickly to reduce startup waiting time
    const timer = setTimeout(() => {
      onAnimationComplete?.();
    }, 800);
    return () => clearTimeout(timer);
  }, [onAnimationComplete]);

  return (
    <View style={styles.container}>
      <Image
        source={require('@/assets/images/IML_Company Logo  (Black)_20221104 (1).png')}
        style={[styles.logo, isDark && { tintColor: colors.text }]}
        resizeMode="contain"
      />
    </View>
  );
};

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  logo: {
    width: 200,
    height: 200,
  },
});
