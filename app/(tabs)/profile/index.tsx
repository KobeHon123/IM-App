import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Modal,
  TextInput,
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User, Edit2, LogOut, Camera, Phone } from 'lucide-react-native';
import { usePlatformImagePicker } from '@/hooks/usePlatformImagePicker';
import * as FileSystem from 'expo-file-system/legacy';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import PublicProfile from '@/components/PublicProfile';
import ContactList from '@/components/ContactList';
import { useEasterEgg } from '@/context/EasterEggContext';
import { ThemedText } from '@/components/ThemedText';

const ProfileScreen = () => {
  const { profile, signOut, refreshProfile, user } = useAuth();
  const { showOffWorkCounter, setShowOffWorkCounter, handleBioTap, timeLeft, isOffTime } = useEasterEgg();
  const { requestPermissionsAsync, launchImageLibraryAsync } = usePlatformImagePicker();
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
  const [bioTapCount, setBioTapCount] = useState(0);
  const [showOffWorkCounterLocal, setShowOffWorkCounterLocal] = useState(false);
  const [offWorkCount, setOffWorkCount] = useState(0);
  const [timeLeftLocal, setTimeLeftLocal] = useState<string>('');
  const [isOffTimeLocal, setIsOffTimeLocal] = useState(false);
  const emailValidationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const successOpacityAnim = useRef(new Animated.Value(1)).current;
  const errorOpacityAnim = useRef(new Animated.Value(1)).current;
  const modalTransformAnim = useRef(new Animated.Value(0)).current;
  const slideUpAnim = useRef(new Animated.Value(1000)).current;

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

  // Slide in from right animation when edit screen opens
  useEffect(() => {
    if (showEditModal) {
      slideUpAnim.setValue(800);
      Animated.timing(slideUpAnim, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }).start();
    } else {
      slideUpAnim.setValue(0);
      Animated.timing(slideUpAnim, {
        toValue: 800,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [showEditModal, slideUpAnim]);

  // Keyboard animation for edit modal
  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => {
        Animated.spring(modalTransformAnim, {
          toValue: -30,
          useNativeDriver: true,
          speed: 12,
          bounciness: 4,
        }).start();
      }
    );

    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        Animated.spring(modalTransformAnim, {
          toValue: 0,
          useNativeDriver: true,
          speed: 12,
          bounciness: 4,
        }).start();
      }
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, [modalTransformAnim]);

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

  const handlePhotoUpload = async (uri: string, profile: any) => {
    try {
      const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${profile.id}-${Date.now()}.${fileExt}`;

      console.log('Starting upload for:', fileName);
      console.log('File URI:', uri);

      // Read file as base64 using FileSystem
      console.log('Reading file from URI...');
      const base64Data = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      console.log('Base64 data length:', base64Data.length);
      
      if (!base64Data || base64Data.length === 0) {
        throw new Error('Failed to read image file');
      }

      // Upload base64 data directly to Supabase
      console.log('Uploading to Supabase storage...');
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, decode(base64Data), {
          contentType: `image/${fileExt}`,
          upsert: true,
        });

      console.log('Upload response:', { uploadData, uploadError });

      if (uploadError) {
        throw uploadError;
      }

      console.log('File uploaded successfully:', uploadData?.path);

      // Generate public URL
      const { data: publicUrlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      const publicUrl = publicUrlData.publicUrl;
      console.log('Generated public URL:', publicUrl);

      // Update profile with avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
        .eq('id', profile.id);

      if (updateError) {
        throw updateError;
      }

      console.log('Profile updated successfully');
      setUserPhoto(publicUrl);
      await refreshProfile();
      setSuccessMessage('Profile photo updated successfully');
    } catch (error: any) {
      console.error('Upload error:', error);
      throw error;
    }
  };

  // Helper function to decode base64 to Uint8Array
  const decode = (base64: string): Uint8Array => {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  };

  const handleSelectPhoto = async () => {
    const hasPermission = await requestPermissionsAsync();
    if (!hasPermission) {
      setErrorMessage('We need access to your gallery to select a photo.');
      return;
    }

    const result = await launchImageLibraryAsync({
      mediaTypes: 'Images',
      allowsMultipleSelection: false,
      quality: 0.7,
      aspect: [1, 1],
      allowsEditing: true,
    });

    if (result && profile) {
      const uri = result.uri;
      setIsUploadingPhoto(true);

      try {
        console.log('User selected photo:', uri);
        await handlePhotoUpload(uri, profile);
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

  const handleBioTapLocal = () => {
    handleBioTap();
  };

  const incrementOffWorkCounter = () => {
    setOffWorkCount(prev => prev + 1);
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
        <ThemedText style={styles.headerTitle}>Profile</ThemedText>
      </View>

      {successMessage && (
        <View style={styles.messageOverlay}>
          <Animated.View style={[styles.successMessageBox, { opacity: successOpacityAnim }]}>
            <ThemedText style={styles.successMessageText}>{successMessage}</ThemedText>
          </Animated.View>
        </View>
      )}

      {errorMessage && (
        <View style={styles.messageOverlay}>
          <Animated.View style={[styles.errorMessageBox, { opacity: errorOpacityAnim }]}>
            <ThemedText style={styles.errorMessageText}>{errorMessage}</ThemedText>
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
  <ThemedText style={styles.userName}>{userName}</ThemedText>
  {email ? <ThemedText style={styles.userEmail}>{email}</ThemedText> : null}
  
  {/* Added display for Phone and Bio */}
  {phone ? (
    <View style={styles.infoRow}>
      <Phone color="#4B5563" size={16} />
      <ThemedText style={styles.infoText}>{phone}</ThemedText>
    </View>
  ) : null}
  {bio ? <ThemedText style={styles.bioText}>"{bio}"</ThemedText> : null}

  {/* New Row for Edit and Preview Buttons */}
  <View style={styles.buttonRow}>
    <TouchableOpacity style={styles.editButton} onPress={handleEditName}>
      <Edit2 color="#2563EB" size={18} />
      <ThemedText style={styles.editButtonText}>Edit</ThemedText>
    </TouchableOpacity>

    <TouchableOpacity 
      style={styles.previewButton}
      onPress={() => setShowPreviewModal(true)}
    >
      <User color="#4B5563" size={18} />
      <ThemedText style={styles.previewButtonText}>Preview</ThemedText>
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
            <ThemedText style={styles.contactListButtonText}>View Contacts</ThemedText>
          </TouchableOpacity>
        </View>

        <View style={styles.actionsSection}>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
          >
            <LogOut color="#EF4444" size={20} />
            <ThemedText style={styles.logoutButtonText}>Logout</ThemedText>
          </TouchableOpacity>
        </View>
      </View>

      <Animated.View
        style={[
          styles.editScreenOverlay,
          {
            transform: [{ translateX: slideUpAnim }],
          },
        ]}
      >
        <SafeAreaView style={styles.editScreenContainer}>
          <KeyboardAvoidingView
            style={styles.keyboardAvoidingView}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
          >
            <View style={styles.editScreenHeader}>
              <TouchableOpacity
                style={styles.closeButtonTop}
                onPress={() => setShowEditModal(false)}
              >
                <ThemedText style={styles.closeButtonText}>✕</ThemedText>
              </TouchableOpacity>
              <ThemedText style={styles.editScreenTitle}>Edit Profile</ThemedText>
              <TouchableOpacity
                style={[styles.saveButtonTop, (isUpdating || emailError) && { opacity: 0.6 }]}
                onPress={handleSaveName}
                disabled={isUpdating || !!emailError}
              >
                {isUpdating ? (
                  <ActivityIndicator color="#2563EB" size="small" />
                ) : (
                  <ThemedText style={styles.saveButtonTopText}>Save</ThemedText>
                )}
              </TouchableOpacity>
            </View>

            <ScrollView
              contentContainerStyle={styles.editScreenContent}
              showsVerticalScrollIndicator={false}
              bounces={false}
              keyboardShouldPersistTaps="handled"
            >
              <View>
                <ThemedText style={styles.inputLabel}>Name</ThemedText>
                <TextInput
                  style={styles.nameInput}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Enter your name"
                  placeholderTextColor="#6B728080"
                />
              </View>

              <View>
                <ThemedText style={styles.inputLabel}>Email</ThemedText>
                <TextInput
                  style={[styles.nameInput, emailError && styles.inputError]}
                  value={editEmail}
                  onChangeText={handleEmailChange}
                  placeholder="Enter email"
                  keyboardType="email-address"
                  editable={!checkingEmail}
                />
                {emailError && <ThemedText style={styles.errorText}>{emailError}</ThemedText>}
              </View>

              <View>
                <ThemedText style={styles.inputLabel}>Phone Number</ThemedText>
                <TextInput
                  style={styles.nameInput}
                  value={editPhone}
                  onChangeText={setEditPhone}
                  placeholder="Enter phone number"
                  keyboardType="phone-pad"
                />
              </View>

              <View>
                <ThemedText style={styles.inputLabel}>About You</ThemedText>
                <TextInput
                  style={[styles.nameInput, { height: 90, paddingTop: 12, textAlignVertical: 'top' }]}
                  value={editBio}
                  onChangeText={setEditBio}
                  placeholder="Describe yourself..."
                  multiline
                  maxLength={150}
                />
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Animated.View>

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
          <View style={styles.logoutModal}>
            <View style={styles.logoutModalIcon}>
              <LogOut color="#DC2626" size={32} />
            </View>
            <ThemedText style={styles.logoutModalTitle}>Logout?</ThemedText>
            <ThemedText style={styles.confirmText}>Are you sure you want to logout?</ThemedText>
            <View style={styles.logoutModalButtons}>
              <TouchableOpacity
                style={styles.logoutCancelButton}
                onPress={() => setShowLogoutModal(false)}
              >
                <ThemedText style={styles.logoutCancelButtonText}>Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.logoutConfirmButton}
                onPress={confirmLogout}
              >
                <ThemedText style={styles.logoutConfirmButtonText}>Logout</ThemedText>
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
    onBioTap={handleBioTapLocal}
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
    marginBottom: 6,
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
    gap: 12,
    paddingVertical: 14,
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#FECACA',
  },
  logoutButtonText: {
    fontSize: 16,
    color: '#DC2626',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  logoutModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
    alignItems: 'center',
  },
  logoutModalIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoutModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  confirmText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 21,
  },
  logoutModalButtons: {
    flexDirection: 'column',
    gap: 10,
    width: '100%',
  },
  logoutCancelButton: {
    paddingVertical: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 9,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  logoutCancelButtonText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '600',
  },
  logoutConfirmButton: {
    paddingVertical: 12,
    backgroundColor: '#DC2626',
    borderRadius: 9,
    alignItems: 'center',
  },
  logoutConfirmButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  editScreenOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    zIndex: 100,
  },
  editScreenContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  editScreenHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  editScreenTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  closeButtonTop: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  closeButtonText: {
    fontSize: 20,
    color: '#6B7280',
    fontWeight: '300',
  },
  saveButtonTop: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#2563EB',
    borderRadius: 8,
  },
  saveButtonTopText: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  editScreenContent: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    paddingBottom: 40,
  },
  nameInput: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#F9FAFB',
    marginBottom: 22,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
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
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    textTransform: 'capitalize',
    letterSpacing: 0.3,
  },
  inputError: {
    borderColor: '#EF4444',
  },
  formErrorText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '500',
    marginTop: -14,
    marginBottom: 14,
  },
  infoText: {
    fontSize: 14,
    color: '#4B5563',
    marginTop: 2,
    marginBottom: 2,
  },
  bioText: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
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
