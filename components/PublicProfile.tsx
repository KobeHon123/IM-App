import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Linking, ScrollView, Clipboard, Alert, Animated } from 'react-native';
import { User, Phone, Mail, X } from 'lucide-react-native';

interface PublicProfileProps {
  profile: any;
  onClose: () => void;
}

const PublicProfile = ({ profile, onClose }: PublicProfileProps) => {
  const [copiedMessage, setCopiedMessage] = useState<string | null>(null);
  const opacityAnim = useRef(new Animated.Value(1)).current;

  if (!profile) return null;

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
        <X color="#6B7280" size={24} />
      </TouchableOpacity>

      {copiedMessage && (
        <View style={styles.messageOverlay}>
          <Animated.View style={[styles.messageBox, { opacity: opacityAnim }]}>
            <Text style={styles.messageText}>{copiedMessage}</Text>
          </Animated.View>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.photoContainer}>
          {profile.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.profilePhoto} />
          ) : (
            <View style={styles.placeholderPhoto}>
              <User color="#6B7280" size={60} />
            </View>
          )}
        </View>

        <Text style={styles.userName}>{profile.full_name || 'User'}</Text>
        {profile.bio ? <Text style={styles.bioText}>"{profile.bio}"</Text> : null}

        <View style={styles.contactSection}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          
          {profile.email ? (
            <TouchableOpacity
              style={styles.contactItem}
              onPress={handleCopyEmail}
              onLongPress={handleCopyEmail}
            >
              <View style={[styles.iconCircle, { backgroundColor: '#FEF3C7' }]}>
                <Mail color="#D97706" size={20} />
              </View>
              <View>
                <Text style={styles.contactLabel}>Email</Text>
                <Text style={styles.contactValue}>{profile.email}</Text>
              </View>
            </TouchableOpacity>
          ) : null}
          
          {profile.phone_number ? (
            <TouchableOpacity
              style={styles.contactItem}
              onPress={handleCall}
              onLongPress={handleCopyPhone}
            >
              <View style={[styles.iconCircle, { backgroundColor: '#EFF6FF' }]}>
                <Phone color="#2563EB" size={20} />
              </View>
              <View>
                <Text style={styles.contactLabel}>Phone</Text>
                <Text style={styles.contactValue}>{profile.phone_number}</Text>
              </View>
            </TouchableOpacity>
          ) : null}

          {!profile.email && !profile.phone_number && (
            <Text style={styles.noInfo}>No contact information provided.</Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
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
    color: '#065F46',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  content: { alignItems: 'center', paddingTop: 60, paddingBottom: 40 },
  photoContainer: { marginBottom: 20 },
  profilePhoto: { width: 120, height: 120, borderRadius: 60, borderWidth: 3, borderColor: '#2563EB' },
  placeholderPhoto: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  userName: { fontSize: 24, fontWeight: '700', color: '#111827', marginBottom: 8 },
  bioText: { fontSize: 16, fontStyle: 'italic', color: '#4B5563', textAlign: 'center', marginHorizontal: 40, marginBottom: 30 },
  contactSection: { width: '100%', paddingHorizontal: 24 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 },
  contactItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', padding: 16, borderRadius: 12, marginBottom: 12, gap: 16 },
  iconCircle: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  contactLabel: { fontSize: 12, color: '#6B7280' },
  contactValue: { fontSize: 16, fontWeight: '600', color: '#111827' },
  noInfo: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', marginTop: 10 }
});

export default PublicProfile;