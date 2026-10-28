import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { ChevronDown, Minus, Plus } from 'lucide-react-native';
import { ThemedText } from '@/components/ThemedText';

interface ButtonSetFloorsProps {
  floors: string[];
  getQuantity: (floor: string) => number;
  countingMode: boolean;
  onQuantityChange: (floor: string, quantity: number) => void;
}

export function ButtonSetFloors({ floors, getQuantity, countingMode, onQuantityChange }: ButtonSetFloorsProps) {
  const [expanded, setExpanded] = useState(false);
  const [editingFloor, setEditingFloor] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState('');

  const commitEdit = () => {
    if (editingFloor) {
      onQuantityChange(editingFloor, Math.max(0, parseInt(tempValue, 10) || 0));
    }
    setEditingFloor(null);
  };

  return (
    <View>
      <View style={styles.divider} />
      <TouchableOpacity style={styles.header} onPress={() => setExpanded(prev => !prev)} activeOpacity={0.7}>
        <ThemedText style={styles.headerText}>
          {floors.length} floor{floors.length === 1 ? '' : 's'}
        </ThemedText>
        <ChevronDown
          size={20}
          color="#6B7280"
          style={expanded ? styles.chevronRotated : undefined}
        />
      </TouchableOpacity>
      {expanded && (
        <View style={styles.list}>
          {floors.map((floor) => {
            const quantity = getQuantity(floor);
            return (
              <View key={floor} style={styles.row}>
                <ThemedText style={styles.floorLabel}>Floor {floor}</ThemedText>
                {countingMode ? (
                  <View style={styles.counter}>
                    <TouchableOpacity
                      style={[styles.countButton, styles.minus]}
                      onPress={() => onQuantityChange(floor, Math.max(0, quantity - 1))}
                    >
                      <Minus color="#EF4444" size={18} strokeWidth={2.5} />
                    </TouchableOpacity>
                    {editingFloor === floor ? (
                      <TextInput
                        style={styles.countInput}
                        value={tempValue}
                        onChangeText={setTempValue}
                        onBlur={commitEdit}
                        onSubmitEditing={commitEdit}
                        keyboardType="numeric"
                        selectTextOnFocus
                        autoFocus
                      />
                    ) : (
                      <TouchableOpacity
                        style={styles.countDisplay}
                        onPress={() => {
                          setTempValue(String(quantity));
                          setEditingFloor(floor);
                        }}
                      >
                        <ThemedText style={styles.countValue}>{quantity}</ThemedText>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={[styles.countButton, styles.plus]}
                      onPress={() => onQuantityChange(floor, quantity + 1)}
                    >
                      <Plus color="#3B82F6" size={18} strokeWidth={2.5} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <ThemedText style={styles.qtyValue}>{quantity}</ThemedText>
                )}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  divider: { height: 1, backgroundColor: '#F3F4F6', marginHorizontal: 12 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  headerText: { fontSize: 13, fontWeight: '500', color: '#6B7280' },
  chevronRotated: { transform: [{ rotate: '180deg' }] },
  list: { paddingHorizontal: 12, paddingBottom: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    minHeight: 40,
  },
  floorLabel: { fontSize: 13, fontWeight: '500', color: '#6B7280' },
  qtyValue: { fontSize: 14, fontWeight: '600', color: '#111827' },
  counter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  countButton: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
  minus: { backgroundColor: '#FEE2E2' },
  plus: { backgroundColor: '#DBEAFE' },
  countDisplay: { minWidth: 40, alignItems: 'center' },
  countValue: { fontSize: 16, fontWeight: '700', color: '#111827' },
  countInput: {
    minWidth: 50,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    borderBottomWidth: 1,
    borderBottomColor: '#3B82F6',
    paddingVertical: 2,
  },
});
