import React, { useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Camera, ChevronDown, X } from 'lucide-react-native';
import { ThemedText } from '@/components/ThemedText';
import { usePlatformImagePicker } from '@/hooks/usePlatformImagePicker';
import { useColors } from '@/context/ThemeContext';
import type { ThemeColors } from '@/constants/Colors';

export interface QuickTestRequestValues {
  materialInfo: string;
  vendor: string;
  testingSurface: string;
  sampleQuantity: string;
  sampleDimensions: string;
  antimicrobialInfo: string;
  finalApplication: string;
  projectId: string | null;
  pictureUri: string | null;
}

interface QuickTestRequestFormProps {
  visible: boolean;
  projects: { id: string; name: string }[];
  submitting: boolean;
  onClose: () => void;
  onSubmit: (values: QuickTestRequestValues) => void;
}

const EMPTY: QuickTestRequestValues = {
  materialInfo: '',
  vendor: '',
  testingSurface: '',
  sampleQuantity: '',
  sampleDimensions: '',
  antimicrobialInfo: '',
  finalApplication: '',
  projectId: null,
  pictureUri: null,
};

const FIELDS: {
  key: Exclude<keyof QuickTestRequestValues, 'projectId' | 'pictureUri'>;
  label: string;
  hint: string;
  placeholder: string;
  multiline?: boolean;
}[] = [
  {
    key: 'materialInfo',
    label: 'Detailed material information',
    hint: 'e.g., 3D-printed (resin names) plastics, PP, HDPE, EVA, LDPE film, silicone leather, PU leather, polyester insole fabric, cotton bedsheet fabric, painted or coated wood, synthetic quartz stones …etc.',
    placeholder: 'Enter material details',
    multiline: true,
  },
  {
    key: 'vendor',
    label: 'Vendor or manufacturer',
    hint: '',
    placeholder: 'Enter vendor or manufacturer',
  },
  {
    key: 'testingSurface',
    label: 'Testing surface',
    hint: 'e.g., both sides available, the sides without cross marks, the sides without numbers, the fabric face side with arrow mark, the coated leather side, face or back sides, … etc.',
    placeholder: 'Enter testing surface',
    multiline: true,
  },
  {
    key: 'sampleQuantity',
    label: 'Number of samples',
    hint: 'Please give accurate quantity and unit.',
    placeholder: 'e.g., 12 pieces',
  },
  {
    key: 'sampleDimensions',
    label: 'Dimensions of samples',
    hint: 'Length × width, mm or cm.',
    placeholder: 'e.g., 50 × 50 mm',
  },
  {
    key: 'antimicrobialInfo',
    label: 'Antimicrobial chemical form and application %',
    hint: 'e.g., IMUPlus-X3 coarse powder (3.5% w/w), IMUPlus-X5(W) Solution without binder (150 g/L), PNP4-11 (9% w/v), … etc.',
    placeholder: 'Enter antimicrobial chemical form and application %',
    multiline: true,
  },
  {
    key: 'finalApplication',
    label: 'Final application of the samples',
    hint: 'e.g., QC, factory trial sample pieces, factory trial “colour chips”, internal R&D samples, shoes making, chair leather, building materials, medical devices, …etc.',
    placeholder: 'Enter final application',
    multiline: true,
  },
];

