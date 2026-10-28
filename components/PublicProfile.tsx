import React, { useState, useRef, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Linking, ScrollView, Clipboard, Alert, Animated } from 'react-native';
import { User, Phone, Mail, X } from 'lucide-react-native';
import { ThemedText } from '@/components/ThemedText';
import { useColors } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { updateUserRole } from '@/lib/supabaseHelpers';
import { ROLE_LABELS, UserRole, assignableRoles, canChangeRoleOf, normalizeRole } from '@/lib/roles';
import type { ThemeColors } from '@/constants/Colors';

interface PublicProfileProps {
  profile: any;
  onClose: () => void;
  onBioTap?: () => void;
  onRoleChanged?: (userId: string, role: UserRole) => void;
}

const PublicProfile = ({ profile, onClose, onBioTap, onRoleChanged }: PublicProfileProps) => {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [copiedMessage, setCopiedMessage] = useState<string | null>(null);
  const opacityAnim = useRef(new Animated.Value(1)).current;
  const isAdmin = profile?.role === 'admin';
  const { role: viewerRole, user: viewer, canManageUsers } = useAuth();
  const [savingRole, setSavingRole] = useState(false);

  if (!profile) return null;

  const targetRole = normalizeRole(profile.role);
  const canChangeRole = canChangeRoleOf(viewerRole, viewer?.id, profile.id, targetRole);

  const changeRole = (newRole: UserRole) => {
    if (newRole === targetRole || savingRole) return;
    Alert.alert(
      'Change Role',
      `Change ${profile.full_name || 'this user'}'s role from ${ROLE_LABELS[targetRole]} to ${ROLE_LABELS[newRole]}?${
        newRole === 'not_authorized' ? '\n\nThis user will lose access to everything in the app.' : ''
      }`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Change',
          style: newRole === 'not_authorized' ? 'destructive' : 'default',
          onPress: async () => {
            setSavingRole(true);
            try {
              const ok = await updateUserRole(profile.id, newRole);
              if (!ok) throw new Error('No permission');
              onRoleChanged?.(profile.id, newRole);
            } catch (error) {
              console.error('Error changing role:', error);
              Alert.alert('Error', 'Failed to change role. Please check your permission and try again.');
            } finally {
              setSavingRole(false);
            }
          },
        },
      ]
    );
  };

  const handleCall = () => {
    if (profile.phone_number) Linking.openURL(`tel:${profile.phone_number}`);
  };

  const handleCopyEmail = async () => {
    if (profile.email) {
      await Clipboard.setString(profile.email);
      opacityAnim.setValue(1);
      setCopiedMessage('Email copied');
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 2000,
        useNativeDriver: true,
      }).start(() => setCopiedMessage(null));
    }
  };

  const handleCopyPhone = async () => {
    if (profile.phone_number) {
      await Clipboard.setString(profile.phone_number);
      opacityAnim.setValue(1);
      setCopiedMessage('Phone copied');
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 2000,
        useNativeDriver: true,
      }).start(() => setCopiedMessage(null));
    }
  };



  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.closeButton} onPress={onClose}>
        <X color={colors.textSecondary} size={24} />
      </TouchableOpacity>

      {copiedMessage && (
        <View style={styles.messageOverlay}>
          <Animated.View style={[styles.messageBox, { opacity: opacityAnim }]}>
            <ThemedText style={styles.messageText}>{copiedMessage}</ThemedText>
          </Animated.View>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.photoContainer}>
          {profile.avatar_url ? (
            <Image
              source={{ uri: profile.avatar_url }}
              style={[styles.profilePhoto, { borderColor: isAdmin ? colors.primary : colors.border }]}
            />
          ) : (
            <View style={[styles.placeholderPhoto, { borderColor: isAdmin ? colors.primary : colors.border }]}>
              <User color={colors.textSecondary} size={60} />
            </View>
          )}
        </View>

        <ThemedText style={styles.userName}>{profile.full_name || 'User'}</ThemedText>
        {profile.bio ? (
          profile.full_name?.includes('Kobe') ? (
            <TouchableOpacity onPress={onBioTap}>
              <ThemedText style={styles.bioText}>"{profile.bio}"</ThemedText>
            </TouchableOpacity>
          ) : (
            <ThemedText style={styles.bioText}>"{profile.bio}"</ThemedText>
          )
        ) : null}

        <View style={styles.contactSection}>
          <ThemedText style={styles.sectionTitle}>Contact Information</ThemedText>
          
          {profile.email ? (
            <TouchableOpacity
              style={styles.contactItem}
              onPress={handleCopyEmail}
              onLongPress={handleCopyEmail}
            >
              <View style={[styles.iconCircle, { backgroundColor: colors.warningSoft }]}>
                <Mail color="#D97706" size={20} />
              </View>
              <View>
                <ThemedText style={styles.contactLabel}>Email</ThemedText>
                <ThemedText style={styles.contactValue}>{profile.email}</ThemedText>
              </View>
            </TouchableOpacity>
          ) : null}
          
          {profile.phone_number ? (
            <TouchableOpacity
              style={styles.contactItem}
              onPress={handleCall}
              onLongPress={handleCopyPhone}
            >
              <View style={[styles.iconCircle, { backgroundColor: colors.primarySoft }]}>
                <Phone color={colors.primaryText} size={20} />
              </View>
              <View>
                <ThemedText style={styles.contactLabel}>Phone</ThemedText>
                <ThemedText style={styles.contactValue}>{profile.phone_number}</ThemedText>
              </View>
            </TouchableOpacity>
          ) : null}

          {!profile.email && !profile.phone_number && (
            <ThemedText style={styles.noInfo}>No contact information provided.</ThemedText>
          )}
        </View>

        {canManageUsers && (
          <View style={styles.contactSection}>
            <ThemedText style={styles.sectionTitle}>User Role</ThemedText>
            <ThemedText style={styles.currentRole}>{ROLE_LABELS[targetRole]}</ThemedText>
            {canChangeRole ? (
              <View style={styles.roleRow}>
                {assignableRoles(viewerRole).map(option => (
                  <TouchableOpacity
                    key={option}
                    style={[styles.roleChip, targetRole === option && styles.roleChipActive]}
                    onPress={() => changeRole(option)}
                    disabled={savingRole}
                  >
                    <ThemedText style={[styles.roleChipText, targetRole === option && styles.roleChipTextActive]}>
                      {ROLE_LABELS[option]}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <ThemedText style={styles.noInfo}>
                {viewer?.id === profile.id
                  ? 'You cannot change your own role.'
                  : 'The Dev role cannot be changed here.'}
              </ThemedText>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  currentRole: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 12 },
  roleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  roleChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  roleChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  roleChipText: { fontSize: 13, fontWeight: '500', color: colors.textStrong },
  roleChipTextActive: { color: '#FFFFFF', fontWeight: '600' },
  container: { flex: 1, backgroundColor: colors.surface },
  closeButton: { position: 'absolute', top: 20, right: 20, zIndex: 10, padding: 8 },
  messageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'none',
    zIndex: 5,
  },
  messageBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  messageText: {
    color: colors.successStrong,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  content: { alignItems: 'center', paddingTop: 60, paddingBottom: 40 },
  photoContainer: { marginBottom: 20 },
  profilePhoto: { width: 120, height: 120, borderRadius: 60, borderWidth: 3 },
  placeholderPhoto: { width: 120, height: 120, borderRadius: 60, backgroundColor: colors.surfaceMuted, justifyContent: 'center', alignItems: 'center', borderWidth: 3 },
  userName: { fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: 8 },
  bioText: { fontSize: 16, fontStyle: 'italic', color: colors.textSecondary, textAlign: 'center', marginHorizontal: 40, marginBottom: 30 },
  contactSection: { width: '100%', paddingHorizontal: 24 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 },
  contactItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background, padding: 16, borderRadius: 12, marginBottom: 12, gap: 16 },
  iconCircle: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  contactLabel: { fontSize: 12, color: colors.textSecondary },
  contactValue: { fontSize: 16, fontWeight: '600', color: colors.text },
  noInfo: { fontSize: 14, color: colors.textMuted, textAlign: 'center', marginTop: 10 }
});

export default PublicProfile;