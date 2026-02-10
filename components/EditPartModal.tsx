import React, { useCallback } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Camera, X } from 'lucide-react-native';
import { usePlatformImagePicker } from '@/hooks/usePlatformImagePicker';
import { DesignerSelector } from '@/components/DesignerSelector';
import { Part, PartType, Profile } from '@/types';
import { ThemedText } from '@/components/ThemedText';

interface EditPartModalProps {
  visible: boolean;
  editingPart: {
    type: PartType;
    description: string;
    pictures: string[];
    cadDrawing: string;
    dimensions: Record<string, any>;
    designer: string;
  };
  selectedPart: Part | null;
  profiles: Profile[];
  onClose: () => void;
  onSave: (part: any) => void;
  onEditingPartChange: (updates: any) => void;
}

export function EditPartModal({
  visible,
  editingPart,
  selectedPart,
  profiles,
  onClose,
  onSave,
  onEditingPartChange,
}: EditPartModalProps) {
  const { requestPermissionsAsync, launchImageLibraryAsync } = usePlatformImagePicker();
  const handleEditDimensionChange = useCallback((fieldName: string, text: string) => {
    // For edgeType, allow string values (Seal, Cut)
    if (fieldName === 'edgeType') {
      onEditingPartChange({
        dimensions: { ...editingPart.dimensions, [fieldName]: text }
      });
      return;
    }
    // Allow only numbers and one decimal point for numeric fields
    const validText = text.replace(/[^0-9.]/g, '');
    // Ensure only one decimal place
    const parts = validText.split('.');
    let formattedText = parts[0];
    if (parts.length > 1) {
      formattedText += '.' + parts[1].substring(0, 1);
    }
    onEditingPartChange({
      dimensions: { ...editingPart.dimensions, [fieldName]: formattedText }
    });
  }, [editingPart.dimensions, onEditingPartChange]);

  const handleSelectCADDrawing = async () => {
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
      onEditingPartChange({ cadDrawing: uri });
    }
  };

  const handleSelectPictures = async () => {
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
      // Handle both single result and array of results
      const uris = Array.isArray(result) ? result.map(r => r.uri) : [result.uri];
      console.log('Selected pictures:', uris);
      onEditingPartChange({
        pictures: [...(editingPart.pictures || []), ...uris].slice(0, 6)
      });
    }
  };

  const handleRemovePicture = (uri: string) => {
    onEditingPartChange({
      pictures: editingPart.pictures.filter((p: string) => p !== uri)
    });
  };

  const getRequiredFields = (type: PartType): string[] => {
    switch (type) {
      case 'U shape':
        return ['length', 'Diameter', 'depth', 'oFillet'];
      case 'Straight':
        return ['length', 'Diameter'];
      case 'Knob':
        return ['frontDiameter', 'middleDiameter', 'backDiameter', 'depth', 'middleToBackDepth'];
      case 'Button':
        return ['buttonType'];
      case 'Push Pad':
        return [];
      default:
        return [];
    }
  };

  const getDisplayTypeName = (type: PartType | string): string => {
    switch (type) {
      case 'U shape':
        return 'U/Curved shape';
      case 'X - Special Design':
        return 'X - Special Handle';
      case 'Push Pad':
        return 'Push Plate';
      default:
        return type;
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
              <ThemedText style={styles.inputLabel}>Diameter *</ThemedText>
              <TextInput
                style={styles.input}
                value={editingPart.dimensions['Diameter'] || ''}
                onChangeText={(text) => handleEditDimensionChange('Diameter', text)}
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
              <ThemedText style={styles.inputLabel}>I Fillet</ThemedText>
              <TextInput
                style={styles.input}
                value={editingPart.dimensions['iFillet'] || ''}
                onChangeText={(text) => handleEditDimensionChange('iFillet', text)}
                placeholder="mm"
                placeholderTextColor="#6B728080"
                keyboardType="decimal-pad"
              />
            </View>
            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Edge Type</ThemedText>
              <View style={styles.selectionContainer}>
                {['Seal', 'Cut'].map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.selectionButton,
                      editingPart.dimensions['edgeType'] === option && styles.selectionButtonActive
                    ]}
                    onPress={() => handleEditDimensionChange('edgeType', option)}
                  >
                    <ThemedText
                      style={[
                        styles.selectionButtonText,
                        editingPart.dimensions['edgeType'] === option && styles.selectionButtonTextActive
                      ]}
                    >
                      {option}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
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
              <ThemedText style={styles.inputLabel}>Diameter *</ThemedText>
              <TextInput
                style={styles.input}
                value={editingPart.dimensions['Diameter'] || ''}
                onChangeText={(text) => handleEditDimensionChange('Diameter', text)}
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
              <ThemedText style={styles.inputLabel}>Front Diameter *</ThemedText>
              <TextInput
                style={styles.input}
                value={editingPart.dimensions['frontDiameter'] || ''}
                onChangeText={(text) => handleEditDimensionChange('frontDiameter', text)}
                placeholder="mm"
                placeholderTextColor="#6B728080"
                keyboardType="decimal-pad"
              />
            </View>
            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Middle Diameter *</ThemedText>
              <TextInput
                style={styles.input}
                value={editingPart.dimensions['middleDiameter'] || ''}
                onChangeText={(text) => handleEditDimensionChange('middleDiameter', text)}
                placeholder="mm"
                placeholderTextColor="#6B728080"
                keyboardType="decimal-pad"
              />
            </View>
            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Back Diameter *</ThemedText>
              <TextInput
                style={styles.input}
                value={editingPart.dimensions['backDiameter'] || ''}
                onChangeText={(text) => handleEditDimensionChange('backDiameter', text)}
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
              <ThemedText style={styles.inputLabel}>Button Type *</ThemedText>
              <View style={styles.buttonShapeContainer}>
                {['Lift', 'Toilet', 'Switch'].map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.shapeButton,
                      editingPart.dimensions.buttonType === type && styles.selectedShapeButton
                    ]}
                    onPress={() => onEditingPartChange({
                      dimensions: { ...editingPart.dimensions, buttonType: editingPart.dimensions.buttonType === type ? undefined : type }
                    })}
                  >
                    <ThemedText style={[
                      styles.shapeButtonText,
                      editingPart.dimensions.buttonType === type && styles.selectedShapeButtonText
                    ]}>
                      {type}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Shape</ThemedText>
              <View style={styles.buttonShapeContainer}>
                {['Circle', 'Rectangular', 'Slot'].map((shape) => (
                  <TouchableOpacity
                    key={shape}
                    style={[
                      styles.shapeButton,
                      editingPart.dimensions.shape === shape && styles.selectedShapeButton
                    ]}
                    onPress={() => onEditingPartChange({
                      dimensions: { ...editingPart.dimensions, shape: editingPart.dimensions.shape === shape ? undefined : shape }
                    })}
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
              <ThemedText style={styles.inputLabel}>Diameter</ThemedText>
              <TextInput
                style={styles.input}
                value={editingPart.dimensions['Diameter'] || ''}
                onChangeText={(text) => handleEditDimensionChange('Diameter', text)}
                placeholder="mm"
                placeholderTextColor="#6B728080"
                keyboardType="decimal-pad"
              />
            </View>
            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Length</ThemedText>
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
              <ThemedText style={styles.inputLabel}>Width</ThemedText>
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
              <ThemedText style={styles.inputLabel}>Fillet</ThemedText>
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
              <ThemedText style={styles.inputLabel}>Thickness</ThemedText>
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
              <ThemedText style={styles.inputLabel}>Diameter *</ThemedText>
              <TextInput
                style={styles.input}
                value={editingPart.dimensions['Diameter'] || ''}
                onChangeText={(text) => handleEditDimensionChange('Diameter', text)}
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

  const handleSave = () => {
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
    onSave(editingPart);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <ThemedText style={styles.modalTitle}>Edit Part</ThemedText>
          <TouchableOpacity onPress={onClose}>
            <ThemedText style={styles.modalClose}>Cancel</ThemedText>
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.modalContent}>
          <View style={styles.inputGroup}>
            <ThemedText style={styles.inputLabel}>Part Type</ThemedText>
            <ThemedText style={styles.typeDisplay}>{getDisplayTypeName(editingPart.type)}</ThemedText>
          </View>
          {renderEditDimensionInputs()}
          <View style={styles.inputGroup}>
            <ThemedText style={styles.inputLabel}>Description *</ThemedText>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={editingPart.description}
              onChangeText={(text) => onEditingPartChange({ description: text })}
              placeholder="Enter part description"
              placeholderTextColor="#6B728080"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
          <View style={styles.inputGroup}>
            <ThemedText style={styles.inputLabel}>Designer</ThemedText>
            <DesignerSelector
              value={editingPart.designer}
              onChangeText={(text) => onEditingPartChange({ designer: text })}
              profiles={profiles}
              placeholder="Enter designer name (optional)"
              placeholderTextColor="#6B728080"
              inputStyle={styles.input}
            />
          </View>
          <View style={styles.inputGroup}>
            <ThemedText style={styles.inputLabel}>CAD Drawing (Optional)</ThemedText>
            <TouchableOpacity
              style={styles.pictureButton}
              onPress={handleSelectCADDrawing}
            >
              <Camera color="#6B7280" size={24} />
              <ThemedText style={styles.pictureButtonText}>Change CAD Drawing</ThemedText>
            </TouchableOpacity>
            {editingPart.cadDrawing && (
              <View style={styles.previewContainer}>
                <Image key={editingPart.cadDrawing} source={{ uri: editingPart.cadDrawing }} style={styles.thumbnailPreview} />
                <TouchableOpacity
                  style={styles.removePreviewButton}
                  onPress={() => onEditingPartChange({ cadDrawing: '' })}
                >
                  <X color="#FFFFFF" size={16} />
                </TouchableOpacity>
              </View>
            )}
          </View>
          <View style={styles.inputGroup}>
            <ThemedText style={styles.inputLabel}>Pictures (1-6)</ThemedText>
            <TouchableOpacity
              style={styles.pictureButton}
              onPress={handleSelectPictures}
            >
              <Camera color="#6B7280" size={24} />
              <ThemedText style={styles.pictureButtonText}>Add Pictures</ThemedText>
            </TouchableOpacity>
            <FlatList
              data={editingPart.pictures}
              keyExtractor={(item) => item}
              horizontal
              style={styles.previewList}
              renderItem={({ item }) => (
                <View style={styles.previewContainer}>
                  <Image key={item} source={{ uri: item }} style={styles.thumbnailPreview} />
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
            onPress={handleSave}
          >
            <ThemedText style={styles.createButtonText}>Save Changes</ThemedText>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
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
    color: '#3B82F6',
    fontWeight: '500',
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
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  typeDisplay: {
    fontSize: 14,
    color: '#6B7280',
    paddingVertical: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
  },
  textArea: {
    paddingVertical: 12,
    minHeight: 100,
  },
  pictureButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingVertical: 12,
    gap: 8,
  },
  pictureButtonText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  previewList: {
    marginTop: 12,
  },
  previewContainer: {
    marginRight: 12,
    marginTop: 12,
    position: 'relative',
  },
  thumbnailPreview: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  removePreviewButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    padding: 4,
  },
  createButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 20,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonShapeContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  shapeButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    alignItems: 'center',
  },
  selectedShapeButton: {
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
  },
  shapeButtonText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  selectedShapeButtonText: {
    color: '#3B82F6',
  },
  selectionContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  selectionButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectionButtonActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  selectionButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  selectionButtonTextActive: {
    color: '#FFFFFF',
  },
});
