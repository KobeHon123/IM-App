import { View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { LoginScreen } from '@/components/LoginScreen';
import { SetupNameScreen } from '@/components/SetupNameScreen';
import { WaitingForApprovalScreen } from '@/components/WaitingForApprovalScreen';
import LoadingSpinner from '@/components/LoadingSpinner';

function RootLayoutNav() {
  const { user, isAuthorized, hasName, isLoading } = useAuth();

  if (isLoading) {
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
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}
