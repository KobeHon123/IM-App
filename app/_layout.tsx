import { View, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider as NavigationThemeProvider, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';
import { EasterEggProvider } from '@/context/EasterEggContext';
import { StopwatchProvider } from '@/context/StopwatchContext';
import { LoginScreen } from '@/components/LoginScreen';
import { SetupNameScreen } from '@/components/SetupNameScreen';
import { WaitingForApprovalScreen } from '@/components/WaitingForApprovalScreen';
import { NoConnectionScreen } from '@/components/NoConnectionScreen';
import { SplashScreen } from '@/components/SplashScreen';

function RootLayoutNav() {
  const { isDark, colors } = useTheme();
  const { user, isAuthorized, hasName, isLoading } = useAuth();
  const [isConnected, setIsConnected] = useState<boolean | null>(true);
  const [checkingConnection, setCheckingConnection] = useState(false);
  const [splashAnimationComplete, setSplashAnimationComplete] = useState(false);
  const [allowNavigation, setAllowNavigation] = useState(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Only allow navigation after splash animation completes AND auth is fully loaded
    if (splashAnimationComplete && !isLoading) {
      setAllowNavigation(true);
    }
  }, [splashAnimationComplete, isLoading]);

  const handleRetry = async () => {
    setCheckingConnection(true);
    const state = await NetInfo.fetch();
    setIsConnected(state.isConnected);
    setCheckingConnection(false);
  };

  const handleSplashAnimationComplete = () => {
    setSplashAnimationComplete(true);
  };

  const base = isDark ? DarkTheme : DefaultTheme;
  const navigationTheme = {
    ...base,
    colors: {
      ...base.colors,
      primary: colors.primary,
      background: colors.background,
      card: colors.surface,
      text: colors.text,
      border: colors.border,
    },
  };

  // Show splash screen while loading, checking connection, or animation is playing
  if (isLoading || checkingConnection || !allowNavigation) {
    return <SplashScreen onAnimationComplete={handleSplashAnimationComplete} />;
  }

  if (isConnected === false) {
    return <NoConnectionScreen onRetry={handleRetry} />;
  }

  if (!user) {
    return <LoginScreen />;
  }

  if (!hasName) {
    return <SetupNameScreen />;
  }

  if (!isAuthorized) {
    return <WaitingForApprovalScreen />;
  }

  return (
    <NavigationThemeProvider value={navigationTheme}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </NavigationThemeProvider>
  );
}
export default function RootLayout() {
  useFrameworkReady();

  return (
    <GestureHandlerRootView style={StyleSheet.absoluteFill}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <EasterEggProvider>
              <StopwatchProvider>
                <RootLayoutNav />
              </StopwatchProvider>
            </EasterEggProvider>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