export function QuickTestRequestForm({ visible, projects, submitting, onClose, onSubmit }: QuickTestRequestFormProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { requestPermissionsAsync, launchImageLibraryAsync } = usePlatformImagePicker();

  const [values, setValues] = useState<QuickTestRequestValues>(EMPTY);
  const [showProjects, setShowProjects] = useState(false);

  React.useEffect(() => {
    if (visible) {
      setValues(EMPTY);
      setShowProjects(false);
    }
  }, [visible]);

  const setField = <K extends keyof QuickTestRequestValues>(key: K, value: QuickTestRequestValues[K]) => {
    setValues(prev => ({ ...prev, [key]: value }));
  };

  const handlePickPicture = async () => {
    const hasPermission = await requestPermissionsAsync();
    if (!hasPermission) {
      Alert.alert('Permission Denied', 'We need access to your gallery to select a picture.');
      return;
    }
    const result = await launchImageLibraryAsync({
      mediaTypes: 'Images',
      allowsMultipleSelection: false,
      quality: 0.8,
    });
    const picked = Array.isArray(result) ? result[0] : result;
    if (picked?.uri) setField('pictureUri', picked.uri);
  };

  const handleSubmit = () => {
    const missing = FIELDS.filter(f => !values[f.key].trim()).map(f => f.label);
    if (missing.length > 0) {
      Alert.alert('Missing Information', `Please fill in:\n• ${missing.join('\n• ')}`);
      return;
    }
    onSubmit({
      ...values,
      materialInfo: values.materialInfo.trim(),
      vendor: values.vendor.trim(),
      testingSurface: values.testingSurface.trim(),
      sampleQuantity: values.sampleQuantity.trim(),
      sampleDimensions: values.sampleDimensions.trim(),
      antimicrobialInfo: values.antimicrobialInfo.trim(),
      finalApplication: values.finalApplication.trim(),
    });
  };

  const selectedProject = projects.find(p => p.id === values.projectId);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} disabled={submitting}>
            <ThemedText style={styles.headerCancel}>Cancel</ThemedText>
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>New Test Request</ThemedText>
          <View style={styles.headerSpacer} />
        </View>

        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.card}>
              {FIELDS.map(field => (
                <View key={field.key} style={styles.inputGroup}>
                  <ThemedText style={styles.label}>{field.label} *</ThemedText>
                  {field.hint ? <ThemedText style={styles.hint}>{field.hint}</ThemedText> : null}
                  <TextInput
                    style={[styles.input, field.multiline && styles.inputMultiline]}
                    value={values[field.key]}
                    onChangeText={text => setField(field.key, text)}
                    placeholder={field.placeholder}
                    placeholderTextColor={colors.textMuted}
                    multiline={field.multiline}
                    textAlignVertical={field.multiline ? 'top' : 'center'}
                    editable={!submitting}
                  />
                </View>
              ))}
            </View>

            <View style={styles.card}>
              <View style={styles.inputGroup}>
                <ThemedText style={styles.label}>Project (optional)</ThemedText>
                <TouchableOpacity
                  style={styles.selectBox}
                  onPress={() => setShowProjects(prev => !prev)}
                  disabled={submitting}
                >
                  <ThemedText style={selectedProject ? styles.selectValue : styles.selectPlaceholder}>
                    {selectedProject ? selectedProject.name : 'Select a project'}
                  </ThemedText>
                  <ChevronDown color={colors.textSecondary} size={20} />
                </TouchableOpacity>
                {showProjects && (
                  <View style={styles.projectList}>
                    <TouchableOpacity
                      style={styles.projectItem}
                      onPress={() => {
                        setField('projectId', null);
                        setShowProjects(false);
                      }}
                    >
                      <ThemedText style={styles.projectItemMuted}>No project</ThemedText>
                    </TouchableOpacity>
                    {projects.map(project => (
                      <TouchableOpacity
                        key={project.id}
                        style={[styles.projectItem, values.projectId === project.id && styles.projectItemActive]}
                        onPress={() => {
                          setField('projectId', project.id);
                          setShowProjects(false);
                        }}
                      >
                        <ThemedText
                          style={[styles.projectItemText, values.projectId === project.id && styles.projectItemTextActive]}
                        >
                          {project.name}
                        </ThemedText>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              <View style={styles.inputGroup}>
                <ThemedText style={styles.label}>Sample picture (optional)</ThemedText>
                <TouchableOpacity style={styles.pictureButton} onPress={handlePickPicture} disabled={submitting}>
                  <Camera color={colors.textStrong} size={22} />
                  <ThemedText style={styles.pictureButtonText}>
                    {values.pictureUri ? 'Change Picture' : 'Add Picture'}
                  </ThemedText>
                </TouchableOpacity>
                {values.pictureUri && (
                  <View style={styles.previewContainer}>
                    <Image source={{ uri: values.pictureUri }} style={styles.preview} />
                    <TouchableOpacity style={styles.removePreview} onPress={() => setField('pictureUri', null)}>
                      <X color="#FFFFFF" size={16} />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>

            <TouchableOpacity
              style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <ThemedText style={styles.submitButtonText}>Submit Request</ThemedText>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    flex: { flex: 1 },
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 14,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerCancel: { fontSize: 16, color: colors.primaryText, fontWeight: '500', minWidth: 60 },
    headerTitle: { fontSize: 17, fontWeight: '600', color: colors.text },
    headerSpacer: { minWidth: 60 },
    content: { padding: 16, gap: 14 },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
    },
    inputGroup: { marginBottom: 18 },
    label: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 4 },
    hint: { fontSize: 12, color: colors.textSecondary, lineHeight: 17, marginBottom: 8 },
    input: {
      borderWidth: 1,
      borderColor: colors.borderStrong,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      color: colors.text,
      backgroundColor: colors.surface,
    },
    inputMultiline: { minHeight: 80, paddingTop: 10 },
    selectBox: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderWidth: 1,
      borderColor: colors.borderStrong,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 12,
      marginTop: 4,
    },
    selectValue: { fontSize: 14, color: colors.text, flex: 1 },
    selectPlaceholder: { fontSize: 14, color: colors.textMuted, flex: 1 },
    projectList: {
      marginTop: 6,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      overflow: 'hidden',
    },
    projectItem: {
      paddingHorizontal: 12,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderSubtle,
    },
    projectItemActive: { backgroundColor: colors.primarySoft },
    projectItemText: { fontSize: 14, color: colors.text },
    projectItemTextActive: { color: colors.primaryText, fontWeight: '600' },
    projectItemMuted: { fontSize: 14, color: colors.textSecondary },
    pictureButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.borderStrong,
      backgroundColor: colors.surfaceMuted,
      marginTop: 4,
    },
    pictureButtonText: { fontSize: 14, fontWeight: '500', color: colors.textStrong },
    previewContainer: { marginTop: 10, alignSelf: 'flex-start' },
    preview: { width: 120, height: 120, borderRadius: 10 },
    removePreview: {
      position: 'absolute',
      top: -6,
      right: -6,
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: '#EF4444',
      justifyContent: 'center',
      alignItems: 'center',
    },
    submitButton: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
      marginBottom: 24,
    },
    submitButtonDisabled: { opacity: 0.6 },
    submitButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  });
