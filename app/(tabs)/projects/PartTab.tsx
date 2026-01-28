import { PartCard } from '@/components/PartCard';
import { useData } from '@/hooks/useData';
import { DesignerSelector } from '@/components/DesignerSelector';
import { EditPartModal } from '@/components/EditPartModal';
import { PartDetailModal } from '@/components/PartDetailModal';
import { Part, PartType, Comment } from '@/types';
import { usePlatformImagePicker } from '@/hooks/usePlatformImagePicker';
import { Camera, ChevronDown, ChevronRight, X, Check } from 'lucide-react-native';
import React, { useState, useCallback } from 'react';
import LoadingSpinner from '@/components/LoadingSpinner';
import { findSimilarPart } from '@/lib/similarityDetection';
import {
  Alert,
  Dimensions,
  FlatList,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/ThemedText';

const { width: screenWidth } = Dimensions.get('window');
const statusList = ['measured', 'designed', 'tested', 'printed', 'installed'];

const PartTab = ({ projectId }: { projectId: string }) => {
  const {
    loading,
    getPartsByProject,
    getVenuesByProject,
    updatePart,
    deletePart,
    createSubPart,
    createComment,
    getCommentsByPart,
    updateComment,
    toggleCommentCompletion,
    deleteComment,
    getUnfinishedCommentsCountByPart,
    profiles,
    parts: globalParts,
  } = useData();
  const { requestPermissionsAsync, launchImageLibraryAsync } = usePlatformImagePicker();

  const [activeStatus, setActiveStatus] = useState<
    'measured' | 'designed' | 'tested' | 'printed' | 'installed'
  >('measured');
  const [selectedPartComments, setSelectedPartComments] = useState<Comment[]>([]);
  const [selectedPartIds, setSelectedPartIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [showBulkStatusModal, setShowBulkStatusModal] = useState(false);

  const handleCommentSend = (partId: string, commentText: string) => {
    createComment({ partId, author: 'User', text: commentText });
  };

  const handlePartLongPress = (partId: string) => {
    setIsSelectionMode(true);
    const newSelected = new Set(selectedPartIds);
    if (newSelected.has(partId)) {
      newSelected.delete(partId);
    } else {
      newSelected.add(partId);
    }
    setSelectedPartIds(newSelected);
    if (newSelected.size === 0) {
      setIsSelectionMode(false);
    }
  };

  const handlePartPress = (partId: string) => {
    if (isSelectionMode) {
      handlePartLongPress(partId);
    }
  };

  const handleDeleteSelectedParts = () => {
    Alert.alert(
      'Delete Parts',
      `Are you sure you want to delete ${selectedPartIds.size} selected part(s)?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            selectedPartIds.forEach(partId => {
              deletePart(partId);
            });
            setSelectedPartIds(new Set());
            setIsSelectionMode(false);
            Alert.alert('Success', 'Selected parts have been deleted.');
          },
        },
      ]
    );
  };

  const handleBulkStatusChange = (newStatus: string) => {
    selectedPartIds.forEach(partId => {
      const part = projectParts.find(p => p.id === partId);
      if (part) {
        updatePart(partId, { status: newStatus as any });
      }
    });
    setSelectedPartIds(new Set());
    setIsSelectionMode(false);
    setShowBulkStatusModal(false);
    Alert.alert('Success', `${selectedPartIds.size} part(s) status updated to "${newStatus}".`);
  };

  const exitSelectionMode = () => {
    setSelectedPartIds(new Set());
    setIsSelectionMode(false);
  };
  const [showPartActionModal, setShowPartActionModal] = useState(false);
  const [showPartDetailModal, setShowPartDetailModal] = useState(false);
  const [showEditPartModal, setShowEditPartModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showCreateSubPartModal, setShowCreateSubPartModal] = useState(false);
  const [selectedPart, setSelectedPart] = useState<Part | null>(null);
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  const [editingPart, setEditingPart] = useState({
    type: 'U shape' as PartType,
    description: '',
    pictures: [] as string[],
    cadDrawing: '',
    dimensions: {} as any,
    designer: '',
  });
  const [newSubPart, setNewSubPart] = useState({
    type: 'U shape' as PartType,
    description: '',
    pictures: [] as string[],
    cadDrawing: '',
    dimensions: {} as any,
    designer: '',
  });
  const [similarPart, setSimilarPart] = useState<{ part: Part; similarity: number } | null>(null);
  const [usingSimilarPart, setUsingSimilarPart] = useState(false);

  const projectParts = getPartsByProject(projectId);
  const venues = getVenuesByProject(projectId);

  // Check for similar parts in real-time (search across ALL projects using globalParts)
  React.useEffect(() => {
    const similar = findSimilarPart(newSubPart.type, newSubPart.dimensions, globalParts);
    setSimilarPart(similar);
  }, [newSubPart.dimensions, newSubPart.type, globalParts]);

  // Keep selectedPart in sync with global state changes (e.g., after image upload)
  React.useEffect(() => {
    if (selectedPart) {
      const updatedPart = projectParts.find(p => p.id === selectedPart.id);
      if (updatedPart && JSON.stringify(updatedPart) !== JSON.stringify(selectedPart)) {
        setSelectedPart(updatedPart);
      }
    }
  }, [projectParts, selectedPart?.id]);

  const statusCounts = projectParts.reduce((acc, part) => {
    acc[part.status] = (acc[part.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const handlePartAction = (action: string) => {
    if (!selectedPart) {
      console.log('No part selected for action:', action);
      return;
    }
    console.log('Part action:', action, 'for part ID:', selectedPart.id);
    switch (action) {
      case 'view':
        setSelectedPartComments(getCommentsByPart(selectedPart.id));
        setShowPartDetailModal(true);
        break;
      case 'edit':
        setEditingPart({
          type: selectedPart.type,
          description: selectedPart.description,
          pictures: selectedPart.pictures || [],
          cadDrawing: selectedPart.cadDrawing || '',
          dimensions: { ...selectedPart.dimensions },
          designer: selectedPart.designer || '',
        });
        setShowEditPartModal(true);
        break;
      case 'status':
        setShowStatusModal(true);
        break;
      case 'subpart':
        setNewSubPart({
          type: selectedPart.type,
          description: `Sub-part of ${selectedPart.name}`,
          pictures: [],
          cadDrawing: '',
          dimensions: { ...selectedPart.dimensions },
          designer: selectedPart.designer || '',
        });
        setShowCreateSubPartModal(true);
        break;
      case 'delete':
        handleDeletePart();
        break;
    }
    setShowPartActionModal(false);
  };

  const handleEditPart = async () => {
    if (!selectedPart || !editingPart.description.trim()) {
      Alert.alert('Error', 'Please fill in the description');
      return;
    }
    const requiredFields = getRequiredFields(editingPart.type);
    const missingFields = requiredFields.filter(field =>
      !editingPart.dimensions[field] || editingPart.dimensions[field] === ''
    );
    if (missingFields.length > 0) {
      Alert.alert('Error', `Please fill in all required dimensions: ${missingFields.join(', ')}`);
      return;
    }
    console.log('Editing part ID:', selectedPart.id, editingPart);
    const updatedPart = await updatePart(selectedPart.id, {
      type: editingPart.type,
      description: editingPart.description,
      pictures: editingPart.pictures,
      cadDrawing: editingPart.cadDrawing || undefined,
      dimensions: editingPart.dimensions,
      designer: editingPart.designer || undefined,
    });
    setShowEditPartModal(false);
    // Update selected part with the result from updatePart (which has cloud URLs)
    if (updatedPart) {
      setSelectedPart(updatedPart as Part);
    } else {
      setSelectedPart(null);
    }
  };

  const handleDeletePart = () => {
    if (!selectedPart) {
      console.log('No part selected for deletion');
      return;
    }
    console.log('Showing delete part alert for ID:', selectedPart.id);
    Alert.alert(
      'Delete Part',
      `Are you sure you want to delete "${selectedPart.name}"? This will also delete all sub-parts if any.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            console.log('Deleting part ID:', selectedPart.id);
            deletePart(selectedPart.id);
            setShowPartActionModal(false);
            setShowPartDetailModal(false);
            setSelectedPart(null);
          },
        },
      ]
    );
  };

  const handleStatusChange = (newStatus: string) => {
    if (selectedPart) {
      console.log('Changing status for part ID:', selectedPart.id, 'to:', newStatus);
      updatePart(selectedPart.id, { status: newStatus as Part['status'] });
      setShowStatusModal(false);
    }
  };

  const toggleCategory = (category: string) => {
    console.log('Toggling category:', category);
    setCollapsedCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  const getGroupedPartsByStatus = (status: string) => {
    const filteredParts = projectParts.filter((part) => part.status === status);
    return filteredParts.reduce((acc, part) => {
      if (!acc[part.type]) {
        acc[part.type] = [];
      }
      acc[part.type].push(part);
      return acc;
    }, {} as Record<string, Part[]>);
  };

  const handleSelectPictures = async (isEdit = false) => {
    const hasPermission = await requestPermissionsAsync();
    if (!hasPermission) {
      Alert.alert('Permission Denied', 'We need access to your gallery to select pictures.');
      return;
    }

    const result = await launchImageLibraryAsync({
      mediaTypes: 'Images',
      allowsMultipleSelection: true,
      quality: 1,
    });

    if (result) {
      const uris = Array.isArray(result) ? result.map(r => r.uri) : [result.uri];
      console.log('Selected pictures:', uris);
      if (isEdit) {
        setEditingPart((prev: any) => ({ ...prev, pictures: [...(prev.pictures || []), ...uris].slice(0, 6) }));
      } else {
        setNewSubPart((prev) => ({ ...prev, pictures: [...prev.pictures, ...uris].slice(0, 6) }));
      }
    }
  };

  const handleRemovePicture = (uri: string, isEdit = false) => {
    if (isEdit) {
      setEditingPart((prev: any) => ({ ...prev, pictures: prev.pictures.filter((p: string) => p !== uri) }));
    } else {
      setNewSubPart((prev) => ({ ...prev, pictures: prev.pictures.filter((p) => p !== uri) }));
    }
  };

  const handleSelectCADDrawing = async (isEdit = false) => {
    const hasPermission = await requestPermissionsAsync();
    if (!hasPermission) {
      Alert.alert('Permission Denied', 'We need access to your gallery to select CAD drawing.');
      return;
    }
    const result = await launchImageLibraryAsync({
      mediaTypes: 'Images',
      allowsMultipleSelection: false,
      quality: 1,
    });
    if (result) {
      const uri = result.uri;
      console.log('Selected CAD drawing:', uri);
      if (isEdit) {
        setEditingPart(prev => ({ ...prev, cadDrawing: uri }));
      }
    }
  };

  const handleCreateSubPart = () => {
    if (!selectedPart) {
      Alert.alert('Error', 'No parent part selected');
      return;
    }
    if (!newSubPart.description.trim()) {
      Alert.alert('Error', 'Please fill in the description');
      return;
    }

    const requiredFields = getRequiredFields(newSubPart.type);
    const missingFields = requiredFields.filter(field => 
      !newSubPart.dimensions[field] || newSubPart.dimensions[field] === ''
    );

    if (missingFields.length > 0) {
      Alert.alert('Error', `Please fill in all required dimensions: ${missingFields.join(', ')}`);
      return;
    }

    const subPartData = {
      type: newSubPart.type,
      description: newSubPart.description,
      pictures: newSubPart.pictures,
      dimensions: newSubPart.dimensions,
      status: 'measured' as const,
      projectId: selectedPart.projectId,
      designer: newSubPart.designer || undefined,
    };
    console.log('Creating sub-part for parent ID:', selectedPart.id, subPartData);
    createSubPart(selectedPart.id, subPartData);
    setNewSubPart({
      type: 'U shape',
      description: '',
      pictures: [],
      cadDrawing: '',
      dimensions: {},
      designer: '',
    });
    setUsingSimilarPart(false);
    setSimilarPart(null);
    setShowCreateSubPartModal(false);
  };

  const handleUseSimilarPart = () => {
    if (similarPart) {
      setNewSubPart(prev => ({
        ...prev,
        description: similarPart.part.description,
        designer: similarPart.part.designer || '',
        cadDrawing: similarPart.part.cadDrawing || '',
        pictures: similarPart.part.pictures,
        dimensions: { ...similarPart.part.dimensions }
      }));
      setUsingSimilarPart(true);
    }
  };

  const handleGenerateNewPart = () => {
    setUsingSimilarPart(false);
    setSimilarPart(null);
    setNewSubPart({
      type: 'U shape' as PartType,
      description: '',
      pictures: [] as string[],
      cadDrawing: '',
      dimensions: {},
      designer: '',
    });
  };

  const getRequiredFields = (type: PartType): string[] => {
    switch (type) {
      case 'U shape':
        return ['length', 'radius', 'depth', 'oFillet', 'iFillet'];
      case 'Straight':
        return ['length', 'radius'];
      case 'Knob':
        return ['frontRadius', 'middleRadius', 'backRadius', 'depth', 'middleToBackDepth'];
      case 'Button':
        return ['thickness'];
      case 'Push Pad':
        return ['length', 'width', 'radius'];
      default:
        return [];
    }
  };

  const renderDimensionInputs = () => {
    switch (newSubPart.type) {
      case 'U shape':
        return (
          <>
            <DimensionInput label="Length *" field="length" />
            <DimensionInput label="Radius *" field="radius" />
            <DimensionInput label="Depth *" field="depth" />
            <DimensionInput label="O Fillet *" field="oFillet" />
            <DimensionInput label="I Fillet *" field="iFillet" />
          </>
        );
      case 'Straight':
        return (
          <>
            <DimensionInput label="Length *" field="length" />
            <DimensionInput label="Radius *" field="radius" />
          </>
        );
      case 'Knob':
        return (
          <>
            <DimensionInput label="Front Radius *" field="frontRadius" />
            <DimensionInput label="Middle Radius *" field="middleRadius" />
            <DimensionInput label="Back Radius *" field="backRadius" />
            <DimensionInput label="Depth *" field="depth" />
            <DimensionInput label="Middle to Back Depth *" field="middleToBackDepth" />
          </>
        );
      case 'Button':
        return (
          <>
            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Shape *</ThemedText>
              <View style={styles.buttonShapeContainer}>
                {['Circle', 'Rectangular', 'Slot'].map((shape) => (
                  <TouchableOpacity
                    key={shape}
                    style={[
                      styles.shapeButton,
                      newSubPart.dimensions.shape === shape && styles.selectedShapeButton
                    ]}
                    onPress={() => setNewSubPart(prev => ({
                      ...prev,
                      dimensions: { ...prev.dimensions, shape }
                    }))}
                  >
                    <ThemedText style={[
                      styles.shapeButtonText,
                      newSubPart.dimensions.shape === shape && styles.selectedShapeButtonText
                    ]}>
                      {shape}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            {newSubPart.dimensions.shape !== 'Rectangular' && (
              <DimensionInput label="Radius *" field="radius" />
            )}
            {newSubPart.dimensions.shape !== 'Circle' && (
              <>
                <DimensionInput label="Length *" field="length" />
                <DimensionInput label="Width *" field="width" />
                <DimensionInput label="Fillet *" field="fillet" />
              </>
            )}
            <DimensionInput label="Thickness *" field="thickness" />
          </>
        );
      case 'Push Pad':
        return (
          <>
            <DimensionInput label="Length *" field="length" />
            <DimensionInput label="Width *" field="width" />
            <DimensionInput label="Radius *" field="radius" />
          </>
        );
      default:
        return null;
    }
  };

  const DimensionInput = ({ label, field }: { label: string; field: string }) => {
    const handleDimensionChange = useCallback((text: string) => {
      // Allow only numbers and one decimal point
      const validText = text.replace(/[^0-9.]/g, '');
      // Ensure only one decimal place
      const parts = validText.split('.');
      let formattedText = parts[0];
      if (parts.length > 1) {
        formattedText += '.' + parts[1].substring(0, 1);
      }
      setNewSubPart(prev => ({
        ...prev,
        dimensions: { ...prev.dimensions, [field]: formattedText }
      }));
    }, [field]);

    return (
      <View style={styles.inputGroup}>
        <ThemedText style={styles.inputLabel}>{label}</ThemedText>
        <TextInput
          style={styles.input}
          value={newSubPart.dimensions[field] || ''}
          onChangeText={handleDimensionChange}
          placeholder="Enter value"
          placeholderTextColor="#6B728080"
          keyboardType="decimal-pad"
        />
      </View>
    );
  };

  const EditDimensionInput = ({ label, field }: { label: string; field: string }) => {
    const handleDimensionChange = useCallback((text: string) => {
      // Allow only numbers and one decimal point
      const validText = text.replace(/[^0-9.]/g, '');
      // Ensure only one decimal place
      const parts = validText.split('.');
      let formattedText = parts[0];
      if (parts.length > 1) {
        formattedText += '.' + parts[1].substring(0, 1);
      }
      setEditingPart(prev => ({
        ...prev,
        dimensions: { ...prev.dimensions, [field]: formattedText }
      }));
    }, [field]);

    return (
      <View style={styles.inputGroup}>
        <ThemedText style={styles.inputLabel}>{label}</ThemedText>
        <TextInput
          style={styles.input}
          value={editingPart.dimensions[field] || ''}
          onChangeText={handleDimensionChange}
          placeholder="mm"
          placeholderTextColor="#6B728080"
          keyboardType="decimal-pad"
        />
      </View>
    );
  };

  const renderEditDimensionInputs = () => {
    switch (editingPart.type) {
      case 'U shape':
        return (
          <>
            <EditDimensionInput label="Length *" field="length" />
            <EditDimensionInput label="Radius *" field="radius" />
            <EditDimensionInput label="Depth *" field="depth" />
            <EditDimensionInput label="O Fillet *" field="oFillet" />
            <EditDimensionInput label="I Fillet *" field="iFillet" />
          </>
        );
      case 'Straight':
        return (
          <>
            <EditDimensionInput label="Length *" field="length" />
            <EditDimensionInput label="Radius *" field="radius" />
          </>
        );
      case 'Knob':
        return (
          <>
            <EditDimensionInput label="Front Radius *" field="frontRadius" />
            <EditDimensionInput label="Middle Radius *" field="middleRadius" />
            <EditDimensionInput label="Back Radius *" field="backRadius" />
            <EditDimensionInput label="Depth *" field="depth" />
            <EditDimensionInput label="Middle to Back Depth *" field="middleToBackDepth" />
          </>
        );
      case 'Button':
        return (
          <>
            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Shape *</ThemedText>
              <View style={styles.buttonShapeContainer}>
                {['Circle', 'Rectangular', 'Slot'].map((shape) => (
                  <TouchableOpacity
                    key={shape}
                    style={[
                      styles.shapeButton,
                      editingPart.dimensions.shape === shape && styles.selectedShapeButton
                    ]}
                    onPress={() => setEditingPart(prev => ({
                      ...prev,
                      dimensions: { ...prev.dimensions, shape }
                    }))}
                  >
                    <ThemedText style={[
                      styles.shapeButtonText,
                      editingPart.dimensions.shape === shape && styles.selectedShapeButtonText
                    ]}>
                      {shape}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            {editingPart.dimensions.shape !== 'Rectangular' && (
              <EditDimensionInput label="Radius *" field="radius" />
            )}
            {editingPart.dimensions.shape !== 'Circle' && (
              <>
                <EditDimensionInput label="Length *" field="length" />
                <EditDimensionInput label="Width *" field="width" />
                <EditDimensionInput label="Fillet *" field="fillet" />
              </>
            )}
            <EditDimensionInput label="Thickness *" field="thickness" />
          </>
        );
      case 'Push Pad':
        return (
          <>
            <EditDimensionInput label="Length *" field="length" />
            <EditDimensionInput label="Width *" field="width" />
            <EditDimensionInput label="Radius *" field="radius" />
          </>
        );
      default:
        return null;
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
      <View style={styles.statusSummaryCard}>
        <View style={styles.statusSummaryItem}>
          <ThemedText style={styles.statusSummaryLabel}>Measured</ThemedText>
          <ThemedText style={styles.statusSummaryValue}>{statusCounts.measured || 0}</ThemedText>
        </View>
        <View style={styles.statusSummaryItem}>
          <ThemedText style={styles.statusSummaryLabel}>Designed</ThemedText>
          <ThemedText style={styles.statusSummaryValue}>{statusCounts.designed || 0}</ThemedText>
        </View>
        <View style={styles.statusSummaryItem}>
          <ThemedText style={styles.statusSummaryLabel}>Tested</ThemedText>
          <ThemedText style={styles.statusSummaryValue}>{statusCounts.tested || 0}</ThemedText>
        </View>
        <View style={styles.statusSummaryItem}>
          <ThemedText style={styles.statusSummaryLabel}>Printed</ThemedText>
          <ThemedText style={styles.statusSummaryValue}>{statusCounts.printed || 0}</ThemedText>
        </View>
        <View style={styles.statusSummaryItem}>
          <ThemedText style={styles.statusSummaryLabel}>Installed</ThemedText>
          <ThemedText style={styles.statusSummaryValue}>{statusCounts.installed || 0}</ThemedText>
        </View>
      </View>
      <View 
        style={styles.statusTabContainer}
      >
        {statusList.map((status, index) => (
          <TouchableOpacity
            key={status}
            style={[
              styles.statusTab, 
              activeStatus === status && styles.activeStatusTab,
            ]}
            onPress={() => setActiveStatus(status as typeof activeStatus)}
          >
            <View style={styles.statusTabContent}>
              <ThemedText style={[styles.statusTabText, activeStatus === status && styles.activeStatusTabText]}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </ThemedText>
            </View>
          </TouchableOpacity>
        ))}
      </View>
      {isSelectionMode && (
        <View style={styles.bulkActionHeader}>
          <ThemedText style={styles.selectionCountText}>
            {selectedPartIds.size} part{selectedPartIds.size !== 1 ? 's' : ''} selected
          </ThemedText>
          <View style={styles.bulkActionButtons}>
            <TouchableOpacity
              style={styles.bulkActionButton}
              onPress={() => setShowBulkStatusModal(true)}
            >
              <ThemedText style={styles.bulkActionButtonText}>Change To</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.bulkActionButton, styles.deleteActionButton]}
              onPress={handleDeleteSelectedParts}
            >
              <ThemedText style={[styles.bulkActionButtonText, styles.deleteActionButtonText]}>Delete All</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={exitSelectionMode}
            >
              <X color="#78350F" size={20} />
            </TouchableOpacity>
          </View>
        </View>
      )}
      <ScrollView style={styles.partsList} showsVerticalScrollIndicator={false}>
        {Object.entries(getGroupedPartsByStatus(activeStatus)).map(([type, parts]) => (
          <React.Fragment key={type}>
            <View style={styles.partCategory}>
              <TouchableOpacity
                style={styles.categoryHeader}
                onPress={() => toggleCategory(type)}
              >
                {collapsedCategories[type] ? (
                  <ChevronRight color="#6B7280" size={20} />
                ) : (
                  <ChevronDown color="#6B7280" size={20} />
                )}
                <ThemedText style={styles.categoryTitle}>{type} ({parts.length})</ThemedText>
              </TouchableOpacity>
              {!collapsedCategories[type] && (
                <View>
                  {parts.map((part) => {
                    const totalQuantity = venues.reduce((sum, venue) => sum + (venue.partQuantities[part.id] || 0), 0);
                    const hasComments = getUnfinishedCommentsCountByPart(part.id) > 0;
                    return (
                      <PartCard
                        key={part.id}
                        part={part}
                        quantity={totalQuantity}
                        showQuantity={true}
                        hasComments={hasComments}
                        isSelected={selectedPartIds.has(part.id)}
                        onPress={() => {
                          if (isSelectionMode) {
                            handlePartPress(part.id);
                          } else {
                            console.log('Opening part detail modal for ID:', part.id);
                            console.log('Part cadDrawing:', part.cadDrawing);
                            setSelectedPart(part);
                            setSelectedPartComments(getCommentsByPart(part.id));
                            setShowPartDetailModal(true);
                          }
                        }}
                        onLongPress={() => handlePartLongPress(part.id)}
                        onMorePress={() => {
                          if (!isSelectionMode) {
                            console.log('Opening part action modal for ID:', part.id);
                            setSelectedPart(part);
                            setShowPartActionModal(true);
                          }
                        }}
                        onCommentSend={(text) => handleCommentSend(part.id, text)}
                      />
                    );
                  })}
                </View>
              )}
            </View>
          </React.Fragment>
        ))}
      </ScrollView>
      
      {/* Bulk Status Modal */}
      <Modal
        visible={showBulkStatusModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowBulkStatusModal(false)}
      >
        <TouchableOpacity
          style={styles.bulkStatusModalOverlay}
          activeOpacity={1}
          onPress={() => setShowBulkStatusModal(false)}
        >
          <TouchableOpacity
            style={styles.bulkStatusModal}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.bulkStatusModalHeader}>
              <ThemedText style={styles.bulkStatusModalTitle}>Update Status</ThemedText>
              <ThemedText style={styles.bulkStatusModalSubtitle}>
                {selectedPartIds.size} part{selectedPartIds.size !== 1 ? 's' : ''} selected
              </ThemedText>
            </View>
            <View style={styles.bulkStatusOptionsContainer}>
              {statusList.map((status, index) => {
                const statusColors: Record<string, string> = {
                  measured: '#EF4444',
                  designed: '#F59E0B',
                  tested: '#3B82F6',
                  printed: '#F97316',
                  installed: '#10B981',
                };
                return (
                  <TouchableOpacity
                    key={status}
                    style={styles.bulkStatusOption}
                    onPress={() => handleBulkStatusChange(status)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.bulkStatusOptionLeft}>
                      <View style={[styles.bulkStatusDot, { backgroundColor: statusColors[status] }]} />
                      <ThemedText style={styles.bulkStatusOptionText}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </ThemedText>
                    </View>
                    <View style={[styles.bulkStatusProgressBar, { width: `${(index + 1) * 20}%`, backgroundColor: statusColors[status] + '30' }]} />
                  </TouchableOpacity>
                );
              })}
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

  {/* Drag and drop overlays removed */}

      <Modal
        visible={showPartActionModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => {
          console.log('Closing part action modal');
          setShowPartActionModal(false);
          setSelectedPart(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            onPress={() => {
              console.log('Closing part action modal via backdrop');
              setShowPartActionModal(false);
              setSelectedPart(null);
            }}
            activeOpacity={1}
          />
          <View style={styles.actionModal}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handlePartAction('view')}
            >
              <ThemedText style={styles.actionButtonText}>View Details</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handlePartAction('edit')}
            >
              <ThemedText style={styles.actionButtonText}>Edit Part</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handlePartAction('status')}
            >
              <ThemedText style={styles.actionButtonText}>Change Status</ThemedText>
            </TouchableOpacity>
            {selectedPart && !selectedPart.parentPartId && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handlePartAction('subpart')}
              >
                <ThemedText style={styles.actionButtonText}>Create Sub-part</ThemedText>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={() => handlePartAction('delete')}
            >
              <ThemedText style={[styles.actionButtonText, styles.deleteButtonText]}>Delete Part</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <PartDetailModal
        visible={showPartDetailModal}
        selectedPart={selectedPart}
        comments={selectedPartComments}
        onClose={() => {
          console.log('Closing part detail modal');
          setShowPartDetailModal(false);
          setSelectedPart(null);
        }}
        onCommentsChange={(updatedComments) => {
          setSelectedPartComments(updatedComments);
        }}
      />
      <EditPartModal
        visible={showEditPartModal}
        editingPart={editingPart}
        selectedPart={selectedPart}
        profiles={profiles}
        onClose={() => {
          console.log('Closing edit part modal');
          setShowEditPartModal(false);
          setSelectedPart(null);
        }}
        onSave={async (part) => {
          if (!selectedPart) return;
          try {
            await updatePart(selectedPart.id, {
              type: part.type,
              description: part.description,
              pictures: part.pictures,
              cadDrawing: part.cadDrawing || undefined,
              dimensions: part.dimensions,
              designer: part.designer || undefined,
            });
            setShowEditPartModal(false);
            setSelectedPart(null);
          } catch (error) {
            console.error('Error updating part:', error);
            Alert.alert('Error', 'Failed to update part');
          }
        }}
        onEditingPartChange={(updates) => {
          setEditingPart(prev => ({ ...prev, ...updates }));
        }}
      />
      <Modal
        visible={showStatusModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => {
          console.log('Closing status modal');
          setShowStatusModal(false);
          setSelectedPart(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            onPress={() => {
              console.log('Closing status modal via backdrop');
              setShowStatusModal(false);
              setSelectedPart(null);
            }}
            activeOpacity={1}
          />
          <View style={styles.actionModal}>
            <ThemedText style={styles.actionModalTitle}>Change Status</ThemedText>
            {['measured', 'designed', 'tested', 'printed', 'installed'].map((status) => (
              <TouchableOpacity
                key={status}
                style={styles.statusButton}
                onPress={() => handleStatusChange(status)}
              >
                <ThemedText style={styles.actionButtonText}>{status.charAt(0).toUpperCase() + status.slice(1)}</ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
      <Modal
        visible={showCreateSubPartModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <ThemedText style={styles.modalTitle}>Create Sub-part</ThemedText>
            <TouchableOpacity
              onPress={() => {
                console.log('Closing create sub-part modal');
                setShowCreateSubPartModal(false);
                setNewSubPart({ type: 'U shape', description: '', pictures: [], cadDrawing: '', dimensions: {}, designer: '' });
                setUsingSimilarPart(false);
                setSimilarPart(null);
              }}
            >
              <ThemedText style={styles.modalClose}>Cancel</ThemedText>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Part Type *</ThemedText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.typeContainer, usingSimilarPart && styles.disabledTypeContainer]}>
                {[
                  'U shape', 'Straight', 'Knob', 'Button', 'Push Pad',
                  'Cover', 'X - Special Design', 'Gadget'
                ].map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.typeButton,
                      newSubPart.type === type && styles.selectedTypeButton,
                      usingSimilarPart && styles.disabledTypeButton
                    ]}
                    onPress={() => !usingSimilarPart && setNewSubPart(prev => ({
                      ...prev,
                      type: type as PartType,
                      dimensions: {}
                    }))}
                    disabled={usingSimilarPart}
                  >
                    <ThemedText style={[
                      styles.typeButtonText,
                      newSubPart.type === type && styles.selectedTypeButtonText,
                      usingSimilarPart && styles.disabledTypeButtonText
                    ]}>
                      {type}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              {usingSimilarPart && (
                <ThemedText style={styles.lockedIndicator}>🔒 Fixed from existing part</ThemedText>
              )}
            </View>
            {renderDimensionInputs()}
            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Description *</ThemedText>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={newSubPart.description}
                onChangeText={(text) => setNewSubPart(prev => ({ ...prev, description: text }))}
                placeholder="Enter sub-part description"
                placeholderTextColor="#6B728080"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Designer</ThemedText>
              <TextInput
                style={styles.input}
                value={newSubPart.designer}
                onChangeText={(text) => setNewSubPart(prev => ({ ...prev, designer: text }))}
                placeholder="Enter designer name (optional)"
                placeholderTextColor="#6B728080"
              />
            </View>
            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Pictures (1-6)</ThemedText>
              <TouchableOpacity
                style={styles.pictureButton}
                onPress={() => handleSelectPictures(false)}
              >
                <Camera color="#6B7280" size={24} />
                <ThemedText style={styles.pictureButtonText}>Add Pictures</ThemedText>
              </TouchableOpacity>
              <FlatList
                data={newSubPart.pictures}
                keyExtractor={(item) => item}
                horizontal
                style={styles.previewList}
                renderItem={({ item }) => (
                  <View style={styles.previewContainer}>
                    <Image source={{ uri: item }} style={styles.thumbnailPreview} />
                    <TouchableOpacity
                      style={styles.removePreviewButton}
                      onPress={() => handleRemovePicture(item)}
                    >
                      <X color="#FFFFFF" size={16} />
                    </TouchableOpacity>
                  </View>
                )}
              />
            </View>
            {similarPart && !usingSimilarPart && (
              <View style={styles.similarPartContainer}>
                <View style={styles.similarPartMessageBox}>
                  <ThemedText style={styles.similarPartMessage}>
                    This part has {similarPart.similarity.toFixed(1)}% similarity with {similarPart.part.name}
                  </ThemedText>
                </View>
                {projectParts.some(part => part.id === similarPart.part.id) ? (
                  <View>
                    <View style={[styles.useSimilarPartButton, styles.disabledSimilarPartButton]} pointerEvents="none">
                      <ThemedText style={[styles.useSimilarPartButtonText, styles.disabledSimilarPartButtonText]}>
                        Use {similarPart.part.name}
                      </ThemedText>
                    </View>
                    <ThemedText style={styles.sameProjectWarning}>
                      {similarPart.part.name} already exists in this project
                    </ThemedText>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.useSimilarPartButton}
                    onPress={handleUseSimilarPart}
                    activeOpacity={0.7}
                  >
                    <ThemedText style={styles.useSimilarPartButtonText}>Use {similarPart.part.name}</ThemedText>
                  </TouchableOpacity>
                )}
              </View>
            )}
            {usingSimilarPart && (
              <TouchableOpacity
                style={styles.generateNewPartButton}
                onPress={handleGenerateNewPart}
              >
                <ThemedText style={styles.generateNewPartButtonText}>Generate New Part</ThemedText>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.createButton, usingSimilarPart && styles.createPartUsingExistingButton]}
              onPress={handleCreateSubPart}
            >
              <ThemedText style={styles.createButtonText}>
                {usingSimilarPart ? 'Create Existing Part' : 'Create Sub-part'}
              </ThemedText>
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
  statusSummaryCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FBBF24',
    borderRadius: 8,
    margin: 10,
  },
  statusSummaryItem: {
    alignItems: 'center',
  },
  statusSummaryLabel: {
    fontSize: 12,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  statusSummaryValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  statusTabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  statusTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    position: 'relative',
    borderRadius: 8,
    marginHorizontal: 2,
  },
  activeStatusTab: {
    borderBottomColor: '#FBBF24',
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding:2,
  },
  statusTabContent: {
    alignItems: 'center',
    minHeight: 20,
    justifyContent: 'center',
  },
  statusTabText: {
    fontSize: 14,
    color: '#6B7280',
  },
  activeStatusTabText: {
    color: '#FBBF24',
    fontWeight: '600',
  },
  statusIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 4,
  },

  partsList: {
    flex: 1,
    paddingHorizontal: 12,
  },
  partCategory: {
    marginTop: 4,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 2,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 8,
  },
  bulkActionHeader: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#FBBF24',
  },
  selectionCountText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#92400E',
    letterSpacing: 0.3,
  },
  bulkActionButtons: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  bulkActionButton: {
    backgroundColor: '#FBBF24',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
    shadowColor: '#FBBF24',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  bulkActionButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#78350F',
    letterSpacing: 0.2,
  },
  deleteActionButton: {
    backgroundColor: '#EF4444',
    shadowColor: '#EF4444',
  },
  deleteActionButtonText: {
    color: '#FFFFFF',
  },
  closeButton: {
    padding: 8,
    backgroundColor: 'rgba(120, 53, 15, 0.1)',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
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
  statusSelectionLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 16,
  },
  statusOptionsContainer: {
    gap: 8,
  },
  statusOption: {
    borderLeftWidth: 4,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#F9FAFB',
    borderColor: '#E5E7EB',
  },
  statusOptionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  // Modern Bulk Status Modal Styles
  bulkStatusModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bulkStatusModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 0,
    minWidth: 300,
    maxWidth: 340,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
    overflow: 'hidden',
  },
  bulkStatusModalHeader: {
    backgroundColor: '#F8FAFC',
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  bulkStatusModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  bulkStatusModalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  bulkStatusOptionsContainer: {
    padding: 16,
  },
  bulkStatusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    marginBottom: 8,
    backgroundColor: '#F9FAFB',
    position: 'relative',
    overflow: 'hidden',
  },
  bulkStatusOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1,
  },
  bulkStatusDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bulkStatusOptionText: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  bulkStatusProgressBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 14,
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
  createPartUsingExistingButton: {
    backgroundColor: '#DC2626',
  },
  similarPartContainer: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  similarPartMessageBox: {
    marginBottom: 12,
  },
  similarPartMessage: {
    fontSize: 14,
    color: '#7F1D1D',
    fontWeight: '500',
  },
  useSimilarPartButton: {
    backgroundColor: '#EF4444',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  useSimilarPartButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  disabledSimilarPartButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.4)',
  },
  disabledSimilarPartButtonText: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  sameProjectWarning: {
    fontSize: 12,
    color: '#DC2626',
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '500',
  },
  generateNewPartButton: {
    backgroundColor: '#10B981',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  generateNewPartButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  lockedIndicator: {
    fontSize: 12,
    color: '#FCD34D',
    marginTop: 8,
    fontWeight: '600',
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
  actionModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 16,
  },
  statusButton: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
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
  disabledTypeContainer: {
    opacity: 0.6,
  },
  disabledTypeButton: {
    opacity: 0.6,
    backgroundColor: '#E5E7EB',
  },
  disabledTypeButtonText: {
    color: '#9CA3AF',
  },
  buttonShapeContainer: {
    flexDirection: 'row',
  },
  shapeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    marginRight: 8,
  },
  selectedShapeButton: {
    backgroundColor: '#2563EB',
  },
  shapeButtonText: {
    fontSize: 14,
    color: '#6B7280',
  },
  selectedShapeButtonText: {
    color: '#FFFFFF',
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
  previewList: {
    marginTop: 10,
  },
  previewContainer: {
    position: 'relative',
    marginRight: 10,
  },
  thumbnailPreview: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  removePreviewButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentItem: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  commentItemCompleted: {
    opacity: 0.5,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  commentCheckbox: {
    padding: 4,
    marginRight: 8,
  },
  commentText: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    marginRight: 8,
  },
  commentTextCompleted: {
    textDecorationLine: 'line-through',
    color: '#6B7280',
  },
  commentEditInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#2563EB',
    borderRadius: 6,
    padding: 8,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#FFFFFF',
    minHeight: 60,
    textAlignVertical: 'top',
  },
  commentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginLeft: 32,
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
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commentActionButton: {
    padding: 4,
    marginLeft: 12,
  },
  commentDeleteText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '500',
  },
  commentCancelText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  commentSaveText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '500',
  },
});

export default PartTab;