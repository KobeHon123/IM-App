import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  SafeAreaView,
  Modal,
  TextInput,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { User, Edit2, LogOut, Camera } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import PublicProfile from '@/components/PublicProfile';
import ContactList from '@/components/ContactList';

const ProfileScreen = () => {
  const { profile, signOut, refreshProfile, user } = useAuth();
  const [userName, setUserName] = useState('');
  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [email, setEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showContactListModal, setShowContactListModal] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const emailValidationTimer = useRef<NodeJS.Timeout | null>(null);
  const successOpacityAnim = useRef(new Animated.Value(1)).current;
  const errorOpacityAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (profile) {
      console.log('Profile loaded:', profile);
      setUserName(profile.full_name || 'User');
      setUserPhoto(profile.avatar_url);
      setPhone(profile.phone_number || '');
      setBio(profile.bio || '');
      setEmail(profile.email || '');
    } else {
      console.log('No profile loaded');
    }
  }, [profile]);

  useEffect(() => {
    if (successMessage) {
      successOpacityAnim.setValue(1);
      Animated.timing(successOpacityAnim, {
        toValue: 0,
        duration: 3000,
        useNativeDriver: true,
      }).start(() => setSuccessMessage(null));
    }
    if (errorMessage) {
      errorOpacityAnim.setValue(1);
      Animated.timing(errorOpacityAnim, {
        toValue: 0,
        duration: 3000,
        useNativeDriver: true,
      }).start(() => setErrorMessage(null));
    }
  }, [successMessage, errorMessage]);

  const handleSelectPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      setErrorMessage('We need access to your gallery to select a photo.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: false,
      quality: 0.7,
      aspect: [1, 1],
      allowsEditing: true,
    });

    if (!result.canceled && profile) {
      const uri = result.assets[0].uri;
      setIsUploadingPhoto(true);

      try {
        console.log('Uploading photo for user:', profile.id);
        const response = await fetch(uri);
        const blob = await response.blob();
        const fileExt = uri.split('.').pop();
        const fileName = `${profile.id}-${Date.now()}.${fileExt}`;
        const filePath = `avatars/${fileName}`;

        console.log('Uploading to storage:', filePath);
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, blob, {
            contentType: `image/${fileExt}`,
            upsert: true,
          });

        if (uploadError) {
          console.error('Storage upload error:', uploadError);
          throw uploadError;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);

        console.log('Public URL:', publicUrl);
        console.log('Updating profile with avatar URL');

        const { data, error: updateError } = await supabase
          .from('profiles')
          .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
          .eq('id', profile.id)
          .select();

        console.log('Profile update response:', { data, error: updateError });

        if (updateError) {
          console.error('Profile update error:', updateError);
          throw updateError;
        }

        setUserPhoto(publicUrl);
        await refreshProfile();
        setSuccessMessage('Profile photo updated successfully');
      } catch (error: any) {
        console.error('Error uploading photo:', error);
        setErrorMessage(error.message || 'Failed to upload photo. Please try again.');
      } finally {
        setIsUploadingPhoto(false);
      }
    }
  };

  const handleEditName = () => {
    setEditName(userName);
    setEditPhone(phone);
    setEditBio(bio);
    setEditEmail(email);
    setEmailError(null);
    setShowEditModal(true);
  };

  const validateEmail = async (emailToCheck: string) => {
    if (!emailToCheck || emailToCheck === email) {
      setEmailError(null);
      return;
    }

    setCheckingEmail(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', emailToCheck.toLowerCase())
        .neq('id', profile?.id || 'null')
        .single();

      if (data) {
        setEmailError('This email was already registered by another user');
      } else {
        setEmailError(null);
      }
    } catch (error) {
      setEmailError(null);
    } finally {
      setCheckingEmail(false);
    }
  };

  const handleEmailChange = (text: string) => {
    setEditEmail(text);
    
    if (emailValidationTimer.current) {
      clearTimeout(emailValidationTimer.current);
    }

    emailValidationTimer.current = setTimeout(() => {
      validateEmail(text);
    }, 500);
  };

  const handleSaveName = async () => {
    if (!profile) {
      setErrorMessage('Profile not loaded');
      return;
    }

    if (emailError) {
      setErrorMessage('Please fix the email error before saving');
      return;
    }

    setIsUpdating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      console.log('Current session:', session ? 'Active' : 'None');
      console.log('Session user ID:', session?.user?.id);
      console.log('Profile ID:', profile.id);
      console.log('Updating profile for user:', profile.id);

      const { data, error } = await supabase
        .from('profiles')
        .update({
          full_name: editName.trim(),
          phone_number: editPhone.trim(),
          bio: editBio.trim(),
          email: editEmail.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', profile.id)
        .select();

      console.log('Update response:', { data, error });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      setUserName(editName.trim());
      setPhone(editPhone.trim());
      setBio(editBio.trim());
      setEmail(editEmail.trim());
      setShowEditModal(false);
      await refreshProfile();
      setSuccessMessage('Profile updated successfully');
    } catch (error: any) {
      console.error('Error updating profile:', error);
      setErrorMessage(error.message || 'Failed to update profile. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = async () => {
    console.log('[Profile] Logout confirmation - starting signOut');
    try {
      await signOut();
      console.log('[Profile] SignOut completed successfully');
      setShowLogoutModal(false);
    } catch (error) {
      console.error('[Profile] Error signing out:', error);
      setErrorMessage('Failed to sign out. Please try again.');
      setShowLogoutModal(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      {successMessage && (
        <View style={styles.messageOverlay}>
          <Animated.View style={[styles.successMessageBox, { opacity: successOpacityAnim }]}>
            <Text style={styles.successMessageText}>{successMessage}</Text>
          </Animated.View>
        </View>
      )}

      {errorMessage && (
        <View style={styles.messageOverlay}>
          <Animated.View style={[styles.errorMessageBox, { opacity: errorOpacityAnim }]}>
            <Text style={styles.errorMessageText}>{errorMessage}</Text>
          </Animated.View>
        </View>
      )}

      <View style={styles.content}>
        <View style={styles.profileSection}>
          <View style={styles.photoContainer}>
            {userPhoto ? (
              <Image source={{ uri: userPhoto }} style={styles.profilePhoto} />
            ) : (
              <View style={styles.placeholderPhoto}>
                <User color="#6B7280" size={60} />
              </View>
            )}
            <TouchableOpacity
              style={styles.cameraButton}
              onPress={handleSelectPhoto}
              disabled={isUploadingPhoto}
            >
              {isUploadingPhoto ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Camera color="#FFFFFF" size={16} />
              )}
            </TouchableOpacity>
          </View>

         <View style={styles.nameSection}>
  <Text style={styles.userName}>{userName}</Text>
  {email ? <Text style={styles.userEmail}>{email}</Text> : null}
  
  {/* Added display for Phone and Bio */}
  {phone ? <Text style={styles.infoText}>📞 {phone}</Text> : null}
  {bio ? <Text style={styles.bioText}>"{bio}"</Text> : null}

  {/* New Row for Edit and Preview Buttons */}
  <View style={styles.buttonRow}>
    <TouchableOpacity style={styles.editButton} onPress={handleEditName}>
      <Edit2 color="#2563EB" size={18} />
      <Text style={styles.editButtonText}>Edit</Text>
    </TouchableOpacity>

    <TouchableOpacity 
      style={styles.previewButton}
      onPress={() => setShowPreviewModal(true)}
    >
      <User color="#4B5563" size={18} />
      <Text style={styles.previewButtonText}>Preview</Text>
    </TouchableOpacity>
  </View>
</View>
        </View> 

        <View style={styles.contactListButtonSection}>
          <TouchableOpacity
            style={styles.contactListButton}
            onPress={() => setShowContactListModal(true)}
          >
            <User color="#2563EB" size={20} />
            <Text style={styles.contactListButtonText}>View Contacts</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.actionsSection}>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
          >
            <LogOut color="#EF4444" size={20} />
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Modal
        visible={showEditModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            onPress={() => setShowEditModal(false)}
            activeOpacity={1}
          />
          <View style={styles.editModal}>
            <Text style={styles.modalTitle}>Edit Profile</Text>
            
            <Text style={styles.inputLabel}>Name</Text>
            <TextInput
              style={styles.nameInput}
              value={editName}
              onChangeText={setEditName}
              placeholder="Enter your name"
              placeholderTextColor="#6B728080"
              autoFocus
            />

            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={[styles.nameInput, emailError && styles.inputError]}
              value={editEmail}
              onChangeText={handleEmailChange}
              placeholder="Enter email"
              keyboardType="email-address"
              editable={!checkingEmail}
            />
            {emailError && <Text style={styles.errorText}>{emailError}</Text>}

            <Text style={styles.inputLabel}>Phone Number</Text>
            <TextInput
              style={styles.nameInput}
              value={editPhone}
              onChangeText={setEditPhone}
              placeholder="Enter phone number"
              keyboardType="phone-pad"
            />

            <Text style={styles.inputLabel}>About You</Text>
            <TextInput
              style={[styles.nameInput, { height: 80 }]}
              value={editBio}
              onChangeText={setEditBio}
              placeholder="Describe yourself..."
              multiline
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowEditModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, (isUpdating || emailError) && { opacity: 0.6 }]}
                onPress={handleSaveName}
                disabled={isUpdating || !!emailError}
              >
                {isUpdating ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveButtonText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showLogoutModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowLogoutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            onPress={() => setShowLogoutModal(false)}
            activeOpacity={1}
          />
          <View style={styles.editModal}>
            <Text style={styles.modalTitle}>Logout</Text>
            <Text style={styles.confirmText}>Are you sure you want to logout?</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowLogoutModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.logoutConfirmButton}
                onPress={confirmLogout}
              >
                <Text style={styles.logoutConfirmButtonText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <Modal

  visible={showPreviewModal}
  animationType="slide"
  presentationStyle="pageSheet"
  onRequestClose={() => setShowPreviewModal(false)}
>
  <PublicProfile 
    profile={profile} 
    onClose={() => setShowPreviewModal(false)} 
  />
</Modal>

      <Modal
        visible={showContactListModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowContactListModal(false)}
      >
        <ContactList
          onClose={() => setShowContactListModal(false)}
          currentUserId={profile?.id}
        />
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
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
  content: {
    flex: 1,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  photoContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  profilePhoto: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#2563EB',
  },
  placeholderPhoto: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#E5E7EB',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  nameSection: {
    alignItems: 'center',
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  editButtonText: {
    fontSize: 14,
    color: '#2563EB',
    fontWeight: '600',
  },
  actionsSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FEE2E2',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  logoutButtonText: {
    fontSize: 16,
    color: '#EF4444',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '85%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 20,
    textAlign: 'center',
  },
  nameInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#FFFFFF',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#2563EB',
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  successBanner: {
    backgroundColor: '#D1FAE5',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#A7F3D0',
  },
  successText: {
    color: '#065F46',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  errorBanner: {
    backgroundColor: '#FEE2E2',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#FECACA',
  },
  errorText: {
    color: '#991B1B',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  messageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'none',
    zIndex: 10,
  },
  successMessageBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  successMessageText: {
    color: '#065F46',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  errorMessageBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  errorMessageText: {
    color: '#991B1B',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  confirmText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  logoutConfirmButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    alignItems: 'center',
  },
  logoutConfirmButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  inputError: {
    borderColor: '#EF4444',
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '500',
    marginTop: -16,
    marginBottom: 16,
  },
  infoText: {
    fontSize: 14,
    color: '#4B5563',
    marginTop: 4,
    marginBottom: 4,
  },
  bioText: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  previewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  previewButtonText: {
    fontSize: 14,
    color: '#4B5563',
    fontWeight: '600',
  },
  contactListButtonSection: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F9FAFB',
  },
  contactListButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  contactListButtonText: {
    fontSize: 16,
    color: '#2563EB',
    fontWeight: '600',
  },
});

export default ProfileScreen;
