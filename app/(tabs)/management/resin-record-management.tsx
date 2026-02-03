import React, { useState, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, FlatList, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Trash2, Filter, X } from 'lucide-react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { useData } from '@/hooks/useData';

interface ResinRecord {
  id: string;
  project_id: string;
  project_name: string;
  material: string;
  with_oil: boolean;
  total_grams: number;
  component1_grams: number;
  component2_grams: number;
  oil_grams: number;
  created_at: string;
}

const getComponentNames = (material: string) => {
  switch (material) {
    case 'BK':
      return { component1: 'Onyx (BK)', component2: 'Tough74', hasComponent2: true };
    case 'Tough White':
      return { component1: 'Nylon Mecha', component2: 'F39', hasComponent2: true };
    case 'Transparent':
      return { component1: 'Clear V2', component2: '', hasComponent2: false };
    default:
      return { component1: 'Component 1', component2: 'Component 2', hasComponent2: true };
  }
};

export default function ResinRecordManagement() {
  const router = useRouter();
  const { projects } = useData();
  const [records, setRecords] = useState<ResinRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<ResinRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);

  // Load records from database
  const loadRecords = useCallback(async () => {
    setLoading(true);
    try {
      // TODO: Replace with your actual database call (supabase)
      // For now, we'll use sample data
      const sampleRecords: ResinRecord[] = [
        {
          id: '1',
          project_id: projects[0]?.id || '1',
          project_name: projects[0]?.name || 'Project A',
          material: 'BK',
          with_oil: true,
          total_grams: 100,
          component1_grams: 72.8,
          component2_grams: 18.2,
          oil_grams: 9,
          created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: '2',
          project_id: projects[0]?.id || '1',
          project_name: projects[0]?.name || 'Project A',
          material: 'Tough White',
          with_oil: false,
          total_grams: 50,
          component1_grams: 35,
          component2_grams: 15,
          oil_grams: 0,
          created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: '3',
          project_id: projects[1]?.id || '2',
          project_name: projects[1]?.name || 'Project B',
          material: 'Transparent',
          with_oil: true,
          total_grams: 75,
          component1_grams: 73.5,
          component2_grams: 0,
          oil_grams: 1.5,
          created_at: new Date().toISOString(),
        },
      ];

      setRecords(sampleRecords);

      // Use projects from useData hook
      if (projects.length > 0 && !selectedProject) {
        setSelectedProject(projects[0].id);
        setFilteredRecords(sampleRecords.filter((r) => r.project_id === projects[0].id));
      } else if (selectedProject) {
        setFilteredRecords(sampleRecords.filter((r) => r.project_id === selectedProject));
      }
    } catch (error) {
      console.error('Error loading records:', error);
      Alert.alert('Error', 'Failed to load resin records');
    } finally {
      setLoading(false);
    }
  }, [selectedProject, projects]);

  // Load records when component is focused
  useFocusEffect(
    useCallback(() => {
      loadRecords();
    }, [loadRecords])
  );

  const handleDeleteRecord = (recordId: string) => {
    Alert.alert('Delete Record', 'Are you sure you want to delete this record?', [
      { text: 'Cancel', onPress: () => {}, style: 'cancel' },
      {
        text: 'Delete',
        onPress: async () => {
          try {
            // TODO: Replace with actual database delete call
            const updatedRecords = records.filter((r) => r.id !== recordId);
            setRecords(updatedRecords);

            if (selectedProject) {
              setFilteredRecords(updatedRecords.filter((r) => r.project_id === selectedProject));
            }

            Alert.alert('Success', 'Record deleted successfully');
          } catch (error) {
            Alert.alert('Error', 'Failed to delete record');
          }
        },
        style: 'destructive',
      },
    ]);
  };

  const handleFilterChange = (projectId: string) => {
    setSelectedProject(projectId);
    setFilteredRecords(records.filter((r) => r.project_id === projectId));
  };

  const handleClearFilter = () => {
    setSelectedProject(null);
    setFilteredRecords(records);
  };

  const renderRecordItem = ({ item }: { item: ResinRecord }) => {
    const componentNames = getComponentNames(item.material);
    const formattedDate = new Date(item.created_at).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    return (
      <View style={styles.recordCard}>
        <View style={styles.recordHeader}>
          <View style={styles.recordInfo}>
            <ThemedText style={styles.recordMaterial}>{item.material}</ThemedText>
            <ThemedText style={styles.recordDate}>{formattedDate}</ThemedText>
          </View>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteRecord(item.id)}
          >
            <Trash2 size={18} color="#EF4444" />
          </TouchableOpacity>
        </View>

        <View style={styles.recordDivider} />

        <View style={styles.recordDetails}>
          <View style={styles.detailRow}>
            <ThemedText style={styles.detailLabel}>{componentNames.component1}</ThemedText>
            <ThemedText style={styles.detailValue}>{item.component1_grams.toFixed(2)} g</ThemedText>
          </View>

          {componentNames.hasComponent2 && item.component2_grams > 0 && (
            <View style={styles.detailRow}>
              <ThemedText style={styles.detailLabel}>{componentNames.component2}</ThemedText>
              <ThemedText style={styles.detailValue}>{item.component2_grams.toFixed(2)} g</ThemedText>
            </View>
          )}

          {item.with_oil && item.oil_grams > 0 && (
            <View style={styles.detailRow}>
              <ThemedText style={styles.detailLabel}>111 Oil</ThemedText>
              <ThemedText style={styles.detailValue}>{item.oil_grams.toFixed(2)} g</ThemedText>
            </View>
          )}

          <View style={styles.detailDivider} />

          <View style={styles.detailRow}>
            <ThemedText style={styles.detailLabelTotal}>Total</ThemedText>
            <ThemedText style={styles.detailValueTotal}>{item.total_grams.toFixed(2)} g</ThemedText>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#111827" />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Resin Records</ThemedText>
        <View style={styles.headerPlaceholder} />
      </View>

      {/* Project Filter */}
      {projects.length > 0 && (
        <View style={styles.filterContainer}>
          <View style={styles.filterLabel}>
            <Filter size={16} color="#6B7280" />
            <ThemedText style={styles.filterLabelText}>Filter by Project</ThemedText>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScroll}
          >
            {selectedProject && (
              <TouchableOpacity style={styles.filterClear} onPress={handleClearFilter}>
                <X size={14} color="#EF4444" />
                <ThemedText style={styles.filterClearText}>Clear</ThemedText>
              </TouchableOpacity>
            )}

            {projects.map((project) => (
              <TouchableOpacity
                key={project.id}
                style={[
                  styles.filterButton,
                  selectedProject === project.id && styles.filterButtonActive,
                ]}
                onPress={() => handleFilterChange(project.id)}
              >
                <ThemedText
                  style={[
                    styles.filterButtonText,
                    selectedProject === project.id && styles.filterButtonTextActive,
                  ]}
                >
                  {project.name}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Records List */}
      {filteredRecords.length > 0 ? (
        <FlatList
          data={filteredRecords.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())}
          keyExtractor={(item) => item.id}
          renderItem={renderRecordItem}
          contentContainerStyle={styles.recordsList}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={loadRecords} />}
        />
      ) : (
        <View style={styles.emptyState}>
          <ThemedText style={styles.emptyStateTitle}>No Records Found</ThemedText>
          <ThemedText style={styles.emptyStateText}>
            {records.length === 0
              ? 'Start by creating a resin record in the Resin Record and Calculator'
              : 'No records found for the selected project'}
          </ThemedText>
        </View>
      )}
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
    marginBottom: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
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
  filterContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filterLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  filterLabelText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  filterScroll: {
    paddingBottom: 4,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginRight: 8,
    backgroundColor: '#F9FAFB',
  },
  filterButtonActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  filterClear: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    marginRight: 8,
    backgroundColor: '#FEF2F2',
  },
  filterClearText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#EF4444',
  },
  recordsList: {
    padding: 12,
    paddingBottom: 24,
  },
  recordCard: {
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
  recordHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  recordInfo: {
    flex: 1,
  },
  recordMaterial: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  recordDate: {
    fontSize: 12,
    fontWeight: '400',
    color: '#9CA3AF',
  },
  deleteButton: {
    padding: 8,
    marginRight: -4,
  },
  recordDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginBottom: 12,
  },
  recordDetails: {
    gap: 0,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  detailDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 8,
  },
  detailLabelTotal: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  detailValueTotal: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2563EB',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    fontWeight: '400',
    color: '#6B7280',
    textAlign: 'center',
  },
});
