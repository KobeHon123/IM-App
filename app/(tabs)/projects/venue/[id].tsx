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
  SafeAreaView,
  FlatList,
  Image,
  Platform
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Camera, CheckSquare, ChevronDown, ChevronRight, Edit2, FileText, Hash, Image as ImageIcon, Info, MessageCircle, Package, Plus, Ruler, Square, Tag, User, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { getVenue, getPartsByProject, createPart, createSubPart, updatePart, deletePart, findDuplicatePart, getVenuePartQuantity, updateVenuePartQuantity, checkPartNumberExists, createComment, getCommentsByPart, updateComment, deleteComment, toggleCommentCompletion, getCurrentPartNumber } from '@/lib/supabaseHelpers';
import { supabase } from '@/lib/supabase';
import { PartCard } from '@/components/PartCard';
import { Part, PartType, Comment } from '@/types';
export default function VenueDetailScreen() {
  const { id } = useLocalSearchParams();
  const [venue, setVenue] = useState<any>(null);
  const [project, setProject] = useState<any>(null);
  const [projectParts, setProjectParts] = useState<Part[]>([]);
  const [partQuantities, setPartQuantities] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVenueData();
  }, [id]);

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
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');
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
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  const [similarPart, setSimilarPart] = useState<{ part: Part; similarity: number } | null>(null);

  // Calculate similarity between two sets of dimensions
  const calculateDimensionSimilarity = (dims1: any, dims2: any): number => {
    const keys = Object.keys(dims1).filter(key => dims2[key] !== undefined && dims2[key] !== '' && dims1[key] !== '');
    if (keys.length === 0) return 0;

    let totalDifference = 0;
    let validKeys = 0;

    for (const key of keys) {
      const val1 = parseFloat(dims1[key]) || 0;
      const val2 = parseFloat(dims2[key]) || 0;

      if ((val1 === 0 && val2 === 0) || (isNaN(val1) && isNaN(val2))) {
        continue;
      }

      const maxVal = Math.max(Math.abs(val1), Math.abs(val2));
      if (maxVal === 0) continue;

      const percentageDifference = Math.abs(val1 - val2) / maxVal * 100;
      totalDifference += percentageDifference;
      validKeys++;
    }

    if (validKeys === 0) return 0;

    const avgDifference = totalDifference / validKeys;
    return Math.max(0, 100 - avgDifference);
  };

  // Check for similar parts in real-time
  useEffect(() => {
    if (!newPart.type || Object.keys(newPart.dimensions).length === 0) {
      setSimilarPart(null);
      return;
    }

    let highestSimilarity = 0;
    let mostSimilarPart: Part | null = null;

    for (const part of projectParts) {
      // Only compare with parts of the same type
      if (part.type !== newPart.type) continue;

      const similarity = calculateDimensionSimilarity(newPart.dimensions, part.dimensions || {});
      
      if (similarity > 95 && similarity > highestSimilarity) {
        highestSimilarity = similarity;
        mostSimilarPart = part;
      }
    }

    if (mostSimilarPart) {
      setSimilarPart({ part: mostSimilarPart, similarity: highestSimilarity });
    } else {
      setSimilarPart(null);
    }
  }, [newPart.dimensions, newPart.type, projectParts]);

  // Use existing similar part data
  const handleUseSimilarPart = () => {
    if (similarPart) {
      setNewPart(prev => ({
        ...prev,
        description: similarPart.part.description,
        designer: similarPart.part.designer,
        cadDrawing: similarPart.part.cadDrawing,
        pictures: similarPart.part.pictures,
        dimensions: { ...similarPart.part.dimensions }
      }));
    }
  };

  useEffect(() {
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
    }
  }, [showCreatePartModal, newPart.type]);

  const loadNextPartNumber = async () => {
    try {
      const nextNum = await getCurrentPartNumber(newPart.type);
      setNextPartNumber(nextNum + 1);
    } catch (error) {
      console.error('Error loading next part number:', error);
      setNextPartNumber(0);
    }
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
        <Text>Venue not found</Text>
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
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

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
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
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
        isPending: true, // Default to pending status
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

  const handleToggleCommentCompletion = async (commentId: string) => {
    try {
      const updatedComment = await toggleCommentCompletion(commentId);
      if (updatedComment) {
        setSelectedPartComments(prev =>
          prev.map(c => c.id === commentId ? updatedComment : c)
        );
        setAllComments(prev => ({
          ...prev,
          [updatedComment.partId]: prev[updatedComment.partId]?.map(c =>
            c.id === commentId ? updatedComment : c
          ) || []
        }));
      }
    } catch (error) {
      console.error('Error toggling comment completion:', error);
      Alert.alert('Error', 'Failed to update comment status');
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
    const partToCreate = {
      type: newPart.type,
      description: newPart.description,
      pictures: newPart.pictures,
      cadDrawing: newPart.cadDrawing || undefined,
      dimensions: newPart.dimensions,
      status: 'measured' as const,
      projectId: project.id,
      designer: newPart.designer || undefined,
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
        await loadVenueData();
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
      await loadVenueData();
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
    switch (newPart.type) {
      case 'U shape':
        return (
          <>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Length *</Text>
              <TextInput
                style={styles.input}
                value={newPart.dimensions['length'] || ''}
                onChangeText={(text) => handleDimensionChange('length', text)}
                placeholder="mm"
                placeholderTextColor="#6B728080"
                keyboardType="decimal-pad"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Radius *</Text>
              <TextInput
                style={styles.input}
                value={newPart.dimensions['radius'] || ''}
                onChangeText={(text) => handleDimensionChange('radius', text)}
                placeholder="mm"
                placeholderTextColor="#6B728080"
                keyboardType="decimal-pad"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Depth *</Text>
              <TextInput
                style={styles.input}
                value={newPart.dimensions['depth'] || ''}
                onChangeText={(text) => handleDimensionChange('depth', text)}
                placeholder="mm"
                placeholderTextColor="#6B728080"
                keyboardType="decimal-pad"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>O Fillet *</Text>
              <TextInput
                style={styles.input}
                value={newPart.dimensions['oFillet'] || ''}
                onChangeText={(text) => handleDimensionChange('oFillet', text)}
                placeholder="mm"
                placeholderTextColor="#6B728080"
                keyboardType="decimal-pad"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>I Fillet *</Text>
              <TextInput
                style={styles.input}
                value={newPart.dimensions['iFillet'] || ''}
                onChangeText={(text) => handleDimensionChange('iFillet', text)}
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
              <Text style={styles.inputLabel}>Length *</Text>
              <TextInput
                style={styles.input}
                value={newPart.dimensions['length'] || ''}
                onChangeText={(text) => handleDimensionChange('length', text)}
                placeholder="mm"
                placeholderTextColor="#6B728080"
                keyboardType="decimal-pad"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Radius *</Text>
              <TextInput
                style={styles.input}
                value={newPart.dimensions['radius'] || ''}
                onChangeText={(text) => handleDimensionChange('radius', text)}
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
              <Text style={styles.inputLabel}>Front Radius *</Text>
              <TextInput
                style={styles.input}
                value={newPart.dimensions['frontRadius'] || ''}
                onChangeText={(text) => handleDimensionChange('frontRadius', text)}
                placeholder="mm"
                placeholderTextColor="#6B728080"
                keyboardType="decimal-pad"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Middle Radius *</Text>
              <TextInput
                style={styles.input}
                value={newPart.dimensions['middleRadius'] || ''}
                onChangeText={(text) => handleDimensionChange('middleRadius', text)}
                placeholder="mm"
                placeholderTextColor="#6B728080"
                keyboardType="decimal-pad"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Back Radius *</Text>
              <TextInput
                style={styles.input}
                value={newPart.dimensions['backRadius'] || ''}
                onChangeText={(text) => handleDimensionChange('backRadius', text)}
                placeholder="mm"
                placeholderTextColor="#6B728080"
                keyboardType="decimal-pad"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Depth *</Text>
              <TextInput
                style={styles.input}
                value={newPart.dimensions['depth'] || ''}
                onChangeText={(text) => handleDimensionChange('depth', text)}
                placeholder="mm"
                placeholderTextColor="#6B728080"
                keyboardType="decimal-pad"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Middle to Back Depth *</Text>
              <TextInput
                style={styles.input}
                value={newPart.dimensions['middleToBackDepth'] || ''}
                onChangeText={(text) => handleDimensionChange('middleToBackDepth', text)}
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
              <Text style={styles.inputLabel}>Shape *</Text>
              <View style={styles.buttonShapeContainer}>
                {['Circle', 'Rectangular', 'Slot'].map((shape) => (
                  <TouchableOpacity
                    key={shape}
                    style={[
                      styles.shapeButton,
                      newPart.dimensions.shape === shape && styles.selectedShapeButton
                    ]}
                    onPress={() => setNewPart(prev => ({
                      ...prev,
                      dimensions: { ...prev.dimensions, shape }
                    }))}
                  >
                    <Text style={[
                      styles.shapeButtonText,
                      newPart.dimensions.shape === shape && styles.selectedShapeButtonText
                    ]}>
                      {shape}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Radius *</Text>
              <TextInput
                style={styles.input}
                value={newPart.dimensions['radius'] || ''}
                onChangeText={(text) => handleDimensionChange('radius', text)}
                placeholder="mm"
                placeholderTextColor="#6B728080"
                keyboardType="decimal-pad"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Length *</Text>
              <TextInput
                style={styles.input}
                value={newPart.dimensions['length'] || ''}
                onChangeText={(text) => handleDimensionChange('length', text)}
                placeholder="mm"
                placeholderTextColor="#6B728080"
                keyboardType="decimal-pad"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Width *</Text>
              <TextInput
                style={styles.input}
                value={newPart.dimensions['width'] || ''}
                onChangeText={(text) => handleDimensionChange('width', text)}
                placeholder="mm"
                placeholderTextColor="#6B728080"
                keyboardType="decimal-pad"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Fillet *</Text>
              <TextInput
                style={styles.input}
                value={newPart.dimensions['fillet'] || ''}
                onChangeText={(text) => handleDimensionChange('fillet', text)}
                placeholder="mm"
                placeholderTextColor="#6B728080"
                keyboardType="decimal-pad"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Thickness *</Text>
              <TextInput
                style={styles.input}
                value={newPart.dimensions['thickness'] || ''}
                onChangeText={(text) => handleDimensionChange('thickness', text)}
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
              <Text style={styles.inputLabel}>Length *</Text>
              <TextInput
                style={styles.input}
                value={newPart.dimensions['length'] || ''}
                onChangeText={(text) => handleDimensionChange('length', text)}
                placeholder="mm"
                placeholderTextColor="#6B728080"
                keyboardType="decimal-pad"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Width *</Text>
              <TextInput
                style={styles.input}
                value={newPart.dimensions['width'] || ''}
                onChangeText={(text) => handleDimensionChange('width', text)}
                placeholder="mm"
                placeholderTextColor="#6B728080"
                keyboardType="decimal-pad"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Radius *</Text>
              <TextInput
                style={styles.input}
                value={newPart.dimensions['radius'] || ''}
                onChangeText={(text) => handleDimensionChange('radius', text)}
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

  const renderEditDimensionInputs = () => {
    switch (editingPart.type) {
      case 'U shape':
        return (
          <>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Length *</Text>
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
              <Text style={styles.inputLabel}>Radius *</Text>
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
              <Text style={styles.inputLabel}>Depth *</Text>
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
              <Text style={styles.inputLabel}>O Fillet *</Text>
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
              <Text style={styles.inputLabel}>I Fillet *</Text>
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
              <Text style={styles.inputLabel}>Length *</Text>
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
              <Text style={styles.inputLabel}>Radius *</Text>
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
              <Text style={styles.inputLabel}>Front Radius *</Text>
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
              <Text style={styles.inputLabel}>Middle Radius *</Text>
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
              <Text style={styles.inputLabel}>Back Radius *</Text>
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
              <Text style={styles.inputLabel}>Depth *</Text>
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
              <Text style={styles.inputLabel}>Middle to Back Depth *</Text>
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
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Radius *</Text>
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
              <Text style={styles.inputLabel}>Length *</Text>
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
              <Text style={styles.inputLabel}>Width *</Text>
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
              <Text style={styles.inputLabel}>Fillet *</Text>
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
              <Text style={styles.inputLabel}>Thickness *</Text>
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
              <Text style={styles.inputLabel}>Length *</Text>
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
              <Text style={styles.inputLabel}>Width *</Text>
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
              <Text style={styles.inputLabel}>Radius *</Text>
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
          <Text style={styles.headerTitle}>{venue.name}</Text>
          <Text style={styles.headerSubtitle}>{project.name} • PIC: {venue.pic}</Text>
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
                <Text style={styles.categoryTitle}>{type} ({parts.length})</Text>
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
            <Text style={styles.modalTitle}>Create New Part</Text>
            <TouchableOpacity onPress={() => {
              console.log('Closing create part modal');
              setShowCreatePartModal(false);
            }}>
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
                      newPart.type === type && styles.selectedTypeButton
                    ]}
                    onPress={() => setNewPart(prev => ({
                      ...prev,
                      type: type as PartType,
                      dimensions: {}
                    }))}
                  >
                    <Text style={[
                      styles.typeButtonText,
                      newPart.type === type && styles.selectedTypeButtonText
                    ]}>
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Part Number</Text>
              <View style={styles.autoGeneratedBox}>
                <Text style={styles.autoGeneratedLabel}>Auto-generated:</Text>
                <Text style={styles.autoGeneratedValue}>
                  {nextPartNumber > 0 ? `${{'U shape': 'U', 'Straight': 'S', 'Knob': 'K', 'Button': 'B', 'Push Pad': 'P', 'Cover': 'C', 'X - Special Design': 'X', 'Gadget': 'G'}[newPart.type]}${nextPartNumber}` : 'Loading...'}
                </Text>
              </View>
              <Text style={styles.helperText}>
                Part numbers are assigned automatically across all projects
              </Text>
            </View>
            {renderDimensionInputs()}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Description *</Text>
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
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Designer</Text>
              <TextInput
                style={styles.input}
                value={newPart.designer}
                onChangeText={(text) => setNewPart(prev => ({ ...prev, designer: text }))}
                placeholder="Enter designer name (optional)"
                placeholderTextColor="#6B728080"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>CAD Drawing (Optional)</Text>
              <TouchableOpacity
                style={styles.pictureButton}
                onPress={() => handleSelectCADDrawing(false)}
              >
                <Camera color="#6B7280" size={24} />
                <Text style={styles.pictureButtonText}>Add CAD Drawing</Text>
              </TouchableOpacity>
              {newPart.cadDrawing && (
                <View style={styles.previewContainer}>
                  <Image source={{ uri: newPart.cadDrawing }} style={styles.thumbnailPreview} />
                  <TouchableOpacity
                    style={styles.removePreviewButton}
                    onPress={() => setNewPart(prev => ({ ...prev, cadDrawing: '' }))}
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
                onPress={() => handleSelectPictures(false)}
              >
                <Camera color="#6B7280" size={24} />
                <Text style={styles.pictureButtonText}>Add Pictures</Text>
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
            {similarPart && (
              <View style={styles.similarPartContainer}>
                <View style={styles.similarPartMessageBox}>
                  <Text style={styles.similarPartMessage}>
                    This part has {similarPart.similarity.toFixed(1)}% similarity with {similarPart.part.name}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.useSimilarPartButton}
                  onPress={handleUseSimilarPart}
                >
                  <Text style={styles.useSimilarPartButtonText}>
                    Use {similarPart.part.name}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
            <TouchableOpacity
              style={styles.createButton}
              onPress={handleCreatePart}
            >
              <Text style={styles.createButtonText}>Create Part</Text>
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
              console.log('Closing part detail modal');
              setShowPartDetailModal(false);
              setSelectedPart(null);
            }}>
              <Text style={styles.modalClose}>Close</Text>
            </TouchableOpacity>
          </View>
          {selectedPart && (
            <ScrollView style={styles.modalContent}>
              {/* Pictures Section (Moved to Top) */}
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
              {/* New CAD Drawing Section */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <FileText color="#6B7280" size={20} /> {/* Using FileText icon for CAD, or change to suitable */}
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
              {/* Basic Info Section */}
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
              {/* Dimensions Section */}
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
                        <Text style={styles.dimensionValue}>{value}</Text>
                      </View>
                    )}
                    scrollEnabled={false}
                  />
                </View>
              )}
              {/* Comments Section */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <MessageCircle color="#6B7280" size={20} />
                  <Text style={styles.sectionTitle}>Comments ({selectedPartComments.length})</Text>
                </View>
                {selectedPartComments.length > 0 ? (
                  selectedPartComments.map((comment) => (
                    <View key={comment.id} style={[
                      styles.commentItem,
                      comment.isCompleted && styles.commentItemCompleted
                    ]}>
                      <View style={styles.commentHeader}>
                        <TouchableOpacity
                          style={styles.commentCheckbox}
                          onPress={() => handleToggleCommentCompletion(comment.id)}
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
                          <Text style={styles.commentAuthor}>{comment.author}</Text>
                          <Text style={styles.commentSeparator}>•</Text>
                          <Text style={styles.commentDate}>
                            {new Date(comment.createdAt).toLocaleDateString()} {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
                                    if (selectedPart) {
                                      await loadPartComments(selectedPart.id);
                                    }
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
                                        onPress: async () => {
                                          await deleteComment(comment.id);
                                          if (selectedPart) {
                                            await loadPartComments(selectedPart.id);
                                          }
                                        }
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
                  ))
                ) : (
                  <Text style={styles.noContentText}>No comments yet</Text>
                )}
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
            <TouchableOpacity onPress={() => {
              console.log('Closing edit part modal');
              setShowEditPartModal(false);
              setSelectedPart(null);
            }}>
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
                onChangeText={(text) => setEditingPart(prev => ({ ...prev, description: text }))}
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
                onChangeText={(text) => setEditingPart(prev => ({ ...prev, designer: text }))}
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
                style={styles.actionButton}
                onPress={() => handleModelStatusChange(status)}
              >
                <Text style={styles.actionButtonText}>{status.charAt(0).toUpperCase() + status.slice(1)}</Text>
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
              style={[styles.actionButton, { borderBottomWidth: 0 }]}
              onPress={() => handlePartAction('delete')}
            >
              <Text style={[styles.actionButtonText, { color: '#EF4444' }]}>Delete Part</Text>
            </TouchableOpacity>
          </View>
        </View>
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
});
 