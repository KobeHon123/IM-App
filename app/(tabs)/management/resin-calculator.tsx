import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, TextInput, Modal, FlatList, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Check } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { useData } from '@/hooks/useData';

const getComponentNames = (material: string) => {
  switch (material) {
    case 'BK':
      return { component1: 'Onyx (BK)', component2: 'Tough74', hasComponent2: true, oil: '111 Oil' };
    case 'Tough White':
      return { component1: 'Nylon Mecha', component2: 'F39', hasComponent2: true, oil: '111 Oil' };
    case 'Transparent':
      return { component1: 'Clear V2', component2: '', hasComponent2: false, oil: '111 Oil' };
    default:
      return { component1: 'Component 1', component2: 'Component 2', hasComponent2: true, oil: '111 Oil' };
  }
};

// BK Material: Onyx (BK) and Tough74
const calculateBK = {
  fromTotal: (total: number, withOil: boolean) => {
    if (withOil) {
      return {
        component1: (total * 72.8) / 100,
        component2: (total * 18.2) / 100,
        oil: (total * 9) / 100,
      };
    } else {
      return {
        component1: (total * 80) / 100,
        component2: (total * 20) / 100,
        oil: undefined,
      };
    }
  },
  fromComponent1: (value: number, withOil: boolean) => {
    if (withOil) {
      const total = (value * 100) / 72.8;
      return {
        component1: value,
        component2: (total * 18.2) / 100,
        oil: (total * 9) / 100,
        total: total,
      };
    } else {
      const total = (value * 100) / 80;
      return {
        component1: value,
        component2: (total * 20) / 100,
        oil: undefined,
        total: total,
      };
    }
  },
  fromComponent2: (value: number, withOil: boolean) => {
    if (withOil) {
      const total = (value * 100) / 18.2;
      return {
        component1: (total * 72.8) / 100,
        component2: value,
        oil: (total * 9) / 100,
        total: total,
      };
    } else {
      const total = (value * 100) / 20;
      return {
        component1: (total * 80) / 100,
        component2: value,
        oil: undefined,
        total: total,
      };
    }
  },
  fromOil: (value: number) => {
    const total = (value * 100) / 9;
    return {
      component1: (total * 72.8) / 100,
      component2: (total * 18.2) / 100,
      oil: value,
      total: total,
    };
  },
};

// Tough White Material: Nylon Mecha and F39
const calculateToughWhite = {
  fromTotal: (total: number, withOil: boolean) => {
    if (withOil) {
      return {
        component1: (total * 63.7) / 100,
        component2: (total * 27.3) / 100,
        oil: (total * 9) / 100,
      };
    } else {
      return {
        component1: (total * 70) / 100,
        component2: (total * 30) / 100,
        oil: undefined,
      };
    }
  },
  fromComponent1: (value: number, withOil: boolean) => {
    if (withOil) {
      const total = (value * 100) / 63.7;
      return {
        component1: value,
        component2: (total * 27.3) / 100,
        oil: (total * 9) / 100,
        total: total,
      };
    } else {
      const total = (value * 100) / 70;
      return {
        component1: value,
        component2: (total * 30) / 100,
        oil: undefined,
        total: total,
      };
    }
  },
  fromComponent2: (value: number, withOil: boolean) => {
    if (withOil) {
      const total = (value * 100) / 27.3;
      return {
        component1: (total * 63.7) / 100,
        component2: value,
        oil: (total * 9) / 100,
        total: total,
      };
    } else {
      const total = (value * 100) / 30;
      return {
        component1: (total * 70) / 100,
        component2: value,
        oil: undefined,
        total: total,
      };
    }
  },
  fromOil: (value: number) => {
    const total = (value * 100) / 9;
    return {
      component1: (total * 63.7) / 100,
      component2: (total * 27.3) / 100,
      oil: value,
      total: total,
    };
  },
};

// Transparent Material: Clear V2 only
const calculateTransparent = {
  fromTotal: (total: number, withOil: boolean) => {
    if (withOil) {
      return {
        component1: (total * 98) / 100,
        component2: undefined,
        oil: (total * 2) / 100,
      };
    } else {
      return {
        component1: total,
        component2: undefined,
        oil: undefined,
      };
    }
  },
  fromComponent1: (value: number, withOil: boolean) => {
    if (withOil) {
      const total = (value * 100) / 98;
      return {
        component1: value,
        component2: undefined,
        oil: (total * 2) / 100,
        total: total,
      };
    } else {
      return {
        component1: value,
        component2: undefined,
        oil: undefined,
        total: value,
      };
    }
  },
  fromOil: (value: number) => {
    const total = (value * 100) / 2;
    return {
      component1: (total * 98) / 100,
      component2: undefined,
      oil: value,
      total: total,
    };
  },
};

