import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  Alert,
  Image,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Plus, MapPin, Camera, EllipsisVertical} from 'lucide-react-native';
import { usePlatformImagePicker } from '@/hooks/usePlatformImagePicker';
import { getVenuesByProject, createVenue, updateVenue, deleteVenue } from '@/lib/supabaseHelpers';
import { Venue } from '@/types';
import { useData } from '@/hooks/useData';
import { DesignerSelector } from '@/components/DesignerSelector';
import LoadingSpinner from '@/components/LoadingSpinner';
import { ThemedText } from '@/components/ThemedText';

const VenueTab = ({ projectId }: { projectId: string }) => {
  const { profiles } = useData();
  const { requestPermissionsAsync, launchImageLibraryAsync } = usePlatformImagePicker();
  const [venues, setVenues] = React.useState<Venue[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    loadVenues();
  }, [projectId]);

  const loadVenues = async () => {
    try {
      setLoading(true);
      const venueData = await getVenuesByProject(projectId);
      setVenues(venueData);
    } catch (error) {
      console.error('Error loading venues:', error);
      Alert.alert('Error', 'Failed to load venues');
    } finally {
      setLoading(false);
    }
  };

  const [showCreateVenueModal, setShowCreateVenueModal] = useState(false);
  const [showEditVenueModal, setShowEditVenueModal] = useState(false);
  const [showVenueActionModal, setShowVenueActionModal] = useState(false);
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [newVenue, setNewVenue] = useState({
    name: '',
    description: '',
    pic: '',
    thumbnail: '',
  });
  const [editingVenue, setEditingVenue] = useState({
    name: '',
    description: '',
    pic: '',
    thumbnail: '',
  });

  // Check if venue name already exists in this project
  const isVenueNameDuplicate = newVenue.name.trim() !== '' && 
    venues.some(v => v.name.toLowerCase() === newVenue.name.trim().toLowerCase());


  const handleCreateVenue = async () => {
    if (!newVenue.name.trim() || !newVenue.pic.trim()) {
      Alert.alert('Error', 'Please fill in venue name and PIC');
      return;
    }
    try {
      console.log('Creating venue:', newVenue);
      await createVenue({
        ...newVenue,
        projectId,
        partQuantities: {},
      });
      setNewVenue({ name: '', description: '', pic: '', thumbnail: '' });
      setShowCreateVenueModal(false);
      await loadVenues();
    } catch (error) {
      console.error('Error creating venue:', error);
      Alert.alert('Error', 'Failed to create venue');
    }
  };

  const handleEditVenue = async () => {
    if (!selectedVenue || !editingVenue.name.trim() || !editingVenue.pic.trim()) {
      Alert.alert('Error', 'Please fill in venue name and PIC');
      return;
    }
    try {
      console.log('Editing venue ID:', selectedVenue.id, editingVenue);
      await updateVenue(selectedVenue.id, editingVenue);
      setShowEditVenueModal(false);
      setSelectedVenue(null);
      await loadVenues();
    } catch (error) {
      console.error('Error updating venue:', error);
      Alert.alert('Error', 'Failed to update venue');
    }
  };

  const handleDeleteVenue = () => {
    if (!selectedVenue) {
      console.log('No venue selected for deletion');
      return;
    }
    console.log('Showing delete venue alert for ID:', selectedVenue.id);
    Alert.alert(
      'Delete Venue',
      `Are you sure you want to delete "${selectedVenue.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('Deleting venue ID:', selectedVenue.id);
              await deleteVenue(selectedVenue.id);
              setShowVenueActionModal(false);
              setSelectedVenue(null);
              await loadVenues();
            } catch (error) {
              console.error('Error deleting venue:', error);
              Alert.alert('Error', 'Failed to delete venue');
            }
          },
        },
      ]
    );
  };

  const handleVenueAction = (action: string) => {
    if (!selectedVenue) {
      console.log('No venue selected for action:', action);
      return;
    }
    console.log('Venue action:', action, 'for venue ID:', selectedVenue.id);
    switch (action) {
      case 'edit':
        setEditingVenue({
          name: selectedVenue.name,
          description: selectedVenue.description,
          pic: selectedVenue.pic,
          thumbnail: selectedVenue.thumbnail || '',
        });
        setShowEditVenueModal(true);
        break;
      case 'delete':
        handleDeleteVenue();
        break;
    }
    setShowVenueActionModal(false);
  };

  const handleSelectThumbnail = async (isEdit = false) => {
    const hasPermission = await requestPermissionsAsync();
    if (!hasPermission) {
      Alert.alert('Permission Denied', 'We need access to your gallery to select a thumbnail.');
      return;
    }
    const result = await launchImageLibraryAsync({
      mediaTypes: 'Images',
      allowsMultipleSelection: false,
      quality: 1,
    });
    if (result) {
      const uri = result.uri;
      console.log('Selected thumbnail:', uri);
      if (isEdit) {
        setEditingVenue((prev) => ({ ...prev, thumbnail: uri }));
      } else {
        setNewVenue((prev) => ({ ...prev, thumbnail: uri }));
      }
    }
  };

  if (loading) {
    return (
      <View style={styles.tabContent}>
        <View style={styles.loadingContainer}>
          <LoadingSpinner size={50} color="#007AFF" strokeWidth={5} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.tabContent}>
      <ScrollView style={styles.venueList} showsVerticalScrollIndicator={false}>
        {venues.map((venue) => (
          <View key={venue.id} style={styles.venueCard}>
            <TouchableOpacity
              style={styles.venueCardContent}
              onPress={() => {
                console.log('Navigating to venue ID:', venue.id);
                router.push(`/(tabs)/projects/venue/${venue.id}`);
              }}
            >
              <View style={styles.venueThumbnailContainer}>
                {venue.thumbnail ? (
                  <Image source={{ uri: venue.thumbnail }} style={styles.venueThumbnail} />
                ) : (
                  <View style={styles.venueIconContainer}>
                    <MapPin color="#059669" size={24} />
                  </View>
                )}
              </View>
              <View style={styles.venueContent}>
                <ThemedText style={[styles.venueName, !venue.description && styles.venueNameNoDescription]}>{venue.name}</ThemedText>
                {venue.description ? (
                  <ThemedText style={styles.venueDescription}>{venue.description}</ThemedText>
                ) : null}
                <ThemedText style={styles.venuePic}>Measurer: {venue.pic}</ThemedText>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.venueMoreButton}
              onPress={() => {
                console.log('Opening venue action modal for ID:', venue.id);
                setSelectedVenue(venue);
                setShowVenueActionModal(true);
              }}
            >
              <EllipsisVertical color="#6B7280" size={20} />
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
      <TouchableOpacity
        style={styles.floatingAddButton}
        onPress={() => {
          console.log('Opening create venue modal');
          setShowCreateVenueModal(true);
        }}
      >
        <Plus color="#FFFFFF" size={28} />
      </TouchableOpacity>
      <Modal
        visible={showCreateVenueModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <ThemedText style={styles.modalTitle}>Create New Venue</ThemedText>
            <TouchableOpacity
              onPress={() => {
                console.log('Closing create venue modal');
                setShowCreateVenueModal(false);
                setSelectedVenue(null);
              }}
            >
              <ThemedText style={styles.modalClose}>Cancel</ThemedText>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Venue Name *</ThemedText>
              <TextInput
                style={styles.input}
                value={newVenue.name}
                onChangeText={(text) => setNewVenue((prev) => ({ ...prev, name: text }))}
                placeholder="Enter venue name"
                placeholderTextColor="#6B728080"
              />
            </View>
            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Measurer*</ThemedText>
              <DesignerSelector
                value={newVenue.pic}
                onChangeText={(text) => setNewVenue((prev) => ({ ...prev, pic: text }))}
                profiles={profiles}
                placeholder="Enter PIC name"
                placeholderTextColor="#6B728080"
                inputStyle={styles.input}
              />
            </View>
            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Description</ThemedText>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={newVenue.description}
                onChangeText={(text) => setNewVenue((prev) => ({ ...prev, description: text }))}
                placeholder="Enter venue description"
                placeholderTextColor="#6B728080"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Venue Thumbnail (Optional)</ThemedText>
              <TouchableOpacity
                style={styles.pictureButton}
                onPress={() => handleSelectThumbnail(false)}
              >
                <Camera color="#6B7280" size={24} />
                <ThemedText style={styles.pictureButtonText}>Add Thumbnail</ThemedText>
              </TouchableOpacity>
              {newVenue.thumbnail && (
                <Image source={{ uri: newVenue.thumbnail }} style={styles.thumbnailPreview} />
              )}
            </View>
            {isVenueNameDuplicate && (
              <ThemedText style={styles.duplicateWarning}>A venue with this name already exists in this project</ThemedText>
            )}

            <TouchableOpacity
              style={[styles.createButton, isVenueNameDuplicate && styles.disabledButton]}
              onPress={handleCreateVenue}
              disabled={isVenueNameDuplicate}
            >
              <ThemedText style={[styles.createButtonText, isVenueNameDuplicate && styles.disabledButtonText]}>Create Venue</ThemedText>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
      <Modal
        visible={showEditVenueModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <ThemedText style={styles.modalTitle}>Edit Venue</ThemedText>
            <TouchableOpacity
              onPress={() => {
                console.log('Closing edit venue modal');
                setShowEditVenueModal(false);
                setSelectedVenue(null);
              }}
            >
              <ThemedText style={styles.modalClose}>Cancel</ThemedText>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Venue Name *</ThemedText>
              <TextInput
                style={styles.input}
                value={editingVenue.name}
                onChangeText={(text) => setEditingVenue((prev) => ({ ...prev, name: text }))}
                placeholder="Enter venue name"
                placeholderTextColor="#6B728080"
              />
            </View>
            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Person in Charge (PIC) *</ThemedText>
              <DesignerSelector
                value={editingVenue.pic}
                onChangeText={(text) => setEditingVenue((prev) => ({ ...prev, pic: text }))}
                profiles={profiles}
                placeholder="Enter PIC name"
                placeholderTextColor="#6B728080"
                inputStyle={styles.input}
              />
            </View>
            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Description</ThemedText>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={editingVenue.description}
                onChangeText={(text) => setEditingVenue((prev) => ({ ...prev, description: text }))}
                placeholder="Enter venue description"
                placeholderTextColor="#6B728080"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Venue Thumbnail (Optional)</ThemedText>
              <TouchableOpacity
                style={styles.pictureButton}
                onPress={() => handleSelectThumbnail(true)}
              >
                <Camera color="#6B7280" size={24} />
                <ThemedText style={styles.pictureButtonText}>Change Thumbnail</ThemedText>
              </TouchableOpacity>
              {editingVenue.thumbnail && (
                <Image source={{ uri: editingVenue.thumbnail }} style={styles.thumbnailPreview} />
              )}
            </View>
            <TouchableOpacity
              style={styles.createButton}
              onPress={handleEditVenue}
            >
              <ThemedText style={styles.createButtonText}>Save Changes</ThemedText>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
      <Modal
        visible={showVenueActionModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => {
          console.log('Closing venue action modal');
          setShowVenueActionModal(false);
          setSelectedVenue(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            onPress={() => {
              console.log('Closing venue action modal via backdrop');
              setShowVenueActionModal(false);
              setSelectedVenue(null);
            }}
            activeOpacity={1}
          />
          <View style={styles.actionModal}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleVenueAction('edit')}
            >
              <ThemedText style={styles.actionButtonText}>Edit Venue</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={() => handleVenueAction('delete')}
            >
              <ThemedText style={[styles.actionButtonText, styles.deleteButtonText]}>Delete Venue</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  tabContent: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  venueList: {
    flex: 1,
    paddingHorizontal: 16,
    marginTop: 8,
  },
  venueCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  venueCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  venueThumbnailContainer: {
    marginRight: 12,
  },
  venueThumbnail: {
    width: 48,
    height: 48,
    borderRadius: 12,
  },
  venueIconContainer: {
    width: 48,
    height: 48,
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  venueContent: {
    flex: 1,
  },
  venueName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  venueNameNoDescription: {
    marginBottom: 8,
  },
  venueDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  venuePic: {
    fontSize: 12,
    color: '#6B7280',
  },
  venueMoreButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 8,
  },
  floatingAddButton: {
    position: 'absolute',
    bottom: 32,
    right: 32,
    width: 56,
    height: 56,
    backgroundColor: '#2563EB',
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  modalClose: {
    fontSize: 16,
    color: '#6B7280',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },
  textArea: {
    height: 100,
  },
  pictureButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderStyle: 'dashed',
    borderRadius: 8,
  },
  pictureButtonText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#6B7280',
  },
  thumbnailPreview: {
    width: 100,
    height: 100,
    marginTop: 10,
    borderRadius: 8,
    alignSelf: 'center',
  },
  createButton: {
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  disabledButtonText: {
    color: '#9CA3AF',
  },
  duplicateWarning: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
    marginBottom: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    minWidth: 200,
  },
  actionButton: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  actionButtonText: {
    fontSize: 16,
    color: '#111827',
    textAlign: 'center',
  },
  deleteButton: {
    borderBottomWidth: 0,
  },
  deleteButtonText: {
    color: '#EF4444',
  },
});

export default VenueTab;