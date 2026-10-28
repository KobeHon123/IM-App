import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { ResetPasswordScreen } from '@/components/ResetPasswordScreen';
import { supabase } from '@/lib/supabase';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useColors } from '@/context/ThemeContext';

export default function ResetPassword() {
  const colors = useColors();

  const params = useLocalSearchParams();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const handlePasswordReset = async () => {
      const accessToken = params.access_token as string;
      const refreshToken = params.refresh_token as string;

      if (accessToken && refreshToken) {
        try {
          await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
        } catch (error) {
          console.error('Error setting session:', error);
        }
      }

      setIsReady(true);
    };

    handlePasswordReset();
  }, [params]);

  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <LoadingSpinner size={50} color={colors.primaryText} strokeWidth={5} />
      </View>
    );
  }

  return <ResetPasswordScreen />;
}
