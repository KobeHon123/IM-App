import { View, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { EasterEggProvider } from '@/context/EasterEggContext';
import { LoginScreen } from '@/components/LoginScreen';
import { SetupNameScreen } from '@/components/SetupNameScreen';
import { WaitingForApprovalScreen } from '@/components/WaitingForApprovalScreen';
import { NoConnectionScreen } from '@/components/NoConnectionScreen';
import { SplashScreen } from '@/components/SplashScreen';

function RootLayoutNav() {
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
      // Add 500ms buffer to ensure all auth state is settled
      const timer = setTimeout(() => {
        setAllowNavigation(true);
      }, 500);
      return () => clearTimeout(timer);
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
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}
export default function RootLayout() {
  useFrameworkReady();

  return (
    <GestureHandlerRootView style={StyleSheet.absoluteFill}>
      <SafeAreaProvider>
        <AuthProvider>
          <EasterEggProvider>
            <RootLayoutNav />
          </EasterEggProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
