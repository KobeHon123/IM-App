import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Clock, LogOut, User, RefreshCw } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { ThemedText } from '@/components/ThemedText';
import { useColors } from '@/context/ThemeContext';
import type { ThemeColors } from '@/constants/Colors';

export function WaitingForApprovalScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const { profile, signOut, refreshProfile } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshProfile();
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      refreshProfile();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.headerSection}>
          <View style={styles.iconContainer}>
            <Clock color="#F59E0B" size={64} />
          </View>

          <ThemedText style={styles.title}>Waiting for Approval</ThemedText>

          <ThemedText style={styles.subtitle}>
            Your account has been created successfully, but it requires approval from an administrator before you can access the app.
          </ThemedText>
        </View>

        <View style={styles.profileSection}>
          <View style={styles.profileCard}>
            {profile?.avatar_url ? (
              <Image
                source={{ uri: profile.avatar_url }}
                style={styles.avatar}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <User color={colors.textSecondary} size={40} />
              </View>
            )}

            <View style={styles.profileInfo}>
              <ThemedText style={styles.profileName}>
                {profile?.full_name || 'User'}
              </ThemedText>
              <ThemedText style={styles.profileEmail}>
                {profile?.email}
              </ThemedText>
            </View>
          </View>
        </View>

        <View style={styles.infoSection}>
          <View style={styles.infoBox}>
            <ThemedText style={styles.infoText}>
              We'll notify you once your access has been approved. This usually takes a few minutes to a few hours.
            </ThemedText>
          </View>
        </View>

        <View style={styles.actionsSection}>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={handleRefresh}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <ActivityIndicator color={colors.primaryText} />
            ) : (
              <>
                <RefreshCw color={colors.primaryText} size={20} />
                <ThemedText style={styles.refreshButtonText}>Check Status</ThemedText>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.signOutButton}
            onPress={handleSignOut}
          >
            <LogOut color={colors.danger} size={20} />
            <ThemedText style={styles.signOutButtonText}>Sign Out</ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    justifyContent: 'space-between',
  },
  headerSection: {
    alignItems: 'center',
    marginTop: 40,
  },
  iconContainer: {
    width: 120,
    height: 120,
    backgroundColor: colors.warningSoft,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 16,
  },
  profileSection: {
    marginVertical: 32,
  },
  profileCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
  },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.surfaceMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  infoSection: {
    marginBottom: 32,
  },
  infoBox: {
    backgroundColor: colors.primarySoft,
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  infoText: {
    fontSize: 14,
    color: colors.primaryStrongText,
    lineHeight: 20,
  },
  actionsSection: {
    marginBottom: 32,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: colors.primaryBorder,
  },
  refreshButtonText: {
    fontSize: 16,
    color: colors.primaryText,
    fontWeight: '600',
    marginLeft: 8,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.dangerBorder,
  },
  signOutButtonText: {
    fontSize: 16,
    color: colors.danger,
    fontWeight: '600',
    marginLeft: 8,
  },
});
