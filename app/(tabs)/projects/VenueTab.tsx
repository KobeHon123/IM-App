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
import { Plus, MapPin, Camera, ArrowUpDown, Pencil, Trash2 } from 'lucide-react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { usePlatformImagePicker } from '@/hooks/usePlatformImagePicker';
import { getVenuesByProject, createVenue, updateVenue, deleteVenue } from '@/lib/supabaseHelpers';
import { Part, Venue } from '@/types';
import { useData } from '@/hooks/useData';
import { DesignerSelector } from '@/components/DesignerSelector';
import { SearchBar } from '@/components/SearchBar';
import LoadingSpinner from '@/components/LoadingSpinner';
import { ThemedText } from '@/components/ThemedText';

const VenueTab = ({ projectId, viewMode = 'cards' }: { projectId: string; viewMode?: 'cards' | 'matrix' }) => {
  const { profiles, parts: globalParts } = useData();
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
  const [searchQuery, setSearchQuery] = useState('');
  const [sortAsc, setSortAsc] = useState(true);
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

  const sortedVenues = [...venues]
    .sort((a, b) => {
      if (sortAsc) {
        return a.name.trim().toLowerCase().localeCompare(b.name.trim().toLowerCase());
      }

      const aTime = new Date((a as any).created_at ?? a.createdAt ?? 0).getTime();
      const bTime = new Date((b as any).created_at ?? b.createdAt ?? 0).getTime();
      return bTime - aTime;
    });

  const filteredVenues = [...sortedVenues]
    .filter((venue) =>
      venue.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      venue.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      venue.pic.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const projectParts = [...globalParts]
    .filter(part => part.projectId === projectId)
    .sort((a, b) => {
      if (a.parentPartId && !b.parentPartId) return 1;
      if (!a.parentPartId && b.parentPartId) return -1;
      return a.name.trim().toLowerCase().localeCompare(b.name.trim().toLowerCase());
    });

  const matrixParts = projectParts.filter(part => !part.parentPartId);

  const getPartRowLabel = (part: Part) => part.parentPartId ? `↳ ${part.name}` : part.name;


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

  const handleDeleteVenue = (venue: Venue) => {
    console.log('Showing delete venue alert for ID:', venue.id);
    Alert.alert(
      'Delete Venue',
      `Are you sure you want to delete "${venue.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('Deleting venue ID:', venue.id);
              await deleteVenue(venue.id);
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
      {viewMode === 'cards' ? (
        <>
          <View style={styles.searchRow}>
            <SearchBar
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search venues..."
              containerStyle={{ flex: 1, marginHorizontal: 0 }}
            />
            <TouchableOpacity
              style={styles.sortButton}
              onPress={() => setSortAsc(prev => !prev)}
              accessibilityLabel="Toggle sort order"
            >
              <ArrowUpDown color={sortAsc ? '#2563EB' : '#374151'} size={20} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.venueList} showsVerticalScrollIndicator={false}>
            {filteredVenues.map((venue) => (
          <ReanimatedSwipeable
            key={venue.id}
            containerStyle={{ backgroundColor: '#F9FAFB' }}
            renderLeftActions={(_prog, _drag, swipeable) => (
              <View style={styles.swipeActionsLeft}>
                <TouchableOpacity
                  style={styles.swipeActionButton}
                  onPress={() => {
                    swipeable.close();
                    setSelectedVenue(venue);
                    setEditingVenue({
                      name: venue.name,
                      description: venue.description,
                      pic: venue.pic,
                      thumbnail: venue.thumbnail || '',
                    });
                    setShowEditVenueModal(true);
                  }}
                >
                  <View style={[styles.swipeCircle, styles.swipeEditCircle]}>
                    <Pencil color="#FFFFFF" size={20} />
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.swipeActionButton}
                  onPress={() => {
                    swipeable.close();
                    handleDeleteVenue(venue);
                  }}
                >
                  <View style={[styles.swipeCircle, styles.swipeDeleteCircle]}>
                    <Trash2 color="#FFFFFF" size={20} />
                  </View>
                </TouchableOpacity>
              </View>
            )}
            friction={2}
            leftThreshold={80}
          >
            <View style={styles.venueCard}>
              <TouchableOpacity
                style={styles.venueCardContent}
                activeOpacity={1}
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
            </View>
          </ReanimatedSwipeable>
            ))}
          </ScrollView>
        </>
      ) : (
        <ScrollView style={styles.matrixWrapper} contentContainerStyle={styles.matrixWrapperContent} showsVerticalScrollIndicator={false}>
          {sortedVenues.length === 0 ? (
            <View style={styles.matrixEmptyState}>
              <ThemedText style={styles.matrixEmptyTitle}>No venues yet</ThemedText>
              <ThemedText style={styles.matrixEmptyText}>Create a venue to start comparing part quantities across locations.</ThemedText>
            </View>
          ) : matrixParts.length === 0 ? (
            <View style={styles.matrixEmptyState}>
              <ThemedText style={styles.matrixEmptyTitle}>No parts yet</ThemedText>
              <ThemedText style={styles.matrixEmptyText}>Create parts first, then this matrix will show quantities by venue.</ThemedText>
            </View>
          ) : (
            <View style={styles.matrixLandscapeShell}>
              <View style={styles.matrixCard}>
                <View style={styles.matrixViewport}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.matrixHorizontalContent}>
                    <ScrollView
                      style={styles.matrixVerticalScroll}
                      showsVerticalScrollIndicator={false}
                      nestedScrollEnabled
                    >
                      <View>
                        <View style={styles.matrixHeaderRow}>
                          <View style={[styles.matrixHeaderCell, styles.matrixFirstColumn]}>
                            <ThemedText style={styles.matrixHeaderText}>Part</ThemedText>
                          </View>
                          {sortedVenues.map((venue, venueIndex) => (
                            <View
                              key={venue.id}
                              style={[
                                styles.matrixHeaderCell,
                                venueIndex === sortedVenues.length - 1 && styles.matrixLastHeaderCell,
                              ]}
                            >
                              <ThemedText style={styles.matrixHeaderText} numberOfLines={2}>{venue.name}</ThemedText>
                            </View>
                          ))}
                        </View>

                        {matrixParts.map((part, index) => (
                          <View
                            key={part.id}
                            style={[
                              styles.matrixRow,
                              index % 2 === 1 && styles.matrixRowAlternate,
                              index === matrixParts.length - 1 && styles.matrixLastRow,
                            ]}
                          >
                            <View
                              style={[
                                styles.matrixCell,
                                styles.matrixFirstColumn,
                                index === matrixParts.length - 1 && styles.matrixLastRowFirstCell,
                              ]}
                            >
                              <ThemedText style={[styles.matrixPartText, part.parentPartId && styles.matrixSubPartText]} numberOfLines={2}>
                                {getPartRowLabel(part)}
                              </ThemedText>
                            </View>
                            {sortedVenues.map((venue, venueIndex) => (
                              <View
                                key={`${part.id}-${venue.id}`}
                                style={[
                                  styles.matrixCell,
                                  venueIndex === sortedVenues.length - 1 && styles.matrixLastColumnCell,
                                  index === matrixParts.length - 1 && venueIndex === sortedVenues.length - 1 && styles.matrixLastRowLastCell,
                                ]}
                              >
                                <ThemedText style={styles.matrixValueText}>{venue.partQuantities?.[part.id] ?? 0}</ThemedText>
                              </View>
                            ))}
                          </View>
                        ))}
                      </View>
                    </ScrollView>
                  </ScrollView>
                </View>
              </View>
            </View>
          )}
        </ScrollView>
      )}
      {viewMode === 'cards' && (
        <TouchableOpacity
          style={styles.floatingAddButton}
          onPress={() => {
            console.log('Opening create venue modal');
            setShowCreateVenueModal(true);
          }}
        >
          <Plus color="#FFFFFF" size={28} />
        </TouchableOpacity>
      )}
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
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  sortButton: {
    height: 44,
    width: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
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
  matrixWrapper: {
    flex: 1,
  },
  matrixWrapperContent: {
    paddingHorizontal: 8,
    paddingVertical: 12,
    paddingBottom: 32,
  },
  matrixLandscapeShell: {
    width: '100%',
  },
  matrixViewport: {
    maxHeight: 520,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  matrixVerticalScroll: {
    maxHeight: 520,
  },
  matrixHorizontalContent: {
    minWidth: '100%',
    paddingRight: 24,
  },
  matrixCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  matrixHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#EEF2FF',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  matrixRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  matrixLastRow: {
    borderBottomWidth: 0,
  },
  matrixLastRowFirstCell: {
    borderBottomLeftRadius: 14,
  },
  matrixLastRowLastCell: {
    borderBottomRightRadius: 14,
  },
  matrixRowAlternate: {
    backgroundColor: '#F9FAFB',
  },
  matrixHeaderCell: {
    width: 132,
    minHeight: 56,
    paddingHorizontal: 10,
    paddingVertical: 12,
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#D1D5DB',
  },
  matrixLastHeaderCell: {
    borderRightWidth: 0,
  },
  matrixCell: {
    width: 132,
    minHeight: 52,
    paddingHorizontal: 10,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
  },
  matrixLastColumnCell: {
    borderRightWidth: 0,
  },
  matrixFirstColumn: {
    width: 80,
    alignItems: 'center',
  },
  matrixHeaderText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
  },
  matrixPartText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
  },
  matrixSubPartText: {
    color: '#4B5563',
  },
  matrixValueText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2563EB',
  },
  matrixEmptyState: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  matrixEmptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  matrixEmptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
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
    display: 'none',
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
    display: 'none',
  },
  actionModal: {
    display: 'none',
  },
  actionButton: {
    display: 'none',
  },
  actionButtonText: {
    display: 'none',
  },
  deleteButton: {
    display: 'none',
  },
  deleteButtonText: {
    display: 'none',
  },
  swipeActionsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 0,
  },
  swipeActionButton: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 56,
  },
  swipeCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  swipeEditCircle: {
    backgroundColor: '#2563EB',
  },
  swipeDeleteCircle: {
    backgroundColor: '#EF4444',
  },
});

export default VenueTab;