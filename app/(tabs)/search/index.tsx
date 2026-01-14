import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  SafeAreaView,
  FlatList,
  Image,
} from 'react-native';
import { Search, Filter, X, Package, FileText, Info, Ruler, MessageCircle, User, CheckSquare, Square, Image as ImageIcon } from 'lucide-react-native';
import { useData } from '@/hooks/useData';
import { Alert } from 'react-native';
import { PartCard } from '@/components/PartCard';
import { PartType, Part, Project } from '@/types';

export default function SearchScreen() {
  const { getAllPartsWithProjects, getCommentsByPart, updateCommentStatus, deleteComment, getPendingCommentsCountByPart } = useData();
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [searchFilters, setSearchFilters] = useState({
    type: '' as PartType | '',
    dimensions: {} as Record<string, string>,
  });
  const [filteredParts, setFilteredParts] = useState<Array<Part & { project?: Project }>>([]);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [showPartDetailModal, setShowPartDetailModal] = useState(false);
  const [selectedPart, setSelectedPart] = useState<Part | null>(null);

  const allPartsWithProjects = getAllPartsWithProjects();

  // Group parts by type and get latest 10 with CAD drawings for each type
  const getPartsByType = () => {
    const partTypes: PartType[] = ['U shape', 'Straight', 'Knob', 'Button', 'Push Pad', 'Cover', 'X - Special Design', 'Custom'];

    return partTypes.map(type => {
      const partsOfType = allPartsWithProjects
        .filter(part => part.type === type && part.cadDrawing)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 10);

      return {
        type,
        parts: partsOfType,
      };
    }).filter(group => group.parts.length > 0);
  };

  const handleSearch = () => {
    if (!searchFilters.type) {
      return;
    }

    const filtered = allPartsWithProjects.filter(part => {
      // Filter by type
      if (part.type !== searchFilters.type) return false;

      // Filter by dimensions
      const dimensionKeys = Object.keys(searchFilters.dimensions);
      if (dimensionKeys.length === 0) return true;

      return dimensionKeys.every(key => {
        const filterValue = searchFilters.dimensions[key];
        if (!filterValue) return true;

        const partValue = part.dimensions[key];
        if (partValue === undefined) return false;

        return parseFloat(partValue.toString()) === parseFloat(filterValue);
      });
    });

    setFilteredParts(filtered);
    setIsSearchActive(true);
    setShowFilterModal(false);
  };

  const clearSearch = () => {
    setIsSearchActive(false);
    setFilteredParts([]);
    setSearchFilters({ type: '', dimensions: {} });
  };

  const getRequiredDimensionFields = (type: PartType): string[] => {
    switch (type) {
      case 'U shape':
        return ['length', 'radius', 'depth', 'oFillet', 'iFillet'];
      case 'Straight':
        return ['length', 'radius'];
      case 'Knob':
        return ['frontRadius', 'middleRadius', 'backRadius', 'depth', 'middleToBackDepth'];
      case 'Button':
        return ['thickness', 'shape'];
      case 'Push Pad':
        return ['length', 'width', 'radius'];
      default:
        return [];
    }
  };

  const renderDimensionInputs = () => {
    if (!searchFilters.type) return null;

    const fields = getRequiredDimensionFields(searchFilters.type);
    
    const handleDimensionChange = useCallback((fieldName: string, text: string) => {
      if (fieldName === 'shape') {
        setSearchFilters(prev => ({
          ...prev,
          dimensions: { ...prev.dimensions, [fieldName]: text }
        }));
      } else {
        // Allow only numbers and one decimal point
        const validText = text.replace(/[^0-9.]/g, '');
        // Ensure only one decimal place
        const parts = validText.split('.');
        let formattedText = parts[0];
        if (parts.length > 1) {
          formattedText += '.' + parts[1].substring(0, 1);
        }
        setSearchFilters(prev => ({
          ...prev,
          dimensions: { ...prev.dimensions, [fieldName]: formattedText }
        }));
      }
    }, []);
    
    return fields.map(field => (
      <View key={field} style={styles.inputGroup}>
        <Text style={styles.inputLabel}>{field.charAt(0).toUpperCase() + field.slice(1)}</Text>
        <TextInput
          style={styles.input}
          value={searchFilters.dimensions[field] || ''}
          onChangeText={(text) => handleDimensionChange(field, text)}
          placeholder="Enter value (optional)"
          placeholderTextColor="#6B728080"
          keyboardType={field === 'shape' ? 'default' : 'decimal-pad'}
        />
      </View>
    ));
  };

  const renderCADGallery = () => {
    const partGroups = getPartsByType();

    return (
      <ScrollView style={styles.galleryContainer} showsVerticalScrollIndicator={false}>
        {partGroups.map(group => (
          <View key={group.type} style={styles.typeSection}>
            <Text style={styles.typeSectionTitle}>{group.type}</Text>
            <FlatList
              data={group.parts}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.cadImageContainer}>
                  {item.cadDrawing ? (
                    <Image source={{ uri: item.cadDrawing }} style={styles.cadImage} />
                  ) : (
                    <View style={styles.placeholderCAD}>
                      <Package color="#6B7280" size={32} />
                    </View>
                  )}
                  <Text style={styles.cadImageLabel}>
                    {item.project ? `${item.name} - ${item.project.name}` : item.name}
                  </Text>
                </TouchableOpacity>
              )}
              contentContainerStyle={styles.horizontalList}
            />
          </View>
        ))}
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Search Parts</Text>
      </View>

      <View style={styles.searchContainer}>
        <TouchableOpacity 
          style={styles.searchBar}
          onPress={() => setShowFilterModal(true)}
        >
          <Search color="#6B7280" size={20} />
          <Text style={styles.searchPlaceholder}>
            {isSearchActive ? `Searching ${searchFilters.type}` : 'Search parts by type and dimensions...'}
          </Text>
          <Filter color="#6B7280" size={20} />
        </TouchableOpacity>
        
        {isSearchActive && (
          <TouchableOpacity style={styles.clearButton} onPress={clearSearch}>
            <X color="#6B7280" size={20} />
          </TouchableOpacity>
        )}
      </View>

      {isSearchActive ? (
        <View style={styles.searchResults}>
          <Text style={styles.resultsTitle}>Search Results ({filteredParts.length})</Text>
          <FlatList
            data={filteredParts}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <PartCard
                part={item}
                project={item.project}
                showCommentButton={false}
                onPress={() => {
                  setSelectedPart(item);
                  setShowPartDetailModal(true);
                }}
              />
            )}
            showsVerticalScrollIndicator={false}
          />
        </View>
      ) : (
        renderCADGallery()
      )}

      <Modal
        visible={showFilterModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filter Parts</Text>
            <TouchableOpacity onPress={() => setShowFilterModal(false)}>
              <Text style={styles.modalClose}>Cancel</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Part Type *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeContainer}>
                {[
                  'U shape', 'Straight', 'Knob', 'Button', 'Push Pad', 
                  'Cover', 'X - Special Design', 'Gadget'
                ].map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.typeButton,
                      searchFilters.type === type && styles.selectedTypeButton
                    ]}
                    onPress={() => setSearchFilters(prev => ({ 
                      ...prev, 
                      type: type as PartType,
                      dimensions: {} 
                    }))}
                  >
                    <Text style={[
                      styles.typeButtonText,
                      searchFilters.type === type && styles.selectedTypeButtonText
                    ]}>
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {renderDimensionInputs()}

            <TouchableOpacity 
              style={[styles.searchButton, !searchFilters.type && styles.searchButtonDisabled]}
              onPress={handleSearch}
              disabled={!searchFilters.type}
            >
              <Text style={styles.searchButtonText}>Search Parts</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <Modal
        visible={showPartDetailModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Part Details</Text>
            <TouchableOpacity onPress={() => {
              setShowPartDetailModal(false);
              setSelectedPart(null);
            }}>
              <Text style={styles.modalClose}>Close</Text>
            </TouchableOpacity>
          </View>
          {selectedPart && (
            <ScrollView style={styles.modalContent}>
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <ImageIcon color="#6B7280" size={20} />
                  <Text style={styles.sectionTitle}>Pictures</Text>
                </View>
                {selectedPart.pictures?.length ? (
                  <FlatList
                    data={selectedPart.pictures}
                    keyExtractor={(item) => item}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    renderItem={({ item }) => (
                      <TouchableOpacity onPress={() => { }}>
                        <Image source={{ uri: item }} style={styles.imagePreview} />
                      </TouchableOpacity>
                    )}
                  />
                ) : (
                  <Text style={styles.noContentText}>No pictures added</Text>
                )}
              </View>

              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <FileText color="#6B7280" size={20} />
                  <Text style={styles.sectionTitle}>CAD Drawing</Text>
                </View>
                {selectedPart.cadDrawing ? (
                  <TouchableOpacity onPress={() => { }}>
                    <Image source={{ uri: selectedPart.cadDrawing }} style={styles.imagePreview} />
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.noContentText}>No CAD drawing added</Text>
                )}
              </View>

              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Info color="#6B7280" size={20} />
                  <Text style={styles.sectionTitle}>Basic Info</Text>
                </View>
                <View style={styles.fieldRow}>
                  <Package color="#6B7280" size={18} />
                  <Text style={styles.fieldLabel}>Name:</Text>
                  <Text style={styles.fieldValue}>{selectedPart.name}</Text>
                </View>
                <View style={styles.fieldRow}>
                  <FileText color="#6B7280" size={18} />
                  <Text style={styles.fieldLabel}>Type:</Text>
                  <Text style={styles.fieldValue}>{selectedPart.type}</Text>
                </View>
                <View style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>Status:</Text>
                  <View style={[styles.statusBadge, { backgroundColor: {
                    measured: '#EF4444',
                    designed: '#F59E0B',
                    tested: '#3B82F6',
                    printed: '#F97316',
                    installed: '#10B981',
                  }[selectedPart.status] || '#6B7280' }]}>
                    <Text style={styles.statusText}>
                      {selectedPart.status ? selectedPart.status.charAt(0).toUpperCase() + selectedPart.status.slice(1) : 'Unknown'}
                    </Text>
                  </View>
                </View>
                <View style={styles.fieldRow}>
                  <User color="#6B7280" size={18} />
                  <Text style={styles.fieldLabel}>Designer:</Text>
                  <Text style={styles.fieldValue}>{selectedPart.designer || 'Not assigned'}</Text>
                </View>
                <View style={styles.descriptionSection}>
                  <Text style={styles.fieldLabel}>Description:</Text>
                  <Text style={styles.descriptionValue}>{selectedPart.description || 'No description available'}</Text>
                </View>
              </View>

              {Object.keys(selectedPart.dimensions).length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Ruler color="#6B7280" size={20} />
                    <Text style={styles.sectionTitle}>Dimensions</Text>
                  </View>
                  <FlatList
                    data={Object.entries(selectedPart.dimensions)}
                    keyExtractor={([key]) => key}
                    renderItem={({ item: [key, value] }) => (
                      <View style={styles.dimensionRow}>
                        <Text style={styles.dimensionKey}>{key.charAt(0).toUpperCase() + key.slice(1)}:</Text>
                        <Text style={styles.dimensionValue}>{String(value)}</Text>
                      </View>
                    )}
                    scrollEnabled={false}
                  />
                </View>
              )}

              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <MessageCircle color="#6B7280" size={20} />
                  <Text style={styles.sectionTitle}>Comments</Text>
                </View>
                {(() => {
                  const comments = getCommentsByPart(selectedPart.id);
                  if (comments.length === 0) {
                    return <Text style={styles.noContentText}>No comments yet</Text>;
                  }
                  return comments.map((comment) => (
                    <View key={comment.id} style={styles.commentItem}>
                      <View style={styles.commentHeader}>
                        <Text style={styles.commentText}>{comment.text}</Text>
                        <TouchableOpacity
                          style={styles.commentStatusButton}
                          onPress={() => {
                            const newStatus = !comment.isPending;
                            updateCommentStatus(comment.id, newStatus);
                          }}
                        >
                          {!comment.isPending ? (
                            <CheckSquare color="#10B981" size={20} />
                          ) : (
                            <Square color="#6B7280" size={20} />
                          )}
                        </TouchableOpacity>
                      </View>
                      <View style={styles.commentFooter}>
                        <View style={styles.commentMetadata}>
                          <Text style={styles.commentDate}>
                            {comment.createdAt.toLocaleDateString()} {comment.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </Text>
                          {comment.venueName && (
                            <>
                              <Text style={styles.commentSeparator}>•</Text>
                              <Text style={styles.commentVenue}>{comment.venueName}</Text>
                            </>
                          )}
                        </View>
                        <TouchableOpacity
                          onPress={() => {
                            Alert.alert(
                              'Delete Comment',
                              'Are you sure you want to delete this comment?',
                              [
                                { text: 'Cancel', style: 'cancel' },
                                {
                                  text: 'Delete',
                                  style: 'destructive',
                                  onPress: () => deleteComment(comment.id)
                                }
                              ]
                            );
                          }}
                        >
                          <Text style={styles.commentDeleteText}>Delete</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ));
                })()}
              </View>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

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
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchPlaceholder: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#6B7280',
  },
  clearButton: {
    marginLeft: 8,
    padding: 8,
  },
  galleryContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  typeSection: {
    marginVertical: 16,
  },
  typeSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  horizontalList: {
    paddingRight: 16,
  },
  cadImageContainer: {
    marginRight: 12,
    alignItems: 'center',
  },
  cadImage: {
    width: 120,
    height: 120,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  placeholderCAD: {
    width: 120,
    height: 120,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cadImageLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'center',
    maxWidth: 120,
  },
  searchResults: {
    flex: 1,
    paddingHorizontal: 16,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginVertical: 16,
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
  typeContainer: {
    flexDirection: 'row',
  },
  typeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    marginRight: 8,
  },
  selectedTypeButton: {
    backgroundColor: '#2563EB',
  },
  typeButtonText: {
    fontSize: 14,
    color: '#6B7280',
  },
  selectedTypeButtonText: {
    color: '#FFFFFF',
  },
  searchButton: {
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  searchButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  searchButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 8,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 8,
    marginRight: 4,
  },
  fieldValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    flex: 1,
  },
  descriptionSection: {
    marginTop: 8,
  },
  descriptionValue: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  imagePreview: {
    width: 200,
    height: 120,
    borderRadius: 8,
    marginRight: 12,
  },
  noContentText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  dimensionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dimensionKey: {
    fontSize: 14,
    color: '#6B7280',
    textTransform: 'capitalize',
  },
  dimensionValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },
  commentItem: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  commentText: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    marginRight: 8,
  },
  commentStatusButton: {
    padding: 4,
  },
  commentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  commentMetadata: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  commentDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  commentSeparator: {
    fontSize: 12,
    color: '#D1D5DB',
    marginHorizontal: 6,
  },
  commentVenue: {
    fontSize: 12,
    color: '#2563EB',
    fontWeight: '500',
  },
  commentDeleteText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '500',
  },
});