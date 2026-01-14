import { PartCard } from '@/components/PartCard';
import { useData } from '@/hooks/useData';
import { Part, PartType } from '@/types';
import * as ImagePicker from 'expo-image-picker';
import { Camera, CheckSquare, ChevronDown, ChevronRight, Edit2, FileText, Image as ImageIcon, Info, MessageCircle, Package, Ruler, Square, User, X } from 'lucide-react-native';
import React, { useState, useCallback } from 'react';
import LoadingSpinner from '@/components/LoadingSpinner';
import {
  Alert,
  Dimensions,
  FlatList,
  Image,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

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
  } = useData();

  const [activeStatus, setActiveStatus] = useState<
    'measured' | 'designed' | 'tested' | 'printed' | 'installed'
  >('measured');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');

  const handleCommentSend = (partId: string, commentText: string) => {
    createComment({ partId, author: 'User', text: commentText });
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
    dimensions: {} as any,
    designer: '',
  });

  const projectParts = getPartsByProject(projectId);
  const venues = getVenuesByProject(projectId);

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

  const handleEditPart = () => {
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
    updatePart(selectedPart.id, {
      type: editingPart.type,
      description: editingPart.description,
      pictures: editingPart.pictures,
      cadDrawing: editingPart.cadDrawing || undefined,
      dimensions: editingPart.dimensions,
      designer: editingPart.designer || undefined,
    });
    setShowEditPartModal(false);
    setSelectedPart(null);
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
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'We need access to your gallery to select pictures.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: 6,
      quality: 1,
    });

    if (!result.canceled) {
      const uris = result.assets.map(asset => asset.uri);
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
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'We need access to your gallery to select CAD drawing.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: false,
      quality: 1,
    });
    if (!result.canceled) {
      const uri = result.assets[0].uri;
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
      dimensions: {},
      designer: '',
    });
    setShowCreateSubPartModal(false);
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
              <Text style={styles.inputLabel}>Shape *</Text>
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
                    <Text style={[
                      styles.shapeButtonText,
                      newSubPart.dimensions.shape === shape && styles.selectedShapeButtonText
                    ]}>
                      {shape}
                    </Text>
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
        <Text style={styles.inputLabel}>{label}</Text>
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
        <Text style={styles.inputLabel}>{label}</Text>
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
              <Text style={styles.inputLabel}>Shape *</Text>
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
                    <Text style={[
                      styles.shapeButtonText,
                      editingPart.dimensions.shape === shape && styles.selectedShapeButtonText
                    ]}>
                      {shape}
                    </Text>
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
          <Text style={styles.statusSummaryLabel}>Measured</Text>
          <Text style={styles.statusSummaryValue}>{statusCounts.measured || 0}</Text>
        </View>
        <View style={styles.statusSummaryItem}>
          <Text style={styles.statusSummaryLabel}>Designed</Text>
          <Text style={styles.statusSummaryValue}>{statusCounts.designed || 0}</Text>
        </View>
        <View style={styles.statusSummaryItem}>
          <Text style={styles.statusSummaryLabel}>Tested</Text>
          <Text style={styles.statusSummaryValue}>{statusCounts.tested || 0}</Text>
        </View>
        <View style={styles.statusSummaryItem}>
          <Text style={styles.statusSummaryLabel}>Printed</Text>
          <Text style={styles.statusSummaryValue}>{statusCounts.printed || 0}</Text>
        </View>
        <View style={styles.statusSummaryItem}>
          <Text style={styles.statusSummaryLabel}>Installed</Text>
          <Text style={styles.statusSummaryValue}>{statusCounts.installed || 0}</Text>
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
              <Text style={[styles.statusTabText, activeStatus === status && styles.activeStatusTabText]}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
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
                <Text style={styles.categoryTitle}>{type} ({parts.length})</Text>
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
                        onPress={() => {
                          console.log('Opening part detail modal for ID:', part.id);
                          setSelectedPart(part);
                          setShowPartDetailModal(true);
                        }}
                        onMorePress={() => {
                          console.log('Opening part action modal for ID:', part.id);
                          setSelectedPart(part);
                          setShowPartActionModal(true);

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
              <Text style={styles.actionButtonText}>View Details</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handlePartAction('edit')}
            >
              <Text style={styles.actionButtonText}>Edit Part</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handlePartAction('status')}
            >
              <Text style={styles.actionButtonText}>Change Status</Text>
            </TouchableOpacity>
            {selectedPart && !selectedPart.parentPartId && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handlePartAction('subpart')}
              >
                <Text style={styles.actionButtonText}>Create Sub-part</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={() => handlePartAction('delete')}
            >
              <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Delete Part</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <Modal
        visible={showPartDetailModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Part Details</Text>
            <TouchableOpacity
              onPress={() => {
                console.log('Closing part detail modal');
                setShowPartDetailModal(false);
                setSelectedPart(null);
              }}
            >
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
                      <TouchableOpacity onPress={() => { /* Optional: Open full-screen image modal */ }}>
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
                  <TouchableOpacity onPress={() => { /* Optional: Open full-screen image modal */ }}>
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
                  console.log('Comments in Part Detail:', comments.length, 'comments');
                  if (comments.length === 0) {
                    return <Text style={styles.noContentText}>No comments yet</Text>;
                  }
                  return comments.map((comment) => (
                    <View key={comment.id} style={[
                      styles.commentItem,
                      comment.isCompleted && styles.commentItemCompleted
                    ]}>
                      <View style={styles.commentHeader}>
                        <TouchableOpacity
                          style={styles.commentCheckbox}
                          onPress={() => toggleCommentCompletion(comment.id)}
                        >
                          {comment.isCompleted ? (
                            <CheckSquare color="#10B981" size={24} />
                          ) : (
                            <Square color="#6B7280" size={24} />
                          )}
                        </TouchableOpacity>
                        {editingCommentId === comment.id ? (
                          <TextInput
                            style={styles.commentEditInput}
                            value={editingCommentText}
                            onChangeText={setEditingCommentText}
                            multiline
                            autoFocus
                          />
                        ) : (
                          <Text style={[
                            styles.commentText,
                            comment.isCompleted && styles.commentTextCompleted
                          ]}>
                            {comment.text}
                          </Text>
                        )}
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
                        <View style={styles.commentActions}>
                          {editingCommentId === comment.id ? (
                            <>
                              <TouchableOpacity
                                style={styles.commentActionButton}
                                onPress={() => {
                                  setEditingCommentId(null);
                                  setEditingCommentText('');
                                }}
                              >
                                <Text style={styles.commentCancelText}>Cancel</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={styles.commentActionButton}
                                onPress={async () => {
                                  if (editingCommentText.trim()) {
                                    await updateComment(comment.id, { text: editingCommentText.trim() });
                                    setEditingCommentId(null);
                                    setEditingCommentText('');
                                  }
                                }}
                              >
                                <Text style={styles.commentSaveText}>Save</Text>
                              </TouchableOpacity>
                            </>
                          ) : (
                            <>
                              <TouchableOpacity
                                style={styles.commentActionButton}
                                onPress={() => {
                                  setEditingCommentId(comment.id);
                                  setEditingCommentText(comment.text);
                                }}
                              >
                                <Edit2 color="#2563EB" size={16} />
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={styles.commentActionButton}
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
                            </>
                          )}
                        </View>
                      </View>
                    </View>
                  ));
                })()}
              </View>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
      <Modal
        visible={showEditPartModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Edit Part</Text>
            <TouchableOpacity
              onPress={() => {
                console.log('Closing edit part modal');
                setShowEditPartModal(false);
                setSelectedPart(null);
              }}
            >
              <Text style={styles.modalClose}>Cancel</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent}>
            {renderEditDimensionInputs()}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Description *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={editingPart.description}
                onChangeText={(text) => setEditingPart((prev) => ({ ...prev, description: text }))}
                placeholder="Enter part description"
                placeholderTextColor="#6B728080"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Designer</Text>
              <TextInput
                style={styles.input}
                value={editingPart.designer}
                onChangeText={(text) => setEditingPart((prev) => ({ ...prev, designer: text }))}
                placeholder="Enter designer name (optional)"
                placeholderTextColor="#6B728080"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>CAD Drawing (Optional)</Text>
              <TouchableOpacity
                style={styles.pictureButton}
                onPress={() => handleSelectCADDrawing(true)}
              >
                <Camera color="#6B7280" size={24} />
                <Text style={styles.pictureButtonText}>Change CAD Drawing</Text>
              </TouchableOpacity>
              {editingPart.cadDrawing && (
                <View style={styles.previewContainer}>
                  <Image source={{ uri: editingPart.cadDrawing }} style={styles.thumbnailPreview} />
                  <TouchableOpacity
                    style={styles.removePreviewButton}
                    onPress={() => setEditingPart(prev => ({ ...prev, cadDrawing: '' }))}
                  >
                    <X color="#FFFFFF" size={16} />
                  </TouchableOpacity>
                </View>
              )}
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Pictures (1-6)</Text>
              <TouchableOpacity
                style={styles.pictureButton}
                onPress={() => handleSelectPictures(true)}
              >
                <Camera color="#6B7280" size={24} />
                <Text style={styles.pictureButtonText}>Add Pictures</Text>
              </TouchableOpacity>
              <FlatList
                data={editingPart.pictures}
                keyExtractor={(item) => item}
                horizontal
                style={styles.previewList}
                renderItem={({ item }) => (
                  <View style={styles.previewContainer}>
                    <Image source={{ uri: item }} style={styles.thumbnailPreview} />
                    <TouchableOpacity
                      style={styles.removePreviewButton}
                      onPress={() => handleRemovePicture(item, true)}
                    >
                      <X color="#FFFFFF" size={16} />
                    </TouchableOpacity>
                  </View>
                )}
              />
            </View>
            <TouchableOpacity
              style={styles.createButton}
              onPress={handleEditPart}
            >
              <Text style={styles.createButtonText}>Save Changes</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
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
            <Text style={styles.actionModalTitle}>Change Status</Text>
            {['measured', 'designed', 'tested', 'printed', 'installed'].map((status) => (
              <TouchableOpacity
                key={status}
                style={styles.statusButton}
                onPress={() => handleStatusChange(status)}
              >
                <Text style={styles.actionButtonText}>{status.charAt(0).toUpperCase() + status.slice(1)}</Text>
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
            <Text style={styles.modalTitle}>Create Sub-part</Text>
            <TouchableOpacity
              onPress={() => {
                console.log('Closing create sub-part modal');
                setShowCreateSubPartModal(false);
                setNewSubPart({ type: 'U shape', description: '', pictures: [], dimensions: {}, designer: '' });
              }}
            >
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
                      newSubPart.type === type && styles.selectedTypeButton
                    ]}
                    onPress={() => setNewSubPart(prev => ({
                      ...prev,
                      type: type as PartType,
                      dimensions: {}
                    }))}
                  >
                    <Text style={[
                      styles.typeButtonText,
                      newSubPart.type === type && styles.selectedTypeButtonText
                    ]}>
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            {renderDimensionInputs()}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Description *</Text>
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
              <Text style={styles.inputLabel}>Designer</Text>
              <TextInput
                style={styles.input}
                value={newSubPart.designer}
                onChangeText={(text) => setNewSubPart(prev => ({ ...prev, designer: text }))}
                placeholder="Enter designer name (optional)"
                placeholderTextColor="#6B728080"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Pictures (1-6)</Text>
              <TouchableOpacity
                style={styles.pictureButton}
                onPress={() => handleSelectPictures(false)}
              >
                <Camera color="#6B7280" size={24} />
                <Text style={styles.pictureButtonText}>Add Pictures</Text>
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
            <TouchableOpacity
              style={styles.createButton}
              onPress={handleCreateSubPart}
            >
              <Text style={styles.createButtonText}>Create Sub-part</Text>
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
    showsHorizontalScrollIndicator: false,
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