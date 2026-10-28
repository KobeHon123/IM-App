import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronRight } from 'lucide-react-native';
import { ThemedText } from '@/components/ThemedText';
import { STANDARD_FLOORS, normalizeFloorInput, sortFloors } from '@/lib/floorUtils';

interface ButtonSetSelectorProps {
  buttonSet: boolean;
  floors: string[];
  disabled?: boolean;
  onChange: (next: { buttonSet: boolean; floors: string[] }) => void;
  onOpenPicker: () => void;
}

export function ButtonSetSelector({ buttonSet, floors, disabled, onChange, onOpenPicker }: ButtonSetSelectorProps) {
  const sorted = sortFloors(floors);
  return (
    <View style={styles.inputGroup}>
      <ThemedText style={styles.inputLabel}>Button Set *</ThemedText>
      <View style={styles.row}>
        {[true, false].map((value) => (
          <TouchableOpacity
            key={value ? 'yes' : 'no'}
            style={[
              styles.optionButton,
              buttonSet === value && styles.optionButtonSelected,
              disabled && styles.optionButtonDisabled,
            ]}
            onPress={() => !disabled && onChange({ buttonSet: value, floors: value ? floors : [] })}
            disabled={disabled}
          >
            <ThemedText style={[styles.optionText, buttonSet === value && styles.optionTextSelected]}>
              {value ? 'Yes' : 'No'}
            </ThemedText>
          </TouchableOpacity>
        ))}
      </View>
      {buttonSet && (
        <TouchableOpacity
          style={[styles.floorBox, disabled && styles.optionButtonDisabled]}
          onPress={onOpenPicker}
          disabled={disabled}
          activeOpacity={0.7}
        >
          <View style={styles.floorBoxContent}>
            <ThemedText style={styles.floorBoxLabel}>Select floor</ThemedText>
            <ThemedText style={styles.floorBoxValue} numberOfLines={2}>
              {sorted.length > 0 ? `${sorted.length} selected: ${sorted.join(', ')}` : 'Tap to select floors'}
            </ThemedText>
          </View>
          {!disabled && <ChevronRight color="#6B7280" size={20} />}
        </TouchableOpacity>
      )}
    </View>
  );
}

interface FloorPickerProps {
  selected: string[];
  onChange: (floors: string[]) => void;
  onClose: () => void;
}

export function FloorPicker({ selected, onChange, onClose }: FloorPickerProps) {
  const [customInput, setCustomInput] = useState('');
  const selectedSet = new Set(selected);
  const standardSet = new Set(STANDARD_FLOORS);
  const customSelected = sortFloors(selected.filter(f => !standardSet.has(f)));

  const toggle = (floor: string) => {
    onChange(sortFloors(selectedSet.has(floor) ? selected.filter(f => f !== floor) : [...selected, floor]));
  };

  const addCustom = () => {
    const floor = normalizeFloorInput(customInput);
    if (!floor) return;
    if (!selectedSet.has(floor)) onChange(sortFloors([...selected, floor]));
    setCustomInput('');
  };

  const rows: string[][] = [];
  for (let i = 0; i < STANDARD_FLOORS.length; i += 10) {
    rows.push(STANDARD_FLOORS.slice(i, i + 10));
  }

  return (
    <View style={styles.overlay}>
      <SafeAreaView style={styles.pickerContainer}>
        <View style={styles.pickerHeader}>
          <ThemedText style={styles.pickerTitle}>Select Floor</ThemedText>
          <TouchableOpacity onPress={onClose}>
            <ThemedText style={styles.pickerDone}>Done</ThemedText>
          </TouchableOpacity>
        </View>
        <View style={styles.pickerInfo}>
          <ThemedText style={styles.pickerInfoText}>
            {selected.length} floor{selected.length === 1 ? '' : 's'} selected
          </ThemedText>
          <ThemedText style={styles.pickerInfoSub}>
            Tap a floor to select or unselect. Use the box below for floors not shown in the matrix.
          </ThemedText>
        </View>
        <View style={styles.customRow}>
          <TextInput
            style={styles.customInput}
            value={customInput}
            onChangeText={setCustomInput}
            placeholder="Other floor (e.g. B1, M, RF)"
            placeholderTextColor="#6B728080"
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={8}
            returnKeyType="done"
            onSubmitEditing={addCustom}
          />
          <TouchableOpacity
            style={[styles.addButton, !normalizeFloorInput(customInput) && styles.addButtonDisabled]}
            onPress={addCustom}
            disabled={!normalizeFloorInput(customInput)}
          >
            <ThemedText style={styles.addButtonText}>Add</ThemedText>
          </TouchableOpacity>
        </View>
        {customSelected.length > 0 && (
          <View style={styles.chipRow}>
            {customSelected.map((floor) => (
              <TouchableOpacity key={floor} style={styles.chip} onPress={() => toggle(floor)}>
                <ThemedText style={styles.chipText}>{floor}  ✕</ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        )}
        <View style={styles.matrix}>
          {rows.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.matrixRow}>
              {row.map((floor) => {
                const isSelected = selectedSet.has(floor);
                return (
                  <TouchableOpacity
                    key={floor}
                    style={[styles.cell, isSelected && styles.cellSelected]}
                    onPress={() => toggle(floor)}
                  >
                    <ThemedText style={[styles.cellText, isSelected && styles.cellTextSelected]}>{floor}</ThemedText>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  inputGroup: { marginBottom: 20 },
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 8 },
  row: { flexDirection: 'row', gap: 8 },
  optionButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
  },
  optionButtonSelected: { backgroundColor: '#3B82F6', borderColor: '#3B82F6' },
  optionButtonDisabled: { opacity: 0.5 },
  optionText: { fontSize: 14, fontWeight: '500', color: '#374151' },
  optionTextSelected: { color: '#FFFFFF' },
  floorBox: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#F9FAFB',
  },
  floorBoxContent: { flex: 1 },
  floorBoxLabel: { fontSize: 12, color: '#6B7280', marginBottom: 2 },
  floorBoxValue: { fontSize: 14, fontWeight: '600', color: '#111827' },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    zIndex: 1000,
  },
  pickerContainer: { flex: 1, backgroundColor: '#FFFFFF' },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  pickerTitle: { fontSize: 18, fontWeight: '600', color: '#111827' },
  pickerDone: { fontSize: 16, color: '#3B82F6', fontWeight: '600' },
  pickerInfo: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#F3F4F6',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  pickerInfoText: { fontSize: 16, fontWeight: '600', color: '#111827' },
  pickerInfoSub: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  customRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingTop: 12 },
  customInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
  },
  addButton: {
    paddingHorizontal: 18,
    borderRadius: 8,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
  },
  addButtonDisabled: { opacity: 0.4 },
  addButtonText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 12, paddingTop: 10 },
  chip: { backgroundColor: '#DBEAFE', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5 },
  chipText: { color: '#1D4ED8', fontSize: 13, fontWeight: '600' },
  matrix: { paddingHorizontal: 8, paddingTop: 12 },
  matrixRow: { flexDirection: 'row' },
  cell: {
    flex: 1,
    aspectRatio: 1,
    margin: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 6,
  },
  cellSelected: { backgroundColor: '#3B82F6', borderColor: '#2563EB' },
  cellText: { fontSize: 12, fontWeight: '500', color: '#111827' },
  cellTextSelected: { color: '#FFFFFF', fontWeight: '700' },
});
