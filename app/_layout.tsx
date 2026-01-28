import { View } from 'react-native';
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
import LoadingSpinner from '@/components/LoadingSpinner';

function RootLayoutNav() {
  const { user, isAuthorized, hasName, isLoading } = useAuth();
  const [isConnected, setIsConnected] = useState<boolean | null>(true);
  const [checkingConnection, setCheckingConnection] = useState(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected);
    });

    return () => unsubscribe();
  }, []);

  const handleRetry = async () => {
    setCheckingConnection(true);
    const state = await NetInfo.fetch();
    setIsConnected(state.isConnected);
    setCheckingConnection(false);
  };

  if (isConnected === false) {
    return <NoConnectionScreen onRetry={handleRetry} />;
  }

  if (isLoading || checkingConnection) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <LoadingSpinner size={50} color="#2563EB" strokeWidth={5} />
      </View>
    );
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
    <SafeAreaProvider>
      <AuthProvider>
        <EasterEggProvider>
          <RootLayoutNav />
        </EasterEggProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
