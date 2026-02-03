import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  Alert,
  FlatList,
  Image,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Camera, ChevronDown, ChevronRight, ChevronRightIcon, FileText, Hash, Image as ImageIcon, Plus, Tag, X } from 'lucide-react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { usePlatformHaptics } from '@/hooks/usePlatformHaptics';
import { getVenue, getPartsByProject, createPart, createSubPart, deletePart, findDuplicatePart, getVenuePartQuantity, updateVenuePartQuantity, checkPartNumberExists, createComment, getCommentsByPart, toggleCommentCompletion, getCurrentPartNumber, getUsedPartNumbers } from '@/lib/supabaseHelpers';
import { supabase } from '@/lib/supabase';
import { useData } from '@/hooks/useData';
import { PartCard } from '@/components/PartCard';
import { DesignerSelector } from '@/components/DesignerSelector';
import { EditPartModal } from '@/components/EditPartModal';
import { PartDetailModal } from '@/components/PartDetailModal';
import { Part, PartType, Comment } from '@/types';
import { calculateDimensionSimilarity, findSimilarPart } from '@/lib/similarityDetection';
import { ThemedText } from '@/components/ThemedText';
export default function VenueDetailScreen() {
  const { id } = useLocalSearchParams();
  const { updatePart, parts: globalParts, profiles } = useData();
  const { impactAsync, notificationAsync } = usePlatformHaptics();
  const [venue, setVenue] = useState<any>(null);
  const [project, setProject] = useState<any>(null);
  const [projectParts, setProjectParts] = useState<Part[]>([]);
  const [partQuantities, setPartQuantities] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVenueData();
  }, [id]);

  // Sync with global parts state when it changes
  useEffect(() => {
    if (venue && globalParts.length > 0) {
      const venueParts = globalParts.filter(p => p.projectId === venue.projectId);
      setProjectParts(venueParts);
    }
  }, [globalParts, venue?.projectId]);

  const loadVenueData = async () => {
    try {
      setLoading(true);
      const venueData = await getVenue(id as string);
      if (venueData) {
        setVenue(venueData);
        setPartQuantities(venueData.partQuantities || {});

        const { data: projectData } = await supabase
          .from('projects')
          .select('*')
          .eq('id', venueData.projectId)
          .single();

        if (projectData) {
          setProject({
            id: projectData.id,
            name: projectData.name,
            description: projectData.description,
            pic: projectData.pic,
            thumbnail: projectData.thumbnail_url,
            createdAt: new Date(projectData.created_at),
          });
        }

        const parts = await getPartsByProject(venueData.projectId);
        setProjectParts(parts);

        const commentsMap: Record<string, Comment[]> = {};
        for (const part of parts) {
          const comments = await getCommentsByPart(part.id);
          commentsMap[part.id] = comments;
        }
        setAllComments(commentsMap);
      }
    } catch (error) {
      console.error('Error loading venue data:', error);
    } finally {
      setLoading(false);
    }
  };
  const [countingMode, setCountingMode] = useState(false);
  const [statusMode, setStatusMode] = useState(false);
  const [showCreatePartModal, setShowCreatePartModal] = useState(false);
  const [showPartActionModal, setShowPartActionModal] = useState(false);
  const [showPartDetailModal, setShowPartDetailModal] = useState(false);
  const [showEditPartModal, setShowEditPartModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedPart, setSelectedPart] = useState<Part | null>(null);
  const [selectedPartComments, setSelectedPartComments] = useState<Comment[]>([]);
  const [allComments, setAllComments] = useState<Record<string, Comment[]>>({});
  const [editingPart, setEditingPart] = useState({
    type: 'U shape' as PartType,
    description: '',
    pictures: [] as string[],
    cadDrawing: '',
    dimensions: {} as any,
    designer: '',
  });
  const [newPart, setNewPart] = useState({
    type: 'U shape' as PartType,
    description: '',
    pictures: [] as string[],
    cadDrawing: '',
    dimensions: {} as any,
    designer: '',
  });
  const [nextPartNumber, setNextPartNumber] = useState<number>(0);
  const [manualPartNumber, setManualPartNumber] = useState<number | null>(null);
  const [showPartNumberPicker, setShowPartNumberPicker] = useState(false);
  const [usedPartNumbers, setUsedPartNumbers] = useState<number[]>([]);
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  const [similarPart, setSimilarPart] = useState<{ part: Part; similarity: number } | null>(null);
  const [usingSimilarPart, setUsingSimilarPart] = useState(false);
  const [showFullImageModal, setShowFullImageModal] = useState(false);
  const [fullImageUri, setFullImageUri] = useState<string>('');

  // Check for similar parts in real-time (search in current project only)
  useEffect(() => {
    console.log('=== Similarity Detection ===');
    console.log('newPart.type:', newPart.type);
    console.log('newPart.dimensions:', JSON.stringify(newPart.dimensions));
    console.log('projectParts count:', projectParts.length);
    const similar = findSimilarPart(newPart.type, newPart.dimensions, projectParts);
    console.log('Similar part found:', similar ? `${similar.part.name} (${similar.similarity}%)` : 'None');
    setSimilarPart(similar);
  }, [newPart.dimensions, newPart.type, projectParts]);

  // Keep selectedPart in sync with global state changes (e.g., after image upload)
  useEffect(() => {
    if (selectedPart) {
      const updatedPart = projectParts.find(p => p.id === selectedPart.id);
      if (updatedPart && JSON.stringify(updatedPart) !== JSON.stringify(selectedPart)) {
        setSelectedPart(updatedPart);
      }
    }
  }, [projectParts, selectedPart?.id]);

  // Use existing similar part data
  const handleUseSimilarPart = () => {
    if (similarPart) {
      setNewPart(prev => ({
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
    setNewPart({
      type: 'U shape' as PartType,
      description: '',
      pictures: [] as string[],
      cadDrawing: '',
      dimensions: {},
      designer: '',
    });
  };

  useEffect(() => {
    if (!selectedPart && showPartDetailModal) {
      setShowPartDetailModal(false);
    }
    if (selectedPart && showPartDetailModal) {
      loadPartComments(selectedPart.id);
    }
  }, [selectedPart, showPartDetailModal]);

  useEffect(() => {
    if (showCreatePartModal) {
      loadNextPartNumber();
      setManualPartNumber(null); // Reset manual selection when modal opens
    }
  }, [showCreatePartModal, newPart.type]);

  const loadNextPartNumber = async () => {
    try {
      // Load used part numbers for the picker
      const usedNumbers = await getUsedPartNumbers(newPart.type);
      setUsedPartNumbers(usedNumbers);
      // Calculate next part number as the largest used number + 1
      const maxUsedNumber = usedNumbers.length > 0 ? Math.max(...usedNumbers) : 0;
      setNextPartNumber(maxUsedNumber + 1);
    } catch (error) {
      console.error('Error loading next part number:', error);
      setNextPartNumber(0);
      setUsedPartNumbers([]);
    }
  };

  const handleSelectPartNumber = (num: number) => {
    setManualPartNumber(num);
    setShowPartNumberPicker(false);
  };

  const loadPartComments = async (partId: string) => {
    try {
      const comments = await getCommentsByPart(partId);
      setSelectedPartComments(comments);
      setAllComments(prev => ({ ...prev, [partId]: comments }));
    } catch (error) {
      console.error('Error loading comments:', error);
      setSelectedPartComments([]);
    }
  };

  const hasUnfinishedComments = (partId: string): boolean => {
    const comments = allComments[partId] || [];
    return comments.some(comment => !comment.isCompleted);
  };

  // Define all hooks and callbacks BEFORE any conditional returns
  const handleDimensionChange = useCallback((fieldName: string, text: string) => {
    // Allow only numbers and one decimal point
    const validText = text.replace(/[^0-9.]/g, '');
    // Ensure only one decimal place
    const parts = validText.split('.');
    let formattedText = parts[0];
    if (parts.length > 1) {
      formattedText += '.' + parts[1].substring(0, 1);
    }
    setNewPart(prev => ({
      ...prev,
      dimensions: { ...prev.dimensions, [fieldName]: formattedText }
    }));
  }, []);

  const handleEditDimensionChange = useCallback((fieldName: string, text: string) => {
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
      dimensions: { ...prev.dimensions, [fieldName]: formattedText }
    }));
  }, []);

  if (!venue || !project) {
    return (
      <SafeAreaView style={styles.container}>
        <ThemedText>Venue not found</ThemedText>
      </SafeAreaView>
    );
  }
  const groupedParts = projectParts.reduce((acc, part) => {
    if (!acc[part.type]) {
      acc[part.type] = [];
    }
  
    if (!part.parentPartId) {
      acc[part.type].push(part);
    }
  
    return acc;
  }, {} as Record<string, Part[]>);
  const getSubParts = (parentPartId: string): Part[] => {
    return projectParts.filter(part => part.parentPartId === parentPartId);
  };
  const handleQuantityChange = async (partId: string, delta: number) => {
    await impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const currentQuantity = partQuantities[partId] || 0;
      const newQuantity = Math.max(0, currentQuantity + delta);
      await updateVenuePartQuantity(venue.id, partId, newQuantity);
      setPartQuantities(prev => ({ ...prev, [partId]: newQuantity }));
    } catch (error) {
      console.error('Error updating quantity:', error);
    }
  };

  const handleStatusChange = async (partId: string, newStatus: string) => {
    try {
      await updatePart(partId, { status: newStatus as any });
      await loadVenueData();
      await notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleCountingModeToggle = () => {
    if (!countingMode) {
      setStatusMode(false);
    }
    setCountingMode(!countingMode);
  };

  const handleStatusModeToggle = () => {
    if (!statusMode) {
      setCountingMode(false);
    }
    setStatusMode(!statusMode);
  };

  const handleCommentSend = async (partId: string, commentText: string) => {
    try {
      await createComment({
        partId,
        author: 'User', // TODO: Replace with actual user name from auth
        text: commentText,
        isPending: true,
        isCompleted: false,
        venueId: venue.id,
        venueName: venue.name,
      });

      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      // Reload comments if viewing part details
      if (selectedPart && selectedPart.id === partId && showPartDetailModal) {
        await loadPartComments(partId);
      }
    } catch (error) {
      console.error('Error creating comment:', error);
      Alert.alert('Error', 'Failed to send comment');
    }
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
        setNewPart((prev: any) => ({ ...prev, pictures: [...prev.pictures, ...uris].slice(0, 6) }));
      }
    }
  };
  const handleRemovePicture = (uri: string, isEdit = false) => {
    if (isEdit) {
      setEditingPart((prev: any) => ({ ...prev, pictures: prev.pictures.filter((p: string) => p !== uri) }));
    } else {
      setNewPart((prev: any) => ({ ...prev, pictures: prev.pictures.filter((p: string) => p !== uri) }));
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
      } else {
        setNewPart(prev => ({ ...prev, cadDrawing: uri }));
      }
    }
  };
  const getPartNumberPrefix = (type: PartType, dimensions?: Record<string, any>): string => {
    if (type === 'Gadget' && dimensions?.gadgetType === 'Toilet Cap Lifter') {
      return 'TL';
    }
    if (type === 'Push Pad') {
      return 'P';
    }
    return {'U shape': 'U', 'Straight': 'S', 'Knob': 'K', 'Button': 'B', 'Push Pad': 'P', 'Cover': 'C', 'X - Special Design': 'X', 'Gadget': 'G'}[type];
  };

  const isToiletCapLifter = (type: PartType, dimensions?: Record<string, any>): boolean => {
    return type === 'Gadget' && dimensions?.gadgetType === 'Toilet Cap Lifter';
  };

  const isToiletCapLifterExists = (): boolean => {
    return isToiletCapLifter(newPart.type, newPart.dimensions) && projectParts.some(part => part.name === 'TL');
  };

  const handleCreatePart = async () => {
    if (!newPart.description.trim()) {
      Alert.alert('Error', 'Please fill in the description');
      return;
    }
    const requiredFields = getRequiredFields(newPart.type);
    const missingFields = requiredFields.filter(field =>
      !newPart.dimensions[field] || newPart.dimensions[field] === ''
    );
    if (missingFields.length > 0) {
      Alert.alert('Error', `Please fill in all required dimensions: ${missingFields.join(', ')}`);
      return;
    }
    
    // Generate manual part name if user selected a number
    let manualPartName: string | undefined;
    if (isToiletCapLifter(newPart.type, newPart.dimensions)) {
      // For Toilet Cap Lifter, always use "TL" without a number
      manualPartName = 'TL';
    } else if (newPart.type === 'Push Pad') {
      // For Push Pad, use the selected option directly
      if (manualPartNumber === 1) {
        manualPartName = 'P1';
      } else if (manualPartNumber === 2) {
        manualPartName = 'P2';
      } else if (manualPartNumber === 3) {
        manualPartName = 'P3';
      }
    } else if (manualPartNumber && !usingSimilarPart) {
      const prefix = getPartNumberPrefix(newPart.type, newPart.dimensions);
      manualPartName = `${prefix}${manualPartNumber}`;
    }
    
    const partToCreate = {
      type: newPart.type,
      description: newPart.description,
      pictures: newPart.pictures,
      cadDrawing: newPart.cadDrawing || undefined,
      dimensions: newPart.dimensions,
      status: 'measured' as const,
      projectId: project.id,
      designer: newPart.designer || undefined,
      // Use existing part name if in existing part mode, or manual part name if selected
      existingPartName: usingSimilarPart && similarPart ? similarPart.part.name : manualPartName,
    };
    createNewPart(partToCreate);
  };
  const createNewPart = async (partData: any) => {
    try {
      await createPart(partData);
      setNewPart({
        type: 'U shape',
        description: '',
        pictures: [],
        cadDrawing: '',
        dimensions: {},
        designer: '',
      });
      setUsingSimilarPart(false);
      setSimilarPart(null);
      setManualPartNumber(null);
      setShowCreatePartModal(false);
      await loadVenueData();
    } catch (error) {
      console.error('Error creating part:', error);
      if (error instanceof Error) {
        Alert.alert('Error', error.message);
      } else {
        Alert.alert('Error', 'Failed to create part');
      }
    }
  };
  const handleCreateSubPart = async () => {
    if (!selectedPart) return;
    try {
      const subPartData = {
        type: selectedPart.type,
        description: `Sub-part of ${selectedPart.name}`,
        pictures: [],
        dimensions: selectedPart.dimensions,
        status: 'measured' as const,
        projectId: selectedPart.projectId,
        designer: selectedPart.designer || undefined,
      };
      await createSubPart(selectedPart.id, subPartData);
      setShowPartActionModal(false);
      await loadVenueData();
    } catch (error) {
      console.error('Error creating sub-part:', error);
      Alert.alert('Error', 'Failed to create sub-part');
    }
  };
  const handlePartAction = (action: string) => {
    if (!selectedPart) return;
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
        handleCreateSubPart();
        break;
      case 'delete':
        handleDeletePart();
        break;
    }
    setShowPartActionModal(false);
  };
  const handleModelStatusChange = async (newStatus: string) => {
    if (selectedPart) {
      try {
        await updatePart(selectedPart.id, { status: newStatus as Part['status'] });
        setShowStatusModal(false);
        // The global state is updated by useData().updatePart() and will sync via useEffect
      } catch (error) {
        console.error('Error updating status:', error);
      }
    }
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
    try {
      await updatePart(selectedPart.id, {
        type: editingPart.type,
        description: editingPart.description,
        pictures: editingPart.pictures,
        cadDrawing: editingPart.cadDrawing || undefined,
        dimensions: editingPart.dimensions,
        designer: editingPart.designer || undefined,
      });
      setShowEditPartModal(false);
      setSelectedPart(null);
      // The global state is updated by useData().updatePart() and will sync via useEffect
    } catch (error) {
      console.error('Error updating part:', error);
      Alert.alert('Error', 'Failed to update part');
    }
  };
  const handleDeletePart = () => {
    if (!selectedPart) return;
    Alert.alert(
      'Delete Part',
      `Are you sure you want to delete "${selectedPart.name}"? This will also delete all sub-parts if any.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('Deleting part ID:', selectedPart.id);
              await deletePart(selectedPart.id);
              setShowPartActionModal(false);
              setShowPartDetailModal(false);
              setShowEditPartModal(false);
              setShowStatusModal(false);
              setSelectedPart(null);
              await loadVenueData();
            } catch (error) {
              console.error('Error deleting part:', error);
              Alert.alert('Error', 'Failed to delete part');
            }
          }
        }
      ]
    );
  };
  const getRequiredFields = (type: PartType): string[] => {
    switch (type) {
      case 'U shape':
        return ['length', 'radius', 'depth', 'oFillet', 'iFillet'];
      case 'Straight':
        return ['length'];
      case 'Knob':
        return ['middleRadius', 'depth', 'middleToBackDepth'];
      case 'Button':
        return ['buttonType'];
      case 'Push Pad':
        return [];
      default:
        return [];
    }
  };

  const renderDimensionInputs = () => {
    switch (newPart.type) {
      case 'U shape':
        return (
          <>
            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Length *</ThemedText>
              <TextInput
                style={[styles.input, usingSimilarPart && styles.disabledInput]}
                value={newPart.dimensions['length'] || ''}
                onChangeText={(text) => !usingSimilarPart && handleDimensionChange('length', text)}
                placeholder="mm"
                placeholderTextColor="#6B728080"
                keyboardType="decimal-pad"
                editable={!usingSimilarPart}
              />
              {usingSimilarPart && <ThemedText style={styles.lockedIndicator}>🔒 Fixed from existing part</ThemedText>}
            </View>
            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Radius *</ThemedText>
              <TextInput
                style={[styles.input, usingSimilarPart && styles.disabledInput]}
                value={newPart.dimensions['radius'] || ''}
                onChangeText={(text) => !usingSimilarPart && handleDimensionChange('radius', text)}
                placeholder="mm"
                placeholderTextColor="#6B728080"
                keyboardType="decimal-pad"
                editable={!usingSimilarPart}
              />
              {usingSimilarPart && <ThemedText style={styles.lockedIndicator}>🔒 Fixed from existing part</ThemedText>}
            </View>
            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Depth *</ThemedText>
              <TextInput
                style={[styles.input, usingSimilarPart && styles.disabledInput]}
                value={newPart.dimensions['depth'] || ''}
                onChangeText={(text) => !usingSimilarPart && handleDimensionChange('depth', text)}
                placeholder="mm"
                placeholderTextColor="#6B728080"
                keyboardType="decimal-pad"
                editable={!usingSimilarPart}
              />
              {usingSimilarPart && <ThemedText style={styles.lockedIndicator}>🔒 Fixed from existing part</ThemedText>}
            </View>
            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>O Fillet *</ThemedText>
              <TextInput
                style={[styles.input, usingSimilarPart && styles.disabledInput]}
                value={newPart.dimensions['oFillet'] || ''}
                onChangeText={(text) => !usingSimilarPart && handleDimensionChange('oFillet', text)}
                placeholder="mm"
                placeholderTextColor="#6B728080"
                keyboardType="decimal-pad"
                editable={!usingSimilarPart}
              />
              {usingSimilarPart && <ThemedText style={styles.lockedIndicator}>🔒 Fixed from existing part</ThemedText>}
            </View>
            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>I Fillet *</ThemedText>
              <TextInput
                style={[styles.input, usingSimilarPart && styles.disabledInput]}
                value={newPart.dimensions['iFillet'] || ''}
                onChangeText={(text) => !usingSimilarPart && handleDimensionChange('iFillet', text)}
                placeholder="mm"
                placeholderTextColor="#6B728080"
                keyboardType="decimal-pad"
                editable={!usingSimilarPart}
              />
              {usingSimilarPart && <ThemedText style={styles.lockedIndicator}>🔒 Fixed from existing part</ThemedText>}
            </View>
          </>
        );
      case 'Straight':
        return (
          <>
            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Length *</ThemedText>
              <TextInput
                style={[styles.input, usingSimilarPart && styles.disabledInput]}
                value={newPart.dimensions['length'] || ''}
                onChangeText={(text) => !usingSimilarPart && handleDimensionChange('length', text)}
                placeholder="mm"
                placeholderTextColor="#6B728080"
                keyboardType="decimal-pad"
                editable={!usingSimilarPart}
              />
              {usingSimilarPart && <ThemedText style={styles.lockedIndicator}>🔒 Fixed from existing part</ThemedText>}
            </View>
            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Radius</ThemedText>
              <TextInput
                style={[styles.input, usingSimilarPart && styles.disabledInput]}
                value={newPart.dimensions['radius'] || ''}
                onChangeText={(text) => !usingSimilarPart && handleDimensionChange('radius', text)}
                placeholder="mm"
                placeholderTextColor="#6B728080"
                keyboardType="decimal-pad"
                editable={!usingSimilarPart}
              />
              {usingSimilarPart && <ThemedText style={styles.lockedIndicator}>🔒 Fixed from existing part</ThemedText>}
            </View>
          </>
        );
      case 'Knob':
        return (
          <>
            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Front Radius</ThemedText>
              <TextInput
                style={[styles.input, usingSimilarPart && styles.disabledInput]}
                value={newPart.dimensions['frontRadius'] || ''}
                onChangeText={(text) => !usingSimilarPart && handleDimensionChange('frontRadius', text)}
                placeholder="mm"
                placeholderTextColor="#6B728080"
                keyboardType="decimal-pad"
                editable={!usingSimilarPart}
              />
              {usingSimilarPart && <ThemedText style={styles.lockedIndicator}>🔒 Fixed from existing part</ThemedText>}
            </View>
            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Middle/Largest Radius *</ThemedText>
              <TextInput
                style={[styles.input, usingSimilarPart && styles.disabledInput]}
                value={newPart.dimensions['middleRadius'] || ''}
                onChangeText={(text) => !usingSimilarPart && handleDimensionChange('middleRadius', text)}
                placeholder="mm"
                placeholderTextColor="#6B728080"
                keyboardType="decimal-pad"
                editable={!usingSimilarPart}
              />
              {usingSimilarPart && <ThemedText style={styles.lockedIndicator}>🔒 Fixed from existing part</ThemedText>}
            </View>
            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Back Radius</ThemedText>
              <TextInput
                style={[styles.input, usingSimilarPart && styles.disabledInput]}
                value={newPart.dimensions['backRadius'] || ''}
                onChangeText={(text) => !usingSimilarPart && handleDimensionChange('backRadius', text)}
                placeholder="mm"
                placeholderTextColor="#6B728080"
                keyboardType="decimal-pad"
                editable={!usingSimilarPart}
              />
              {usingSimilarPart && <ThemedText style={styles.lockedIndicator}>🔒 Fixed from existing part</ThemedText>}
            </View>
            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Depth *</ThemedText>
              <TextInput
                style={[styles.input, usingSimilarPart && styles.disabledInput]}
                value={newPart.dimensions['depth'] || ''}
                onChangeText={(text) => !usingSimilarPart && handleDimensionChange('depth', text)}
                placeholder="mm"
                placeholderTextColor="#6B728080"
                keyboardType="decimal-pad"
                editable={!usingSimilarPart}
              />
              {usingSimilarPart && <ThemedText style={styles.lockedIndicator}>🔒 Fixed from existing part</ThemedText>}
            </View>
            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Middle to Back Depth *</ThemedText>
              <TextInput
                style={[styles.input, usingSimilarPart && styles.disabledInput]}
                value={newPart.dimensions['middleToBackDepth'] || ''}
                onChangeText={(text) => !usingSimilarPart && handleDimensionChange('middleToBackDepth', text)}
                placeholder="mm"
                placeholderTextColor="#6B728080"
                keyboardType="decimal-pad"
                editable={!usingSimilarPart}
              />
              {usingSimilarPart && <ThemedText style={styles.lockedIndicator}>🔒 Fixed from existing part</ThemedText>}
            </View>
          </>
        );
      case 'Button':
        return (
          <>
            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Button Type *</ThemedText>
              <View style={styles.buttonShapeContainer}>
                {['Lift', 'Toilet', 'Switch'].map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.shapeButton,
                      newPart.dimensions.buttonType === type && styles.selectedShapeButton,
                      usingSimilarPart && styles.disabledShapeButton
                    ]}
                    onPress={() => !usingSimilarPart && setNewPart(prev => ({
                      ...prev,
                      dimensions: { ...prev.dimensions, buttonType: prev.dimensions.buttonType === type ? undefined : type }
                    }))}
                    disabled={usingSimilarPart}
                  >
                    <ThemedText style={[
                      styles.shapeButtonText,
                      newPart.dimensions.buttonType === type && styles.selectedShapeButtonText
                    ]}>
                      {type}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
              {usingSimilarPart && <ThemedText style={styles.lockedIndicator}>Fixed from existing part</ThemedText>}
            </View>
            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Shape</ThemedText>
              <View style={styles.buttonShapeContainer}>
                {['Circle', 'Rectangular', 'Slot'].map((shape) => (
                  <TouchableOpacity
                    key={shape}
                    style={[
                      styles.shapeButton,
                      newPart.dimensions.shape === shape && styles.selectedShapeButton,
                      usingSimilarPart && styles.disabledShapeButton
                    ]}
                    onPress={() => !usingSimilarPart && setNewPart(prev => ({
                      ...prev,
                      dimensions: { ...prev.dimensions, shape: prev.dimensions.shape === shape ? undefined : shape }
                    }))}
                    disabled={usingSimilarPart}
                  >
                    <ThemedText style={[
                      styles.shapeButtonText,
                      newPart.dimensions.shape === shape && styles.selectedShapeButtonText
                    ]}>
                      {shape}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
              {usingSimilarPart && <ThemedText style={styles.lockedIndicator}>🔒 Fixed from existing part</ThemedText>}
            </View>
            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Radius</ThemedText>
              <TextInput
                style={[styles.input, usingSimilarPart && styles.disabledInput]}
                value={newPart.dimensions['radius'] || ''}
                onChangeText={(text) => !usingSimilarPart && handleDimensionChange('radius', text)}
                placeholder="mm"
                placeholderTextColor="#6B728080"
                keyboardType="decimal-pad"
                editable={!usingSimilarPart}
              />
              {usingSimilarPart && <ThemedText style={styles.lockedIndicator}>🔒 Fixed from existing part</ThemedText>}
            </View>
            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Length</ThemedText>
              <TextInput
                style={[styles.input, usingSimilarPart && styles.disabledInput]}
                value={newPart.dimensions['length'] || ''}
                onChangeText={(text) => !usingSimilarPart && handleDimensionChange('length', text)}
                placeholder="mm"
                placeholderTextColor="#6B728080"
                keyboardType="decimal-pad"
                editable={!usingSimilarPart}
              />
              {usingSimilarPart && <ThemedText style={styles.lockedIndicator}>🔒 Fixed from existing part</ThemedText>}
            </View>
            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Width</ThemedText>
              <TextInput
                style={[styles.input, usingSimilarPart && styles.disabledInput]}
                value={newPart.dimensions['width'] || ''}
                onChangeText={(text) => !usingSimilarPart && handleDimensionChange('width', text)}
                placeholder="mm"
                placeholderTextColor="#6B728080"
                keyboardType="decimal-pad"
                editable={!usingSimilarPart}
              />
              {usingSimilarPart && <ThemedText style={styles.lockedIndicator}>🔒 Fixed from existing part</ThemedText>}
            </View>
            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Fillet</ThemedText>
              <TextInput
                style={[styles.input, usingSimilarPart && styles.disabledInput]}
                value={newPart.dimensions['fillet'] || ''}
                onChangeText={(text) => !usingSimilarPart && handleDimensionChange('fillet', text)}
                placeholder="mm"
                placeholderTextColor="#6B728080"
                keyboardType="decimal-pad"
                editable={!usingSimilarPart}
              />
              {usingSimilarPart && <ThemedText style={styles.lockedIndicator}>🔒 Fixed from existing part</ThemedText>}
            </View>
            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Thickness</ThemedText>
              <TextInput
                style={[styles.input, usingSimilarPart && styles.disabledInput]}
                value={newPart.dimensions['thickness'] || ''}
                onChangeText={(text) => !usingSimilarPart && handleDimensionChange('thickness', text)}
                placeholder="mm"
                placeholderTextColor="#6B728080"
                keyboardType="decimal-pad"
                editable={!usingSimilarPart}
              />
              {usingSimilarPart && <ThemedText style={styles.lockedIndicator}>🔒 Fixed from existing part</ThemedText>}
            </View>
          </>
        );
      case 'Push Pad':
        return null;
      default:
        return null;
    }
  };

  const renderEditDimensionInputs = () => {
    switch (editingPart.type) {
      case 'U shape':
        return (
          <>
            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Length *</ThemedText>
              <TextInput
                style={styles.input}
                value={editingPart.dimensions['length'] || ''}
                onChangeText={(text) => handleEditDimensionChange('length', text)}
                placeholder="mm"
                placeholderTextColor="#6B728080"
                keyboardType="decimal-pad"
              />
            </View>
            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Radius *</ThemedText>
              <TextInput
                style={styles.input}
                value={editingPart.dimensions['radius'] || ''}
                onChangeText={(text) => handleEditDimensionChange('radius', text)}
                placeholder="mm"
                placeholderTextColor="#6B728080"
                keyboardType="decimal-pad"
              />
            </View>
            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Depth *</ThemedText>
              <TextInput
                style={styles.input}
                value={editingPart.dimensions['depth'] || ''}
                onChangeText={(text) => handleEditDimensionChange('depth', text)}
                placeholder="mm"
                placeholderTextColor="#6B728080"
                keyboardType="decimal-pad"
              />
            </View>
            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>O Fillet *</ThemedText>
              <TextInput
                style={styles.input}
                value={editingPart.dimensions['oFillet'] || ''}
                onChangeText={(text) => handleEditDimensionChange('oFillet', text)}
                placeholder="mm"
                placeholderTextColor="#6B728080"
                keyboardType="decimal-pad"
              />
            </View>
            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>I Fillet *</ThemedText>
              <TextInput
                style={styles.input}
                value={editingPart.dimensions['iFillet'] || ''}
                onChangeText={(text) => handleEditDimensionChange('iFillet', text)}
                placeholder="mm"
                placeholderTextColor="#6B728080"
                keyboardType="decimal-pad"
              />
            </View>
          </>
        );
      case 'Straight':
        return (
          <>
            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Length *</ThemedText>
              <TextInput
                style={styles.input}
                value={editingPart.dimensions['length'] || ''}
                onChangeText={(text) => handleEditDimensionChange('length', text)}
                placeholder="mm"
                placeholderTextColor="#6B728080"
                keyboardType="decimal-pad"
              />
            </View>
            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Radius *</ThemedText>
              <TextInput
                style={styles.input}
                value={editingPart.dimensions['radius'] || ''}
                onChangeText={(text) => handleEditDimensionChange('radius', text)}
                placeholder="mm"
                placeholderTextColor="#6B728080"
                keyboardType="decimal-pad"
              />
            </View>
          </>
        );
      case 'Knob':
        return (
          <>
            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Front Radius *</ThemedText>
              <TextInput
                style={styles.input}
                value={editingPart.dimensions['frontRadius'] || ''}
                onChangeText={(text) => handleEditDimensionChange('frontRadius', text)}
                placeholder="mm"
                placeholderTextColor="#6B728080"
                keyboardType="decimal-pad"
              />
            </View>
            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Middle Radius *</ThemedText>
              <TextInput
                style={styles.input}
                value={editingPart.dimensions['middleRadius'] || ''}
                onChangeText={(text) => handleEditDimensionChange('middleRadius', text)}
                placeholder="mm"
                placeholderTextColor="#6B728080"
                keyboardType="decimal-pad"
              />
            </View>
            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Back Radius *</ThemedText>
              <TextInput
                style={styles.input}
                value={editingPart.dimensions['backRadius'] || ''}
                onChangeText={(text) => handleEditDimensionChange('backRadius', text)}
                placeholder="mm"
                placeholderTextColor="#6B728080"
                keyboardType="decimal-pad"
              />
            </View>
            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Depth *</ThemedText>
              <TextInput
                style={styles.input}
                value={editingPart.dimensions['depth'] || ''}
                onChangeText={(text) => handleEditDimensionChange('depth', text)}
                placeholder="mm"
                placeholderTextColor="#6B728080"
                keyboardType="decimal-pad"
              />
            </View>
            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Middle to Back Depth *</ThemedText>
              <TextInput
                style={styles.input}
                value={editingPart.dimensions['middleToBackDepth'] || ''}
                onChangeText={(text) => handleEditDimensionChange('middleToBackDepth', text)}
                placeholder="mm"
                placeholderTextColor="#6B728080"
                keyboardType="decimal-pad"
              />
            </View>
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
            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Radius *</ThemedText>
              <TextInput
                style={styles.input}
                value={editingPart.dimensions['radius'] || ''}
                onChangeText={(text) => handleEditDimensionChange('radius', text)}
                placeholder="mm"
                placeholderTextColor="#6B728080"
                keyboardType="decimal-pad"
              />
            </View>
            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Length *</ThemedText>
              <TextInput
                style={styles.input}
                value={editingPart.dimensions['length'] || ''}
                onChangeText={(text) => handleEditDimensionChange('length', text)}
                placeholder="mm"
                placeholderTextColor="#6B728080"
                keyboardType="decimal-pad"
              />
            </View>
            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Width *</ThemedText>
              <TextInput
                style={styles.input}
                value={editingPart.dimensions['width'] || ''}
                onChangeText={(text) => handleEditDimensionChange('width', text)}
                placeholder="mm"
                placeholderTextColor="#6B728080"
                keyboardType="decimal-pad"
              />
            </View>
            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Fillet *</ThemedText>
              <TextInput
                style={styles.input}
                value={editingPart.dimensions['fillet'] || ''}
                onChangeText={(text) => handleEditDimensionChange('fillet', text)}
                placeholder="mm"
                placeholderTextColor="#6B728080"
                keyboardType="decimal-pad"
              />
            </View>
            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Thickness *</ThemedText>
              <TextInput
                style={styles.input}
                value={editingPart.dimensions['thickness'] || ''}
                onChangeText={(text) => handleEditDimensionChange('thickness', text)}
                placeholder="mm"
                placeholderTextColor="#6B728080"
                keyboardType="decimal-pad"
              />
            </View>
          </>
        );
      case 'Push Pad':
        return (
          <>
            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Length *</ThemedText>
              <TextInput
                style={styles.input}
                value={editingPart.dimensions['length'] || ''}
                onChangeText={(text) => handleEditDimensionChange('length', text)}
                placeholder="mm"
                placeholderTextColor="#6B728080"
                keyboardType="decimal-pad"
              />
            </View>
            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Width *</ThemedText>
              <TextInput
                style={styles.input}
                value={editingPart.dimensions['width'] || ''}
                onChangeText={(text) => handleEditDimensionChange('width', text)}
                placeholder="mm"
                placeholderTextColor="#6B728080"
                keyboardType="decimal-pad"
              />
            </View>
            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Radius *</ThemedText>
              <TextInput
                style={styles.input}
                value={editingPart.dimensions['radius'] || ''}
                onChangeText={(text) => handleEditDimensionChange('radius', text)}
                placeholder="mm"
                placeholderTextColor="#6B728080"
                keyboardType="decimal-pad"
              />
            </View>
          </>
        );
      default:
        return null;
    }
  };
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft color="#6B7280" size={24} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <ThemedText style={styles.headerTitle}>{venue.name}</ThemedText>
          <ThemedText style={styles.headerSubtitle}>{project.name} • PIC: {venue.pic}</ThemedText>
        </View>
        <View style={styles.modeButtons}>
          <TouchableOpacity
            style={[styles.modeButton, countingMode && styles.modeButtonActive]}
            onPress={handleCountingModeToggle}
          >
            <Hash color={countingMode ? '#FFFFFF' : '#6B7280'} size={20} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeButton, statusMode && styles.modeButtonActive]}
            onPress={handleStatusModeToggle}
          >
            <Tag color={statusMode ? '#FFFFFF' : '#6B7280'} size={20} />
          </TouchableOpacity>
        </View>
      </View>
      <ScrollView style={styles.partsList} showsVerticalScrollIndicator={false}>
        {Object.entries(groupedParts).map(([type, parts]) => {
          const isCollapsed = collapsedCategories[type];
          return (
            <View key={type} style={styles.partCategory}>
              <TouchableOpacity
                style={styles.categoryHeader}
                onPress={() => setCollapsedCategories(prev => ({ ...prev, [type]: !isCollapsed }))}
              >
                <ThemedText style={styles.categoryTitle}>{type} ({parts.length})</ThemedText>
                {isCollapsed ? (
                  <ChevronRight color="#6B7280" size={20} />
                ) : (
                  <ChevronDown color="#6B7280" size={20} />
                )}
              </TouchableOpacity>
              {!isCollapsed && parts.map((part) => {
                const quantity = partQuantities[part.id] || 0;
                const subParts = getSubParts(part.id);
                const hasComments = hasUnfinishedComments(part.id);

                return (
                  <View key={part.id}>
                    <PartCard
                      part={part}
                      quantity={quantity}
                      showQuantity={true}
                      countingMode={countingMode}
                      statusMode={statusMode}
                      hasComments={hasComments}
                      venueName={venue.name}
                      onQuantityChange={(delta) => handleQuantityChange(part.id, delta)}
                      onStatusChange={(newStatus) => handleStatusChange(part.id, newStatus)}
                      onCommentSend={(text) => handleCommentSend(part.id, text)}
                      onMorePress={() => {
                        setSelectedPart(part);
                        setShowPartActionModal(true);
                      }}
                      onPress={() => {
                        setSelectedPart(part);
                        setShowPartDetailModal(true);
                      }}
                    />
                    {subParts.map((subPart) => {
                      const subQuantity = partQuantities[subPart.id] || 0;
                      const subHasComments = hasUnfinishedComments(subPart.id);
                      return (
                        <View key={subPart.id} style={styles.subPartContainer}>
                          <PartCard
                            part={subPart}
                            quantity={subQuantity}
                            showQuantity={true}
                            countingMode={countingMode}
                            statusMode={statusMode}
                            hasComments={subHasComments}
                            venueName={venue.name}
                            onQuantityChange={(delta) => handleQuantityChange(subPart.id, delta)}
                            onStatusChange={(newStatus) => handleStatusChange(subPart.id, newStatus)}
                            onCommentSend={(text) => handleCommentSend(subPart.id, text)}
                            onMorePress={() => {
                              setSelectedPart(subPart);
                              setShowPartActionModal(true);
                            }}
                            onPress={() => {
                              setSelectedPart(subPart);
                              setShowPartDetailModal(true);
                            }}
                          />
                        </View>
                      );
                    })}
                  </View>
                );
              })}
            </View>
          );
        })}
      </ScrollView>
      <TouchableOpacity
        style={styles.floatingAddButton}
        onPress={() => setShowCreatePartModal(true)}
      >
        <Plus color="#FFFFFF" size={28} />
      </TouchableOpacity>
      <Modal
        visible={showCreatePartModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <ThemedText style={styles.modalTitle}>Create New Part</ThemedText>
            <TouchableOpacity onPress={() => {
              console.log('Closing create part modal');
              setShowCreatePartModal(false);
            }}>
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
                ].map((type) => {
                  const displayType = type === 'U shape' ? 'U/Curved shape' : type === 'X - Special Design' ? 'X - Special Handle' : type === 'Push Pad' ? 'Push Plate' : type;
                  return (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.typeButton,
                      newPart.type === type && styles.selectedTypeButton,
                      usingSimilarPart && styles.disabledTypeButton
                    ]}
                    onPress={() => !usingSimilarPart && setNewPart(prev => ({
                      ...prev,
                      type: type as PartType,
                      dimensions: {}
                    }))}
                    disabled={usingSimilarPart}
                  >
                    <ThemedText style={[
                      styles.typeButtonText,
                      newPart.type === type && styles.selectedTypeButtonText,
                      usingSimilarPart && styles.disabledTypeButtonText
                    ]}>
                      {displayType}
                    </ThemedText>
                  </TouchableOpacity>
                );
                })}
              </ScrollView>
              {usingSimilarPart && (
                <ThemedText style={styles.lockedIndicator}>🔒 Fixed from existing part</ThemedText>
              )}
            </View>
            {newPart.type !== 'Push Pad' && (
              <View style={styles.inputGroup}>
                <ThemedText style={styles.inputLabel}>Part Number</ThemedText>
                <TouchableOpacity 
                  style={[styles.autoGeneratedBox, usingSimilarPart && styles.lockedFieldBox]}
                  onPress={() => {
                    console.log('Part number field tapped, usingSimilarPart:', usingSimilarPart);
                    if (!usingSimilarPart && !isToiletCapLifter(newPart.type, newPart.dimensions)) {
                      console.log('Opening part number picker');
                      setShowPartNumberPicker(true);
                    }
                  }}
                  disabled={usingSimilarPart || isToiletCapLifter(newPart.type, newPart.dimensions)}
                  activeOpacity={0.7}
                >
                  <View style={styles.partNumberContent}>
                    <ThemedText style={styles.autoGeneratedLabel}>
                      {manualPartNumber ? 'Selected:' : 'Auto-generated:'}
                    </ThemedText>
                    <ThemedText style={[styles.autoGeneratedValue, usingSimilarPart && styles.lockedPartNumber]}>
                      {usingSimilarPart && similarPart
                        ? similarPart.part.name
                        : isToiletCapLifter(newPart.type, newPart.dimensions)
                          ? 'TL'
                          : manualPartNumber 
                            ? `${getPartNumberPrefix(newPart.type, newPart.dimensions)}${manualPartNumber}`
                            : nextPartNumber > 0
                              ? `${getPartNumberPrefix(newPart.type, newPart.dimensions)}${nextPartNumber}`
                              : 'Loading...'}
                    </ThemedText>
                  </View>
                  {!usingSimilarPart && !isToiletCapLifter(newPart.type, newPart.dimensions) && (
                    <ChevronRightIcon color="#6B7280" size={20} />
                  )}
                </TouchableOpacity>
                {!usingSimilarPart && !isToiletCapLifter(newPart.type, newPart.dimensions) && (
                <ThemedText style={styles.helperText}>
                  {manualPartNumber 
                    ? 'Tap to change part number' 
                    : 'Part numbers are assigned automatically. Tap to select manually.'}
                </ThemedText>
              )}
              {usingSimilarPart && (
                <ThemedText style={styles.helperText}>
                  Using dimensions from existing part. Only description and pictures can be modified.
                </ThemedText>
              )}
            </View>
            )}
            {renderDimensionInputs()}
            {newPart.type === 'Push Pad' ? (
              <View style={styles.inputGroup}>
                <ThemedText style={styles.inputLabel}>Part Number *</ThemedText>
                <View style={styles.buttonShapeContainer}>
                  {['P1', 'P2', 'P3'].map((option) => (
                    <TouchableOpacity
                      key={option}
                      style={[
                        styles.shapeButton,
                        manualPartNumber === parseInt(option.substring(1)) && styles.selectedShapeButton,
                        usingSimilarPart && styles.disabledShapeButton
                      ]}
                      onPress={() => !usingSimilarPart && setManualPartNumber(manualPartNumber === parseInt(option.substring(1)) ? null : parseInt(option.substring(1)))}
                      disabled={usingSimilarPart}
                    >
                      <ThemedText style={[
                        styles.shapeButtonText,
                        manualPartNumber === parseInt(option.substring(1)) && styles.selectedShapeButtonText
                      ]}>
                        {option}
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>
                {usingSimilarPart && <ThemedText style={styles.lockedIndicator}>🔒 Fixed from existing part</ThemedText>}
                {manualPartNumber && (
                  <View style={styles.dimensionVisualizationContainer}>
                    <View style={[styles.dimensionRectangle, {
                      width: manualPartNumber === 3 ? 75 : 100,
                      aspectRatio: manualPartNumber === 1 ? 1 : manualPartNumber === 2 ? (10/15) : (7.5/15)
                    }]}>
                      <Ionicons name="hand-right-outline" size={50} color="#3B82F6" />
                    </View>
                    <View style={styles.dimensionLabelContainer}>
                      <ThemedText style={styles.dimensionText}>
                        {manualPartNumber === 1 ? 'Length: 10cm × Width: 10cm' : manualPartNumber === 2 ? 'Length: 10cm × Width: 15cm' : 'Length: 7.5cm × Width: 15cm'}
                      </ThemedText>
                    </View>
                  </View>
                )}
              </View>
            ) : null}
            {newPart.type === 'Gadget' && (
              <View style={styles.inputGroup}>
                <ThemedText style={styles.inputLabel}>Gadget Type</ThemedText>
                <View style={styles.buttonShapeContainer}>
                  {['Toilet Cap Lifter'].map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.shapeButton,
                        newPart.dimensions.gadgetType === type && styles.selectedShapeButton,
                        usingSimilarPart && styles.disabledShapeButton
                      ]}
                      onPress={() => !usingSimilarPart && setNewPart(prev => ({
                        ...prev,
                        dimensions: { ...prev.dimensions, gadgetType: prev.dimensions.gadgetType === type ? undefined : type }
                      }))}
                      disabled={usingSimilarPart}
                    >
                      <ThemedText style={[
                        styles.shapeButtonText,
                        newPart.dimensions.gadgetType === type && styles.selectedShapeButtonText
                      ]}>
                        {type}
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>
                {usingSimilarPart && <ThemedText style={styles.lockedIndicator}>🔒 Fixed from existing part</ThemedText>}
              </View>
            )}
            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Description *</ThemedText>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={newPart.description}
                onChangeText={(text) => setNewPart(prev => ({ ...prev, description: text }))}
                placeholder="Enter part location and description"
                placeholderTextColor="#6B728080"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
            {newPart.type !== 'Push Pad' && (
            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Designer</ThemedText>
              <DesignerSelector
                value={newPart.designer}
                onChangeText={(text) => !usingSimilarPart && setNewPart(prev => ({ ...prev, designer: text }))}
                profiles={profiles}
                placeholder="Enter designer name (optional)"
                placeholderTextColor="#6B728080"
                inputStyle={[styles.input, usingSimilarPart && styles.disabledInput]}
                editable={!usingSimilarPart}
              />
              {usingSimilarPart && <ThemedText style={styles.lockedIndicator}>🔒 Fixed from existing part</ThemedText>}
            </View>
            )}
            {newPart.type !== 'Push Pad' && (
            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>CAD Drawing (Optional)</ThemedText>
              {!usingSimilarPart && (
                <TouchableOpacity
                  style={styles.pictureButton}
                  onPress={() => handleSelectCADDrawing(false)}
                >
                  <Camera color="#6B7280" size={24} />
                  <ThemedText style={styles.pictureButtonText}>Add CAD Drawing</ThemedText>
                </TouchableOpacity>
              )}
              {newPart.cadDrawing && (
                <View style={styles.previewContainer}>
                  <Image source={{ uri: newPart.cadDrawing }} style={styles.thumbnailPreview} />
                  {!usingSimilarPart && (
                    <TouchableOpacity
                      style={styles.removePreviewButton}
                      onPress={() => setNewPart(prev => ({ ...prev, cadDrawing: '' }))}
                    >
                      <X color="#FFFFFF" size={16} />
                    </TouchableOpacity>
                  )}
                </View>
              )}
              {usingSimilarPart && <ThemedText style={styles.lockedIndicator}>🔒 Fixed from existing part</ThemedText>}
            </View>
            )}
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
                data={newPart.pictures}
                keyExtractor={(item) => item}
                horizontal
                style={styles.previewList}
                renderItem={({ item }) => (
                  <View style={styles.previewContainer}>
                    <Image source={{ uri: item }} style={styles.thumbnailPreview} />
                    <TouchableOpacity
                      style={styles.removePreviewButton}
                      onPress={() => handleRemovePicture(item, false)}
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
                    <ThemedText style={styles.useSimilarPartButtonText}>
                      Use {similarPart.part.name}
                    </ThemedText>
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
              style={[styles.createButton, usingSimilarPart && styles.createPartUsingExistingButton, isToiletCapLifterExists() && styles.disabledCreateButton]}
              onPress={handleCreatePart}
              disabled={isToiletCapLifterExists()}
            >
              <ThemedText style={styles.createButtonText}>{usingSimilarPart ? 'Create Existing Part' : 'Create Part'}</ThemedText>
            </TouchableOpacity>
            {isToiletCapLifterExists() && (
              <ThemedText style={styles.disabledButtonHint}>Toilet Cap Lifter (TL) already exists in this project</ThemedText>
            )}
          </ScrollView>

          {/* Part Number Picker Overlay - Inside Create Part Modal */}
          {showPartNumberPicker && (
            <View style={styles.partNumberPickerOverlay}>
              <SafeAreaView style={styles.partNumberPickerContainer}>
                <View style={styles.modalHeader}>
                  <ThemedText style={styles.modalTitle}>Select Part Number</ThemedText>
                  <TouchableOpacity onPress={() => setShowPartNumberPicker(false)}>
                    <ThemedText style={styles.modalClose}>Cancel</ThemedText>
                  </TouchableOpacity>
                </View>
                <View style={styles.partNumberPickerInfo}>
                  <ThemedText style={styles.partNumberPickerInfoText}>
                    Type: {newPart.type === 'U shape' ? 'U/Curved shape' : newPart.type === 'X - Special Design' ? 'X - Special Handle' : newPart.type} ({getPartNumberPrefix(newPart.type, newPart.dimensions)})
                  </ThemedText>
                  <ThemedText style={styles.partNumberPickerSubtext}>
                    Available numbers are shown. Used numbers are hidden.
                  </ThemedText>
                </View>
                <ScrollView style={styles.partNumberPickerContent}>
                  <View style={styles.partNumberGrid}>
                    {Array.from({ length: 500 }, (_, i) => i + 1).map((num) => {
                      const isUsed = usedPartNumbers.includes(num);
                      return (
                        <TouchableOpacity
                          key={num}
                          style={[
                            styles.partNumberButton,
                            isUsed && styles.partNumberButtonUsed,
                            manualPartNumber === num && styles.partNumberButtonSelected,
                          ]}
                          onPress={() => !isUsed && handleSelectPartNumber(num)}
                          disabled={isUsed}
                        >
                          <ThemedText style={[
                            styles.partNumberButtonText,
                            isUsed && styles.partNumberButtonTextUsed,
                            manualPartNumber === num && styles.partNumberButtonTextSelected,
                          ]}>
                            {num}
                          </ThemedText>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>
              </SafeAreaView>
            </View>
          )}
        </SafeAreaView>
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
          if (selectedPart) {
            setAllComments(prev => ({
              ...prev,
              [selectedPart.id]: updatedComments
            }));
          }
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
                style={styles.actionButton}
                onPress={() => handleModelStatusChange(status)}
              >
                <ThemedText style={styles.actionButtonText}>{status.charAt(0).toUpperCase() + status.slice(1)}</ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
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
              style={[styles.actionButton, { borderBottomWidth: 0 }]}
              onPress={() => handlePartAction('delete')}
            >
              <ThemedText style={[styles.actionButtonText, { color: '#EF4444' }]}>Delete Part</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <Modal
        visible={showFullImageModal}
        animationType="fade"
        transparent={false}
        onRequestClose={() => setShowFullImageModal(false)}
      >
        <SafeAreaView style={styles.fullImageModalContainer}>
          <View style={styles.fullImageHeader}>
            <TouchableOpacity
              style={styles.fullImageCloseButton}
              onPress={() => setShowFullImageModal(false)}
            >
              <X color="#FFFFFF" size={28} />
            </TouchableOpacity>
          </View>
          <View style={styles.fullImageContent}>
            {fullImageUri ? (
              <Image 
                source={{ uri: fullImageUri }} 
                style={styles.fullImage}
                onError={(error) => console.log('Image load error:', error)}
              />
            ) : (
              <ThemedText style={styles.noImageText}>Loading image...</ThemedText>
            )}
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
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
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    marginRight: 16,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  modeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  modeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modeButtonActive: {
    backgroundColor: '#2563EB',
  },
  // Removed duplicate sectionHeader and sectionTitle
  partsList: {
    marginTop:8,
    flex: 1,
    paddingHorizontal: 16,
  },
  partCategory: {
    marginBottom: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    justifyContent: 'space-between',
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
  helperText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    fontStyle: 'italic',
  },
  autoGeneratedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 12,
    marginTop: 4,
  },
  autoGeneratedLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginRight: 8,
  },
  autoGeneratedValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2563EB',
  },
  lockedFieldBox: {
    backgroundColor: '#FEF3C7',
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B',
  },
  lockedPartNumber: {
    color: '#DC2626',
    fontWeight: '700',
  },
  disabledInput: {
    backgroundColor: '#F3F4F6',
    color: '#9CA3AF',
  },
  lockedIndicator: {
    fontSize: 12,
    color: '#DC2626',
    marginTop: 4,
    fontWeight: '500',
  },
  generateNewPartButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  generateNewPartButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  createPartUsingExistingButton: {
    backgroundColor: '#DC2626',
  },
  textArea: {
    height: 100,
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
  disabledShapeButton: {
    opacity: 0.5,
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
  disabledCreateButton: {
    backgroundColor: '#9CA3AF',
    opacity: 0.6,
  },
  disabledButtonHint: {
    color: '#EF4444',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
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
  detailSection: {
    marginBottom: 20,
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
  descriptionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 8,
  },
  descriptionValue: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  fullImageModalContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  fullImageHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  fullImageContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 16,
  },
  fullImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  fullImageCloseButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 24,
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noImageText: {
    color: '#FFFFFF',
    fontSize: 16,
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
  subPartContainer: {
    marginLeft: 32,
    borderLeftWidth: 2,
    borderLeftColor: '#E5E7EB',
    paddingLeft: 16,
  },
  actionModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 16,
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
  commentAuthor: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
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
  pendingBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginTop: 4,
  },
  pendingText: {
    fontSize: 11,
    color: '#92400E',
    fontWeight: '600',
  },
  partNumberPickerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    zIndex: 1000,
  },
  partNumberPickerContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  partNumberContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  partNumberPickerInfo: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F3F4F6',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  partNumberPickerInfoText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  partNumberPickerSubtext: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
  partNumberPickerContent: {
    flex: 1,
    padding: 12,
  },
  partNumberGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  partNumberButton: {
    width: '18%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    margin: '1%',
  },
  partNumberButtonUsed: {
    backgroundColor: '#F9FAFB',
    borderColor: '#F3F4F6',
    opacity: 0.5,
  },
  partNumberButtonSelected: {
    backgroundColor: '#FBBF24',
    borderColor: '#F59E0B',
  },
  partNumberButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#111827',
  },
  partNumberButtonTextUsed: {
    color: '#9CA3AF',
  },
  partNumberButtonTextSelected: {
    color: '#78350F',
    fontWeight: '700',
  },
  dimensionVisualizationContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
  dimensionRectangle: {
    borderWidth: 2,
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderRadius: 4,
  },
  dimensionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1F2937',
  },
  dimensionLabelContainer: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 4,
  },
  dimensionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
}); 