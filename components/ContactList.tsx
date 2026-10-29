import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
  Modal,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { User, X } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import PublicProfile from './PublicProfile';
import { useEasterEgg } from '@/context/EasterEggContext';
import { ThemedText } from '@/components/ThemedText';
import { useColors } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { ROLE_LABELS, normalizeRole } from '@/lib/roles';
import type { ThemeColors } from '@/constants/Colors';

interface ContactProfile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  email: string | null;
  phone_number: string | null;
  role?: string;
  is_authorized?: boolean;
}

interface ContactListProps {
  onClose: () => void;
  currentUserId?: string;
}

const ContactList = ({ onClose, currentUserId }: ContactListProps) => {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [contacts, setContacts] = useState<ContactProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedContact, setSelectedContact] = useState<ContactProfile | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const { showOffWorkCounter, setShowOffWorkCounter, handleBioTap } = useEasterEgg();
  const { canManageUsers } = useAuth();

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('profiles')
        .select('id, full_name, avatar_url, bio, email, phone_number, role, is_authorized')
        .neq('id', currentUserId || 'null');

      query = canManageUsers
        ? query.or('is_authorized.eq.true,role.eq.not_authorized')
        : query.eq('is_authorized', true);

      const { data, error } = await query.order('full_name', { ascending: true });

      if (error) {
        console.error('Error fetching contacts:', error);
        return;
      }

      setContacts(data as ContactProfile[]);
    } catch (error) {
      console.error('Error fetching contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleContactPress = (contact: ContactProfile) => {
    setSelectedContact(contact);
    setShowPreview(true);
  };

  const renderContactItem = ({ item }: { item: ContactProfile }) => {
    const isAdmin = item.role === 'admin';
    const borderColor = isAdmin ? colors.primary : colors.border;

    return (
      <TouchableOpacity
        style={styles.contactCard}
        onPress={() => handleContactPress(item)}
      >
        <View style={styles.photoWrapper}>
          {item.avatar_url ? (
            <Image
              source={{ uri: item.avatar_url }}
              style={[styles.contactPhoto, { borderColor }]}
            />
          ) : (
            <View style={[styles.placeholderPhoto, { borderColor }]}>
              <User color={colors.textSecondary} size={40} />
            </View>
          )}
          {isAdmin && <View style={styles.adminBadge} />}
        </View>
        <ThemedText style={styles.contactName} numberOfLines={2}>
          {item.full_name}
        </ThemedText>
        {canManageUsers && (
          <ThemedText
            style={[styles.roleCaption, normalizeRole(item.role) === 'not_authorized' && styles.roleCaptionDanger]}
            numberOfLines={1}
          >
            {ROLE_LABELS[normalizeRole(item.role)]}
          </ThemedText>
        )}
      </TouchableOpacity>
    );
  };

  const columnWidth = Dimensions.get('window').width / 3;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <ThemedText style={styles.headerTitle}>Contacts</ThemedText>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <X color={colors.textSecondary} size={24} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primaryText} />
        </View>
      ) : contacts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <User color={colors.textDisabled} size={60} />
          <ThemedText style={styles.emptyText}>No contacts found</ThemedText>
        </View>
      ) : (
        <FlatList
          data={contacts}
          renderItem={renderContactItem}
          keyExtractor={(item) => item.id}
          numColumns={3}
          contentContainerStyle={styles.listContent}
          columnWrapperStyle={styles.columnWrapper}
          scrollEnabled={true}
        />
      )}

      <Modal
        visible={showPreview}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPreview(false)}
      >
        <View style={styles.modalContainer}>
          <PublicProfile
            profile={selectedContact}
            onRoleChanged={(userId, newRole) => {
              setContacts(prev => prev.map(c => (c.id === userId ? { ...c, role: newRole, is_authorized: newRole !== 'not_authorized' } : c)));
              setSelectedContact(prev => (prev && prev.id === userId ? { ...prev, role: newRole } : prev));
            }}
            onClose={() => setShowPreview(false)}
            onBioTap={handleBioTap}
          />
        </View>
      </Modal>
    </View>
  );
};

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  closeButton: {
    padding: 8,
  },
  roleCaption: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 2,
  },
  roleCaptionDanger: {
    color: colors.danger,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: colors.textMuted,
    marginTop: 12,
  },
  listContent: {
    paddingHorizontal: 8,
    paddingVertical: 16,
  },
  columnWrapper: {
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  contactCard: {
    width: '31%',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  photoWrapper: {
    marginBottom: 12,
    position: 'relative',
  },
  adminBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    borderWidth: 3,
    borderColor: colors.surface,
  },
  contactPhoto: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: colors.border,
  },
  placeholderPhoto: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.surfaceMuted,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
  },
  modalContainer: {
    flex: 1,
  },
  contactName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
});

export default ContactList;
