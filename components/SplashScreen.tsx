import { View, Image, StyleSheet } from 'react-native';
import { useEffect } from 'react';

interface SplashScreenProps {
  onAnimationComplete?: () => void;
}

export const SplashScreen = ({ onAnimationComplete }: SplashScreenProps) => {
  useEffect(() => {
    // Complete after 3 seconds
    const timer = setTimeout(() => {
      onAnimationComplete?.();
    }, 3000);
    return () => clearTimeout(timer);
  }, [onAnimationComplete]);

  return (
    <View style={styles.container}>
      <Image
        source={require('@/assets/images/IML_Company Logo  (Black)_20221104 (1).png')}
        style={styles.logo}
        resizeMode="contain"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  logo: {
    width: 200,
    height: 200,
  },
});
