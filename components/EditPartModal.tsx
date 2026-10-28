import React, { useCallback, useMemo } from 'react';
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
import { ButtonSetSelector, FloorPicker } from '@/components/ButtonSetSelector';
import { LiftOptions } from '@/components/LiftOptions';
import { analyzeFloorChange, applyFloorChange } from '@/lib/supabaseHelpers';
import { isButtonSet, getPartFloors } from '@/lib/floorUtils';
import { useColors } from '@/context/ThemeContext';
import type { ThemeColors } from '@/constants/Colors';

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
  globalParts?: Part[];
  onClose: () => void;
  onSave: (part: any) => void;
  onEditingPartChange: (updates: any) => void;
}

export function EditPartModal({
  visible,
  editingPart,
  selectedPart,
  profiles,
  globalParts = [],
  onClose,
  onSave,
  onEditingPartChange,
}: Omit<EditPartModalProps, 'onSyncWithPart'>) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const { requestPermissionsAsync, launchImageLibraryAsync } = usePlatformImagePicker();
  const [showFloorPicker, setShowFloorPicker] = React.useState(false);
  
  React.useEffect(() => {
    if (!visible) setShowFloorPicker(false);
  }, [visible]);

  React.useEffect(() => {
    if (visible) {
      console.log('=== EditPartModal Opened ===');
      console.log('globalParts received:', globalParts?.length || 0);
      console.log('globalParts array:', globalParts);
      console.log('selectedPart:', selectedPart?.name);
      console.log('editingPart.type:', editingPart.type);
    }
  }, [visible]);
  const getFirstUri = (result: unknown): string | null => {
    if (!result) return null;
    if (Array.isArray(result)) {
      const first = result[0] as Record<string, unknown> | undefined;
      const uri = first?.uri;
      return typeof uri === 'string' ? uri : null;
    }
    const uri = (result as Record<string, unknown>).uri;
    return typeof uri === 'string' ? uri : null;
  };

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
    const uri = getFirstUri(result);
    if (uri) {
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
            <ButtonSetSelector
              buttonSet={editingPart.dimensions.buttonSet === true}
              floors={editingPart.dimensions.floors || []}
              onChange={({ buttonSet, floors }) => {
                const { buttonSet: _b, floors: _f, ...rest } = editingPart.dimensions;
                onEditingPartChange({ dimensions: buttonSet ? { ...rest, buttonSet: true, floors } : rest });
              }}
              onOpenPicker={() => setShowFloorPicker(true)}
            />
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
                    onPress={() => {
                      const nextType = editingPart.dimensions.buttonType === type ? undefined : type;
                      const { surface: _s, braille: _br, ...rest } = editingPart.dimensions;
                      onEditingPartChange({
                        dimensions: nextType === 'Lift'
                          ? { ...editingPart.dimensions, buttonType: nextType }
                          : { ...rest, buttonType: nextType },
                      });
                    }}
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
            {editingPart.dimensions.buttonType === 'Lift' && (
              <LiftOptions
                surface={editingPart.dimensions.surface}
                braille={editingPart.dimensions.braille}
                onChange={({ surface, braille }) => {
                  const { surface: _s, braille: _br, ...rest } = editingPart.dimensions;
                  onEditingPartChange({
                    dimensions: { ...rest, ...(surface ? { surface } : {}), ...(braille ? { braille } : {}) },
                  });
                }}
              />
            )}
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

  const handleSave = async () => {
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
    if (editingPart.type === 'Button' && editingPart.dimensions.buttonSet === true && !(editingPart.dimensions.floors || []).length) {
      Alert.alert('Error', 'Please select at least one floor for the button set');
      return;
    }

    if (selectedPart.type !== 'Button') {
      onSave(editingPart);
      return;
    }

    const oldFloors = isButtonSet(selectedPart) ? getPartFloors(selectedPart) : [];
    const newFloors: string[] | null =
      editingPart.type === 'Button' && editingPart.dimensions.buttonSet === true
        ? (editingPart.dimensions.floors as string[])
        : null;
    const floorsChanged =
      oldFloors.length !== (newFloors?.length ?? 0) || oldFloors.some(f => !(newFloors || []).includes(f));

    if (!floorsChanged) {
      onSave(editingPart);
      return;
    }

    try {
      const impact = await analyzeFloorChange(selectedPart.projectId, selectedPart.id, oldFloors, newFloors);
      const finish = async () => {
        try {
          await applyFloorChange(selectedPart.projectId, selectedPart.id, oldFloors, newFloors);
          onSave(editingPart);
        } catch (error) {
          console.error('Error updating floor quantities:', error);
          Alert.alert('Error', 'Failed to update floor quantities');
        }
      };

      const lines: string[] = [];
      if (impact.removedWithQuantity.length > 0) {
        const list = impact.removedWithQuantity.map(r => `Floor ${r.floor} (qty ${r.quantity})`).join(', ');
        lines.push(`${list} ${impact.removedWithQuantity.length === 1 ? 'has' : 'have'} quantity. Unselecting ${impact.removedWithQuantity.length === 1 ? 'it' : 'them'} will permanently delete the existing quantity data.`);
      }
      if (impact.legacyQuantity > 0) {
        lines.push(`This part currently has a total quantity of ${impact.legacyQuantity}. After becoming a button set, quantities are tracked per floor and the existing quantity will be reset to 0.`);
      }

      if (lines.length === 0) {
        await finish();
        return;
      }

      Alert.alert('Confirm Floor Changes', lines.join('\n\n'), [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', style: 'destructive', onPress: finish },
      ]);
    } catch (error) {
      console.error('Error checking floor quantities:', error);
      Alert.alert('Error', 'Failed to check existing floor quantities');
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.editModalContainer}>
        <ScrollView
          style={styles.editModalScroll}
          contentContainerStyle={styles.editModalScrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.editModalIntroCard}>
            <ThemedText style={styles.editModalEyebrow}>Part Settings</ThemedText>
            <ThemedText style={styles.editModalTitle}>Edit Part</ThemedText>
          </View>

          <View style={styles.editModalSectionCard}>
            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Part Type</ThemedText>
              <ThemedText style={styles.typeDisplay}>{getDisplayTypeName(editingPart.type)}</ThemedText>
            </View>
            {selectedPart && (() => {
              const match = selectedPart.name.match(/\d+/);
              const partNum = match ? parseInt(match[0]) : null;
              return partNum ? (
                <View style={styles.inputGroup}>
                  <ThemedText style={styles.inputLabel}>Part Number</ThemedText>
                  <ThemedText style={styles.typeDisplay}>#{partNum}</ThemedText>
                </View>
              ) : null;
            })()}
          </View>

          <View style={styles.editModalSectionCard}>
            {renderEditDimensionInputs()}
          </View>

          <View style={styles.editModalSectionCard}>
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
          </View>

          <View style={styles.editModalSectionCard}>
            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>CAD Drawing (Optional)</ThemedText>
              <TouchableOpacity
                style={styles.editPictureButton}
                onPress={handleSelectCADDrawing}
              >
                <Camera color={colors.textStrong} size={22} />
                <ThemedText style={styles.editPictureButtonText}>Change CAD Drawing</ThemedText>
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
                style={styles.editPictureButton}
                onPress={handleSelectPictures}
              >
                <Camera color={colors.textStrong} size={22} />
                <ThemedText style={styles.editPictureButtonText}>Add Pictures</ThemedText>
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
          </View>

          <View style={styles.editActionRow}>
            <TouchableOpacity
              style={styles.editSecondaryButton}
              onPress={onClose}
            >
              <ThemedText style={styles.editSecondaryButtonText}>Discard</ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.editPrimaryButton}
              onPress={handleSave}
            >
              <ThemedText style={styles.editPrimaryButtonText}>Save Changes</ThemedText>
            </TouchableOpacity>
          </View>
        </ScrollView>
        {showFloorPicker && (
          <FloorPicker
            selected={editingPart.dimensions.floors || []}
            onChange={(floors) => onEditingPartChange({ dimensions: { ...editingPart.dimensions, buttonSet: true, floors } })}
            onClose={() => setShowFloorPicker(false)}
          />
        )}
      </SafeAreaView>


    </Modal>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  editModalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  editModalScroll: {
    flex: 1,
  },
  editModalScrollContent: {
    padding: 16,
    gap: 14,
  },
  editModalIntroCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  editModalEyebrow: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  editModalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  editModalSectionCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
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
    color: colors.primaryText,
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
    color: colors.text,
    marginBottom: 8,
  },
  typeDisplay: {
    fontSize: 14,
    color: colors.textSecondary,
    paddingVertical: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
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
    borderColor: colors.borderStrong,
    borderRadius: 8,
    paddingVertical: 12,
    gap: 8,
  },
  pictureButtonText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  previewList: {
    marginTop: 12,
  },
  editPictureButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 12,
    paddingVertical: 12,
    gap: 8,
    backgroundColor: colors.background,
  },
  editPictureButtonText: {
    fontSize: 14,
    color: colors.textStrong,
    fontWeight: '600',
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
  editActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 2,
    marginBottom: 8,
  },
  editSecondaryButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  editSecondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textStrong,
  },
  editPrimaryButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#0F4FA8',
  },
  editPrimaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
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
    borderColor: colors.borderStrong,
    borderRadius: 8,
    alignItems: 'center',
  },
  selectedShapeButton: {
    borderColor: '#3B82F6',
    backgroundColor: colors.primarySoft,
  },
  shapeButtonText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  selectedShapeButtonText: {
    color: colors.primaryText,
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
    borderColor: colors.borderStrong,
    borderRadius: 8,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectionButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  selectionButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  selectionButtonTextActive: {
    color: '#FFFFFF',
  },
  emptyListContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyListText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  syncListContent: {
    padding: 16,
    gap: 12,
  },
  syncPartItem: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  syncPartContent: {
    gap: 6,
  },
  syncPartHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  syncPartName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  syncPartNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primaryText,
    marginLeft: 8,
  },
  syncPartDetails: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  syncPartDesigner: {
    fontSize: 12,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  similarPartLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  similarPartItem: {
    backgroundColor: colors.primarySoft,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  similarPartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  similarPartName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primaryStrongText,
    flex: 1,
  },
  similarityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 8,
  },
  similarityBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  similarPartDetails: {
    fontSize: 12,
    color: colors.textSecondary,
  },
});
