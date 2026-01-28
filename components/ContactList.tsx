import React, { useState, useEffect } from 'react';
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

interface ContactProfile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  email: string | null;
  phone_number: string | null;
  role?: string;
}

interface ContactListProps {
  onClose: () => void;
  currentUserId?: string;
}

const ContactList = ({ onClose, currentUserId }: ContactListProps) => {
  const [contacts, setContacts] = useState<ContactProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedContact, setSelectedContact] = useState<ContactProfile | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const { showOffWorkCounter, setShowOffWorkCounter, handleBioTap } = useEasterEgg();

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, bio, email, phone_number, role')
        .neq('id', currentUserId || 'null')
        .order('full_name', { ascending: true });

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
    const borderColor = isAdmin ? '#2563EB' : '#E5E7EB';

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
              <User color="#6B7280" size={40} />
            </View>
          )}
          {isAdmin && <View style={styles.adminBadge} />}
        </View>
        <ThemedText style={styles.contactName} numberOfLines={2}>
          {item.full_name}
        </ThemedText>
      </TouchableOpacity>
    );
  };

  const columnWidth = Dimensions.get('window').width / 3;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <ThemedText style={styles.headerTitle}>Contacts</ThemedText>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <X color="#6B7280" size={24} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      ) : contacts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <User color="#D1D5DB" size={60} />
          <ThemedText style={styles.emptyText}>No contacts found</ThemedText>
        </View>
      ) : (
        <FlatList
          data={contacts}
          renderItem={renderContactItem}
          keyExtractor={(item) => item.id}
          numColumns={3}
          contentContainerStyle={styles.listContent}
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
            onClose={() => setShowPreview(false)}
            onBioTap={handleBioTap}
          />
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  closeButton: {
    padding: 8,
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
    color: '#9CA3AF',
    marginTop: 12,
  },
  listContent: {
    paddingHorizontal: 8,
    paddingVertical: 16,
  },
  contactCard: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 8,
    marginBottom: 24,
    maxWidth: '33.33%',
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
    backgroundColor: '#2563EB',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  contactPhoto: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  placeholderPhoto: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  modalContainer: {
    flex: 1,
  },
  contactName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
  },
});

export default ContactList;
