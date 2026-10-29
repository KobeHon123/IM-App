import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  FlatList,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, Filter, X, Package } from 'lucide-react-native';
import { useData } from '@/hooks/useData';
import { Alert } from 'react-native';
import { PartCard } from '@/components/PartCard';
import { PartDetailModal } from '@/components/PartDetailModal';
import { PartType, Part, Project, Comment } from '@/types';
import { ThemedText } from '@/components/ThemedText';
import { useColors } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { Lock } from 'lucide-react-native';
import type { ThemeColors } from '@/constants/Colors';

function SearchContent() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const { getAllPartsWithProjects, getCommentsByPart, deleteComment, getPendingCommentsCountByPart, parts: globalParts } = useData();
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [searchFilters, setSearchFilters] = useState({
    type: '' as PartType | '',
    dimensions: {} as Record<string, string>,
  });
  const [filteredParts, setFilteredParts] = useState<Array<Part & { project?: Project }>>([]);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [showPartDetailModal, setShowPartDetailModal] = useState(false);
  const [selectedPart, setSelectedPart] = useState<Part | null>(null);
  const [selectedPartComments, setSelectedPartComments] = useState<Comment[]>([]);

  const allPartsWithProjects = getAllPartsWithProjects();

  // Helper function to create a unique key for a part based on type and dimensions
  const getPartUniqueKey = (part: Part) => {
    const dimensionStr = JSON.stringify(part.dimensions, Object.keys(part.dimensions).sort());
    return `${part.type}_${dimensionStr}`;
  };

  // Helper function to get all project names that contain a part with same type and dimensions
  const getProjectNamesForPart = (part: Part) => {
    const key = getPartUniqueKey(part);
    const matchingParts = allPartsWithProjects.filter(p => getPartUniqueKey(p) === key);
    const projectNames = matchingParts
      .map(p => p.project?.name)
      .filter((name): name is string => !!name);
    // Remove duplicates
    return [...new Set(projectNames)];
  };

  // Helper function to deduplicate parts - keep the one with CAD drawing if available, or the newest
  const deduplicateParts = (parts: Array<Part & { project?: Project }>) => {
    const uniquePartsMap = new Map<string, Part & { project?: Project }>();
    
    parts.forEach(part => {
      const key = getPartUniqueKey(part);
      const existing = uniquePartsMap.get(key);
      
      if (!existing) {
        uniquePartsMap.set(key, part);
      } else {
        // Prefer part with CAD drawing, then prefer newer part
        if (part.cadDrawing && !existing.cadDrawing) {
          uniquePartsMap.set(key, part);
        } else if (part.cadDrawing === existing.cadDrawing) {
          // Both have or don't have CAD, keep newer one
          if (new Date(part.createdAt).getTime() > new Date(existing.createdAt).getTime()) {
            uniquePartsMap.set(key, part);
          }
        }
      }
    });
    
    return Array.from(uniquePartsMap.values());
  };

  // Group parts by type and get latest 10 with CAD drawings for each type (deduplicated)
  const getPartsByType = () => {
    const partTypes: PartType[] = ['U shape', 'Straight', 'Knob', 'Button', 'Push Pad', 'Cover', 'X - Special Design', 'Gadget'];

    return partTypes.map(type => {
      const partsOfType = allPartsWithProjects
        .filter(part => part.type === type && part.cadDrawing);
      
      // Deduplicate parts with same dimensions
      const uniqueParts = deduplicateParts(partsOfType)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 10);

      return {
        type,
        parts: uniqueParts,
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

        const partValue = (part.dimensions as Record<string, any>)[key];
        if (partValue === undefined) return false;

        return parseFloat(partValue.toString()) === parseFloat(filterValue);
      });
    });

    // Deduplicate search results
    const uniqueFiltered = deduplicateParts(filtered);
    
    setFilteredParts(uniqueFiltered);
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
        return ['thickness', 'shape', 'buttonType'];
      case 'Push Pad':
        return ['length', 'width', 'radius'];
      default:
        return [];
    }
  };

  const handleDimensionChange = useCallback((fieldName: string, text: string) => {
    if (fieldName === 'shape' || fieldName === 'buttonType') {
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

  const renderDimensionInputs = () => {
    if (!searchFilters.type) return null;

    const fields = getRequiredDimensionFields(searchFilters.type);
    
    return fields.map(field => {
      if (field === 'shape') {
        return (
          <View key={field} style={styles.inputGroup}>
            <ThemedText style={styles.inputLabel}>Shape</ThemedText>
            <View style={styles.typeContainer}>
              {['Circle', 'Rectangular', 'Slot'].map((shape) => (
                <TouchableOpacity
                  key={shape}
                  style={[
                    styles.typeButton,
                    searchFilters.dimensions.shape === shape && styles.selectedTypeButton
                  ]}
                  onPress={() => handleDimensionChange('shape', searchFilters.dimensions.shape === shape ? '' : shape)}
                >
                  <ThemedText style={[
                    styles.typeButtonText,
                    searchFilters.dimensions.shape === shape && styles.selectedTypeButtonText
                  ]}>
                    {shape}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );
      } else if (field === 'buttonType') {
        return (
          <View key={field} style={styles.inputGroup}>
            <ThemedText style={styles.inputLabel}>Button Type</ThemedText>
            <View style={styles.typeContainer}>
              {['Lift', 'Toilet', 'Switch'].map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.typeButton,
                    searchFilters.dimensions.buttonType === type && styles.selectedTypeButton
                  ]}
                  onPress={() => handleDimensionChange('buttonType', searchFilters.dimensions.buttonType === type ? '' : type)}
                >
                  <ThemedText style={[
                    styles.typeButtonText,
                    searchFilters.dimensions.buttonType === type && styles.selectedTypeButtonText
                  ]}>
                    {type}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );
      } else {
        return (
          <View key={field} style={styles.inputGroup}>
            <ThemedText style={styles.inputLabel}>{field.charAt(0).toUpperCase() + field.slice(1)}</ThemedText>
            <TextInput
              style={styles.input}
              value={searchFilters.dimensions[field] || ''}
              onChangeText={(text) => handleDimensionChange(field, text)}
              placeholder="Enter value (optional)"
              placeholderTextColor="#6B728080"
              keyboardType="decimal-pad"
            />
          </View>
        );
      }
    });
  };

  const renderCADGallery = () => {
    const partGroups = getPartsByType();

    return (
      <ScrollView style={styles.galleryContainer} showsVerticalScrollIndicator={false}>
        {partGroups.map(group => (
          <View key={group.type} style={styles.typeSection}>
            <ThemedText style={styles.typeSectionTitle}>{group.type}</ThemedText>
            <FlatList
              data={group.parts}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={styles.cadImageContainer}
                  onPress={() => {
                    setSelectedPart(item);
                    setSelectedPartComments(getCommentsByPart(item.id));
                    setShowPartDetailModal(true);
                  }}
                >
                  {item.cadDrawing ? (
                    <Image key={item.cadDrawing} source={{ uri: item.cadDrawing }} style={styles.cadImage} />
                  ) : (
                    <View style={styles.placeholderCAD}>
                      <Package color={colors.textSecondary} size={32} />
                    </View>
                  )}
                  <ThemedText style={styles.cadImageLabel}>
                    {item.name}
                  </ThemedText>
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
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <ThemedText style={styles.title}>Gallery</ThemedText>
      </View>

      <View style={styles.searchContainer}>
        <TouchableOpacity 
          style={styles.searchBar}
          onPress={() => setShowFilterModal(true)}
        >
          <Search color={colors.textSecondary} size={20} />
          <ThemedText style={styles.searchPlaceholder}>
            {isSearchActive ? `Searching ${searchFilters.type}` : 'Search parts by type and dimensions...'}
          </ThemedText>
          <Filter color={colors.textSecondary} size={20} />
        </TouchableOpacity>
        
        {isSearchActive && (
          <TouchableOpacity style={styles.clearButton} onPress={clearSearch}>
            <X color={colors.textSecondary} size={20} />
          </TouchableOpacity>
        )}
      </View>

      {isSearchActive ? (
        <View style={styles.searchResults}>
          <ThemedText style={styles.resultsTitle}>Search Results ({filteredParts.length})</ThemedText>
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
                  setSelectedPartComments(getCommentsByPart(item.id));
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
            <ThemedText style={styles.modalTitle}>Filter Parts</ThemedText>
            <TouchableOpacity onPress={() => setShowFilterModal(false)}>
              <ThemedText style={styles.modalClose}>Cancel</ThemedText>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Part Type *</ThemedText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeContainer}>
                {[
                  'U shape', 'Straight', 'Knob', 'Button', 'Push Pad', 
                  'Cover', 'X - Special Design', 'Gadget'
                ].map((type) => {
                  const displayType = type === 'U shape' ? 'U/Curved shape' : type === 'X - Special Design' ? 'X - Special Handle' : type === 'Push Pad' ? 'Push Plate' : type;
                  return (
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
                    <ThemedText style={[
                      styles.typeButtonText,
                      searchFilters.type === type && styles.selectedTypeButtonText
                    ]}>
                      {displayType}
                    </ThemedText>
                  </TouchableOpacity>
                );
                })}
              </ScrollView>
            </View>

            {renderDimensionInputs()}

            <TouchableOpacity 
              style={[styles.searchButton, !searchFilters.type && styles.searchButtonDisabled]}
              onPress={handleSearch}
              disabled={!searchFilters.type}
            >
              <ThemedText style={styles.searchButtonText}>Search Parts</ThemedText>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <PartDetailModal
        visible={showPartDetailModal}
        selectedPart={selectedPart}
        comments={selectedPartComments}
        projectNames={selectedPart ? getProjectNamesForPart(selectedPart) : []}
        globalParts={globalParts}
        onClose={() => {
          setShowPartDetailModal(false);
          setSelectedPart(null);
        }}
        onCommentsChange={(updatedComments) => {
          setSelectedPartComments(updatedComments);
        }}
      />
    </SafeAreaView>
  );
}

export default function SearchScreen() {
  const colors = useColors();
  const { role } = useAuth();

  if (role === 'fuhong_worker') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
        <Lock color={colors.textMuted} size={48} />
        <ThemedText style={{ marginTop: 16, fontSize: 18, fontWeight: '600', color: colors.text }}>Gallery is not available</ThemedText>
        <ThemedText style={{ marginTop: 8, fontSize: 14, color: colors.textSecondary, textAlign: 'center' }}>
          Your role does not have access to the gallery.
        </ThemedText>
      </SafeAreaView>
    );
  }

  return <SearchContent />;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surface,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchPlaceholder: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: colors.textSecondary,
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
    color: colors.text,
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
    backgroundColor: colors.surfaceMuted,
  },
  placeholderCAD: {
    width: 120,
    height: 120,
    backgroundColor: colors.surfaceMuted,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cadImageLabel: {
    fontSize: 12,
    color: colors.textSecondary,
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
    color: colors.text,
    marginVertical: 16,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  modalClose: {
    fontSize: 16,
    color: colors.textSecondary,
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
    color: colors.textStrong,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  typeContainer: {
    flexDirection: 'row',
  },
  typeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.surfaceMuted,
    borderRadius: 8,
    marginRight: 8,
  },
  selectedTypeButton: {
    backgroundColor: colors.primary,
  },
  typeButtonText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  selectedTypeButtonText: {
    color: '#FFFFFF',
  },
  searchButton: {
    backgroundColor: colors.primary,
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
    backgroundColor: colors.surface,
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
    borderBottomColor: colors.border,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginLeft: 8,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 8,
    marginRight: 4,
  },
  fieldValue: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    flex: 1,
  },
  descriptionSection: {
    marginTop: 8,
  },
  descriptionValue: {
    fontSize: 14,
    color: colors.textSecondary,
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
    color: colors.textMuted,
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
    borderBottomColor: colors.borderSubtle,
  },
  dimensionKey: {
    fontSize: 14,
    color: colors.textSecondary,
    textTransform: 'capitalize',
  },
  dimensionValue: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  commentItem: {
    backgroundColor: colors.background,
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
    color: colors.text,
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
    color: colors.textMuted,
  },
  commentSeparator: {
    fontSize: 12,
    color: colors.textDisabled,
    marginHorizontal: 6,
  },
  commentVenue: {
    fontSize: 12,
    color: colors.primaryText,
    fontWeight: '500',
  },
  commentDeleteText: {
    fontSize: 12,
    color: colors.danger,
    fontWeight: '500',
  },
});