const getMaterialCalculator = (material: string) => {
  switch (material) {
    case 'BK':
      return calculateBK;
    case 'Tough White':
      return calculateToughWhite;
    case 'Transparent':
      return calculateTransparent;
    default:
      return calculateBK;
  }
};

export default function ResinRecord() {
  const router = useRouter();
  const { projects } = useData();
  const [selectedMaterial, setSelectedMaterial] = useState('BK');
  const [withOil, setWithOil] = useState(true);
  const [totalGrams, setTotalGrams] = useState('');
  const [onyxGrams, setOnyxGrams] = useState('');
  const [tough74Grams, setTough74Grams] = useState('');
  const [oilGrams, setOilGrams] = useState('');
  const [lastModified, setLastModified] = useState<string | null>(null);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(false);

  const handleTotalChange = (value: string) => {
    setTotalGrams(value);
    setLastModified('total');
    if (value && !isNaN(parseFloat(value))) {
      const total = parseFloat(value);
      const calculator = getMaterialCalculator(selectedMaterial);
      const calc = calculator.fromTotal(total, withOil);
      setOnyxGrams(calc.component1.toFixed(2));
      if (calc.component2) setTough74Grams(calc.component2.toFixed(2));
      if (calc.oil) setOilGrams(calc.oil.toFixed(2));
    } else {
      setOnyxGrams('');
      setTough74Grams('');
      setOilGrams('');
    }
  };

  const handleOnyxChange = (value: string) => {
    setOnyxGrams(value);
    setLastModified('onyx');
    if (value && !isNaN(parseFloat(value))) {
      const component1 = parseFloat(value);
      const calculator = getMaterialCalculator(selectedMaterial);
      const calc = calculator.fromComponent1(component1, withOil);
      setTotalGrams(calc.total.toFixed(2));
      setTough74Grams(calc.component2 ? calc.component2.toFixed(2) : '');
      if (calc.oil) setOilGrams(calc.oil.toFixed(2));
    } else {
      setTotalGrams('');
      setTough74Grams('');
      setOilGrams('');
    }
  };

  const handleTough74Change = (value: string) => {
    setTough74Grams(value);
    setLastModified('tough74');
    if (value && !isNaN(parseFloat(value))) {
      const component2 = parseFloat(value);
      const calculator = getMaterialCalculator(selectedMaterial);
      const calc = calculator.fromComponent2(component2, withOil);
      setTotalGrams(calc.total.toFixed(2));
      setOnyxGrams(calc.component1.toFixed(2));
      if (calc.oil) setOilGrams(calc.oil.toFixed(2));
    } else {
      setTotalGrams('');
      setOnyxGrams('');
      setOilGrams('');
    }
  };

  const handleOilChange = (value: string) => {
    setOilGrams(value);
    setLastModified('oil');
    if (value && !isNaN(parseFloat(value))) {
      const oil = parseFloat(value);
      const calculator = getMaterialCalculator(selectedMaterial);
      const calc = calculator.fromOil(oil);
      setTotalGrams(calc.total.toFixed(2));
      setOnyxGrams(calc.component1.toFixed(2));
      if (calc.component2) setTough74Grams(calc.component2.toFixed(2));
    } else {
      setTotalGrams('');
      setOnyxGrams('');
      setTough74Grams('');
    }
  };

  const handleMaterialChange = (material: string) => {
    setSelectedMaterial(material);
    setLastModified('total');
    // Keep total grams, but recalculate component values with new formula
    setOnyxGrams('');
    setTough74Grams('');
    setOilGrams('');
    // Recalculate with new material formula
    if (totalGrams && !isNaN(parseFloat(totalGrams))) {
      const total = parseFloat(totalGrams);
      const calculator = getMaterialCalculator(material);
      const calc = calculator.fromTotal(total, withOil);
      setOnyxGrams(calc.component1.toFixed(2));
      if (calc.component2) setTough74Grams(calc.component2.toFixed(2));
      if (calc.oil) setOilGrams(calc.oil.toFixed(2));
    }
  };

  const handleOilToggle = (newWithOil: boolean) => {
    setWithOil(newWithOil);
    setLastModified('total');
    // Keep total grams, but recalculate component values with new formula
    if (totalGrams && !isNaN(parseFloat(totalGrams))) {
      const total = parseFloat(totalGrams);
      const calculator = getMaterialCalculator(selectedMaterial);
      const calc = calculator.fromTotal(total, newWithOil);
      setOnyxGrams(calc.component1.toFixed(2));
      if (calc.component2) {
        setTough74Grams(calc.component2.toFixed(2));
      } else {
        setTough74Grams('');
      }
      if (calc.oil) {
        setOilGrams(calc.oil.toFixed(2));
      } else {
        setOilGrams('');
      }
    } else {
      setOnyxGrams('');
      setTough74Grams('');
      setOilGrams('');
    }
  };

  const recalculate = () => {
    if (lastModified === 'total' && totalGrams && !isNaN(parseFloat(totalGrams))) {
      handleTotalChange(totalGrams);
    } else if (lastModified === 'onyx' && onyxGrams && !isNaN(parseFloat(onyxGrams))) {
      handleOnyxChange(onyxGrams);
    } else if (lastModified === 'tough74' && tough74Grams && !isNaN(parseFloat(tough74Grams))) {
      handleTough74Change(tough74Grams);
    } else if (lastModified === 'oil' && oilGrams && !isNaN(parseFloat(oilGrams))) {
      handleOilChange(oilGrams);
    }
  };

  const handleSubmit = async () => {
    if (!totalGrams || parseFloat(totalGrams) === 0) {
      Alert.alert('Error', 'Please enter a total amount before submitting');
      return;
    }
    setLoadingProjects(true);
    try {
      // Use projects from useData hook
      setShowProjectModal(true);
    } catch (error) {
      Alert.alert('Error', 'Failed to load projects');
    } finally {
      setLoadingProjects(false);
    }
  };

  const handleSelectProject = async (projectId: string) => {
    try {
      // Save resin record to database
      const resinData = {
        project_id: projectId,
        material: selectedMaterial,
        with_oil: withOil,
        total_grams: parseFloat(totalGrams),
        component1_grams: parseFloat(onyxGrams) || 0,
        component2_grams: parseFloat(tough74Grams) || 0,
        oil_grams: parseFloat(oilGrams) || 0,
        created_at: new Date().toISOString(),
      };

      // Replace with your actual database call (supabase)
      console.log('Saving resin record:', resinData);

      Alert.alert('Success', 'Resin record saved successfully!', [
        {
          text: 'OK',
          onPress: () => {
            setShowProjectModal(false);
            setTotalGrams('');
            setOnyxGrams('');
            setTough74Grams('');
            setOilGrams('');
          },
        },
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to save resin record');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft color="#2563EB" size={24} />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>Resin Calculator</ThemedText>
          <View style={styles.headerPlaceholder} />
        </View>

        {/* Material Selection Card */}
        <View style={styles.card}>
          <ThemedText style={styles.cardTitle}>Material</ThemedText>
          <View style={styles.segmentedControl}>
            {['BK', 'Tough White', 'Transparent'].map((material) => (
              <TouchableOpacity
                key={material}
                style={[
                  styles.segment,
                  selectedMaterial === material && styles.segmentActive,
                ]}
                onPress={() => handleMaterialChange(material)}
              >
                <ThemedText
                  style={[
                    styles.segmentText,
                    selectedMaterial === material && styles.segmentTextActive,
                  ]}
                >
                  {material}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Oil Toggle Card */}
        <View style={styles.card}>
          <ThemedText style={styles.cardTitle}>With Oil?</ThemedText>
          <View style={styles.segmentedControl}>
            <TouchableOpacity
              style={[styles.segment, withOil && styles.segmentActive]}
              onPress={() => handleOilToggle(true)}
            >
              <ThemedText
                style={[
                  styles.segmentText,
                  withOil && styles.segmentTextActive,
                ]}
              >
                Yes
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.segment, !withOil && styles.segmentActive]}
              onPress={() => handleOilToggle(false)}
            >
              <ThemedText
                style={[
                  styles.segmentText,
                  !withOil && styles.segmentTextActive,
                ]}
              >
                No
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>

        {/* Inputs Card */}
        <View style={styles.card}>
          <ThemedText style={styles.cardTitle}>Quantities</ThemedText>
          
          <View style={styles.inputGroup}>
            <ThemedText style={styles.inputLabel}>Total (grams)</ThemedText>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              placeholderTextColor="#D1D5DB"
              keyboardType="decimal-pad"
              value={totalGrams}
              onChangeText={handleTotalChange}
            />
          </View>

          <View style={styles.inputDivider} />

          <View style={styles.inputGroup}>
            <ThemedText style={styles.inputLabel}>{getComponentNames(selectedMaterial).component1}</ThemedText>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              placeholderTextColor="#D1D5DB"
              keyboardType="decimal-pad"
              value={onyxGrams}
              onChangeText={handleOnyxChange}
            />
          </View>

          {getComponentNames(selectedMaterial).hasComponent2 && (
            <>
              <View style={styles.inputDivider} />
              <View style={styles.inputGroup}>
                <ThemedText style={styles.inputLabel}>{getComponentNames(selectedMaterial).component2}</ThemedText>
                <TextInput
                  style={styles.input}
                  placeholder="0.00"
                  placeholderTextColor="#D1D5DB"
                  keyboardType="decimal-pad"
                  value={tough74Grams}
                  onChangeText={handleTough74Change}
                />
              </View>
            </>
          )}

          {withOil && (
            <>
              <View style={styles.inputDivider} />
              <View style={styles.inputGroup}>
                <ThemedText style={styles.inputLabel}>111 Oil</ThemedText>
                <TextInput
                  style={styles.input}
                  placeholder="0.00"
                  placeholderTextColor="#D1D5DB"
                  keyboardType="decimal-pad"
                  value={oilGrams}
                  onChangeText={handleOilChange}
                />
              </View>
            </>
          )}
        </View>

        {/* Results Card */}
        {(totalGrams || onyxGrams || tough74Grams || oilGrams) && (
          <View style={styles.card}>
            <ThemedText style={styles.cardTitle}>Summary</ThemedText>
            
            <View style={styles.summaryRow}>
              <ThemedText style={styles.summaryLabel}>{getComponentNames(selectedMaterial).component1}</ThemedText>
              <ThemedText style={styles.summaryValue}>{onyxGrams || '0.00'} g</ThemedText>
            </View>

            {getComponentNames(selectedMaterial).hasComponent2 && (
              <View style={styles.summaryRow}>
                <ThemedText style={styles.summaryLabel}>{getComponentNames(selectedMaterial).component2}</ThemedText>
                <ThemedText style={styles.summaryValue}>{tough74Grams || '0.00'} g</ThemedText>
              </View>
            )}

            {withOil && (
              <View style={styles.summaryRow}>
                <ThemedText style={styles.summaryLabel}>111 Oil</ThemedText>
                <ThemedText style={styles.summaryValue}>{oilGrams || '0.00'} g</ThemedText>
              </View>
            )}

            <View style={styles.summaryDivider} />
            <View style={styles.summaryRowTotal}>
              <ThemedText style={styles.summaryLabelTotal}>Total</ThemedText>
              <ThemedText style={styles.summaryValueTotal}>{totalGrams || '0.00'} g</ThemedText>
            </View>
          </View>
        )}

        <View style={styles.spacer} />
      </ScrollView>

      {/* Submit Button */}
      {(totalGrams || onyxGrams || tough74Grams || oilGrams) && (
        <View style={styles.submitButtonContainer}>
          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleSubmit}
          >
            <Check size={20} color="#FFFFFF" />
            <ThemedText style={styles.submitButtonText}>Submit to Project</ThemedText>
          </TouchableOpacity>
        </View>
      )}

      {/* Project Selection Modal */}
      <Modal
        visible={showProjectModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowProjectModal(false)}
      >
        <SafeAreaView style={styles.modalContainer} edges={['top', 'left', 'right']}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowProjectModal(false)}>
              <ThemedText style={styles.modalCloseText}>Cancel</ThemedText>
            </TouchableOpacity>
            <ThemedText style={styles.modalTitle}>Select a Project</ThemedText>
            <View style={styles.modalHeaderPlaceholder} />
          </View>

          <FlatList
            data={projects}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.projectItem}
                onPress={() => handleSelectProject(item.id)}
              >
                <View style={styles.projectContent}>
                  <ThemedText style={styles.projectName}>{item.name}</ThemedText>
                  {item.description && (
                    <ThemedText style={styles.projectDescription}>{item.description}</ThemedText>
                  )}
                </View>
                <View style={styles.projectArrow}>
                  <ThemedText style={styles.projectArrowText}>›</ThemedText>
                </View>
              </TouchableOpacity>
            )}
            contentContainerStyle={styles.projectList}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  headerPlaceholder: {
    width: 40,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  segmentedControl: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 4,
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  segmentActive: {
    backgroundColor: '#2563EB',
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  segmentTextActive: {
    color: '#FFFFFF',
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  inputDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 10,
  },
  summaryRowTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#F0F9FF',
    borderRadius: 8,
    marginTop: 4,
  },
  summaryLabelTotal: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  summaryValueTotal: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2563EB',
  },
  spacer: {
    height: 20,
  },
  submitButtonContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 24,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  submitButton: {
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalCloseText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#EF4444',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  modalHeaderPlaceholder: {
    width: 60,
  },
  projectList: {
    paddingVertical: 8,
  },
  projectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  projectContent: {
    flex: 1,
  },
  projectName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  projectDescription: {
    fontSize: 13,
    fontWeight: '400',
    color: '#6B7280',
  },
  projectArrow: {
    paddingLeft: 12,
  },
  projectArrowText: {
    fontSize: 24,
    color: '#9CA3AF',
  },
});
