import React, { useState, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { ChevronDown, Minus, Plus } from 'lucide-react-native';
import { ThemedText } from '@/components/ThemedText';
import { useColors } from '@/context/ThemeContext';
import type { ThemeColors } from '@/constants/Colors';

interface ButtonSetFloorsProps {
  floors: string[];
  getQuantity: (floor: string) => number;
  countingMode: boolean;
  onQuantitySet: (floor: string, quantity: number) => void;
  onQuantityDelta: (floor: string, delta: number) => void;
  onBulkDelta: (delta: number) => void;
}

export function ButtonSetFloors({ floors, getQuantity, countingMode, onQuantitySet, onQuantityDelta, onBulkDelta }: ButtonSetFloorsProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [expanded, setExpanded] = useState(false);
  const [editingFloor, setEditingFloor] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState('');

  const commitEdit = () => {
    if (editingFloor) {
      onQuantitySet(editingFloor, Math.max(0, parseInt(tempValue, 10) || 0));
    }
    setEditingFloor(null);
  };

  return (
    <View>
      <View style={styles.divider} />
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerToggle}
          onPress={() => setExpanded(prev => !prev)}
          activeOpacity={0.7}
        >
          <ThemedText style={styles.headerText}>
            {floors.length} floor{floors.length === 1 ? '' : 's'}
          </ThemedText>
          <ChevronDown
            size={20}
            color={colors.textSecondary}
            style={expanded ? styles.chevronRotated : undefined}
          />
        </TouchableOpacity>

        {countingMode && (
          <View style={styles.bulkControls}>
            <TouchableOpacity
              style={[styles.bulkButton, styles.bulkMinus]}
              onPress={() => onBulkDelta(-1)}
            >
              <Minus color={colors.danger} size={16} strokeWidth={2.5} />
            </TouchableOpacity>
            <ThemedText style={styles.bulkLabel}>All</ThemedText>
            <TouchableOpacity
              style={[styles.bulkButton, styles.bulkPlus]}
              onPress={() => onBulkDelta(1)}
            >
              <Plus color={colors.primaryText} size={16} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
        )}
      </View>

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
                      onPress={() => onQuantityDelta(floor, -1)}
                    >
                      <Minus color={colors.danger} size={18} strokeWidth={2.5} />
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
                      onPress={() => onQuantityDelta(floor, 1)}
                    >
                      <Plus color={colors.primaryText} size={18} strokeWidth={2.5} />
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

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  divider: { height: 1, backgroundColor: colors.surfaceMuted, marginHorizontal: 12 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  headerToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerText: { fontSize: 13, fontWeight: '500', color: colors.textSecondary },
  chevronRotated: { transform: [{ rotate: '180deg' }] },
  bulkControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bulkButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bulkMinus: { backgroundColor: colors.dangerSoft },
  bulkPlus: { backgroundColor: colors.primaryMuted },
  bulkLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.4,
  },
  list: { paddingHorizontal: 12, paddingBottom: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    minHeight: 40,
  },
  floorLabel: { fontSize: 13, fontWeight: '500', color: colors.textSecondary },
  qtyValue: { fontSize: 14, fontWeight: '600', color: colors.text },
  counter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  countButton: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
  minus: { backgroundColor: colors.dangerSoft },
  plus: { backgroundColor: colors.primaryMuted },
  countDisplay: { minWidth: 40, alignItems: 'center' },
  countValue: { fontSize: 16, fontWeight: '700', color: colors.text },
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
