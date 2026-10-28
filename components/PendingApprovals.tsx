import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Bell, X } from 'lucide-react-native';
import { ThemedText } from '@/components/ThemedText';
import { supabase } from '@/lib/supabase';
import { updateUserRole } from '@/lib/supabaseHelpers';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/context/ThemeContext';
import { ROLE_LABELS, UserRole, assignableRoles } from '@/lib/roles';
import type { ThemeColors } from '@/constants/Colors';

interface PendingUser {
  id: string;
  email: string | null;
  full_name: string | null;
  created_at: string;
}

export function PendingApprovals() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { canManageUsers, role } = useAuth();

  const [pending, setPending] = useState<PendingUser[]>([]);
  const [visible, setVisible] = useState(false);
  const [chosenRoles, setChosenRoles] = useState<Record<string, UserRole>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!canManageUsers) {
      setPending([]);
      return;
    }
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, created_at')
      .eq('is_authorized', false)
      .or('role.is.null,role.neq.not_authorized')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading pending sign-ups:', error);
      return;
    }
    setPending((data || []) as PendingUser[]);
  }, [canManageUsers]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (!canManageUsers || pending.length === 0) return null;

  const roleOptions = assignableRoles(role).filter(r => r !== 'not_authorized');

  const act = async (user: PendingUser, newRole: UserRole) => {
    setBusyId(user.id);
    try {
      const ok = await updateUserRole(user.id, newRole);
      if (!ok) throw new Error('No permission');
      await load();
    } catch (error) {
      console.error('Error updating sign-up:', error);
      Alert.alert('Error', 'Failed to update this account. Please check your permission and try again.');
    } finally {
      setBusyId(null);
    }
  };

  const confirmReject = (user: PendingUser) => {
    Alert.alert(
      'Reject Sign-up',
      `Reject ${user.full_name || user.email}? The account will be set to Not Authorized and will not be able to access the app.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reject', style: 'destructive', onPress: () => act(user, 'not_authorized') },
      ]
    );
  };

  return (
    <>
      <TouchableOpacity style={styles.banner} onPress={() => setVisible(true)} activeOpacity={0.8}>
        <View style={styles.bannerIcon}>
          <Bell color={colors.warningStrong} size={20} />
        </View>
        <View style={styles.bannerText}>
          <ThemedText style={styles.bannerTitle}>
            {pending.length} new sign-up{pending.length === 1 ? '' : 's'} waiting for approval
          </ThemedText>
          <ThemedText style={styles.bannerSub}>Tap to approve and assign a role</ThemedText>
        </View>
      </TouchableOpacity>

      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setVisible(false)}>
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <ThemedText style={styles.modalTitle}>New Sign-ups</ThemedText>
            <TouchableOpacity onPress={() => setVisible(false)}>
              <X color={colors.textSecondary} size={24} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalContent}>
            {pending.length === 0 ? (
              <ThemedText style={styles.empty}>No pending sign-ups.</ThemedText>
            ) : (
              pending.map(user => {
                const chosen = chosenRoles[user.id] || 'user';
                const busy = busyId === user.id;
                return (
                  <View key={user.id} style={styles.card}>
                    <ThemedText style={styles.name}>{user.full_name || '(No name yet)'}</ThemedText>
                    <ThemedText style={styles.email}>{user.email}</ThemedText>
                    <ThemedText style={styles.date}>
                      Signed up {new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </ThemedText>

                    <ThemedText style={styles.roleLabel}>Role</ThemedText>
                    <View style={styles.roleRow}>
                      {roleOptions.map(option => (
                        <TouchableOpacity
                          key={option}
                          style={[styles.roleChip, chosen === option && styles.roleChipActive]}
                          onPress={() => setChosenRoles(prev => ({ ...prev, [user.id]: option }))}
                          disabled={busy}
                        >
                          <ThemedText style={[styles.roleChipText, chosen === option && styles.roleChipTextActive]}>
                            {ROLE_LABELS[option]}
                          </ThemedText>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <View style={styles.actions}>
                      <TouchableOpacity style={styles.rejectButton} onPress={() => confirmReject(user)} disabled={busy}>
                        <ThemedText style={styles.rejectText}>Reject</ThemedText>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.approveButton} onPress={() => act(user, chosen)} disabled={busy}>
                        {busy ? (
                          <ActivityIndicator color="#FFFFFF" />
                        ) : (
                          <ThemedText style={styles.approveText}>Approve as {ROLE_LABELS[chosen]}</ThemedText>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    banner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginHorizontal: 16,
      marginTop: 8,
      marginBottom: 4,
      padding: 14,
      borderRadius: 12,
      backgroundColor: colors.warningSoft,
      borderWidth: 1,
      borderColor: '#F59E0B',
    },
    bannerIcon: { width: 32, alignItems: 'center' },
    bannerText: { flex: 1 },
    bannerTitle: { fontSize: 15, fontWeight: '700', color: colors.warningStrong },
    bannerSub: { fontSize: 12, color: colors.warningStrong, opacity: 0.85, marginTop: 2 },
    modal: { flex: 1, backgroundColor: colors.background },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 14,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
    modalContent: { padding: 16, gap: 12 },
    empty: { textAlign: 'center', color: colors.textSecondary, marginTop: 40 },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    name: { fontSize: 16, fontWeight: '600', color: colors.text },
    email: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
    date: { fontSize: 12, color: colors.textMuted, marginTop: 2, marginBottom: 12 },
    roleLabel: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 6 },
    roleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
    roleChip: {
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 16,
      backgroundColor: colors.surfaceMuted,
      borderWidth: 1,
      borderColor: colors.border,
    },
    roleChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    roleChipText: { fontSize: 13, fontWeight: '500', color: colors.textStrong },
    roleChipTextActive: { color: '#FFFFFF', fontWeight: '600' },
    actions: { flexDirection: 'row', gap: 10 },
    rejectButton: {
      paddingVertical: 11,
      paddingHorizontal: 16,
      borderRadius: 10,
      backgroundColor: colors.dangerSoft,
      borderWidth: 1,
      borderColor: colors.dangerBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rejectText: { fontSize: 14, fontWeight: '600', color: colors.danger },
    approveButton: {
      flex: 1,
      paddingVertical: 11,
      borderRadius: 10,
      backgroundColor: '#10B981',
      alignItems: 'center',
      justifyContent: 'center',
    },
    approveText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  });
