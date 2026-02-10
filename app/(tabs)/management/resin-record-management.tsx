import React, { useState, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, FlatList, Alert, RefreshControl, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Trash2, ChevronDown } from 'lucide-react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { useData } from '@/hooks/useData';
import { supabase } from '@/lib/supabase';

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

const calculateResinBreakdown = (records: ResinRecord[]) => {
  const breakdown = {
    onyx: 0,
    tough74: 0,
    nylonMecha: 0,
    f39: 0,
    clearV2: 0,
    oil: 0,
  };

  records.forEach((record) => {
    if (record.material === 'BK') {
      breakdown.onyx += record.component1_grams;
      breakdown.tough74 += record.component2_grams;
    } else if (record.material === 'Tough White') {
      breakdown.nylonMecha += record.component1_grams;
      breakdown.f39 += record.component2_grams;
    } else if (record.material === 'Transparent') {
      breakdown.clearV2 += record.component1_grams;
    }
    if (record.with_oil) {
      breakdown.oil += record.oil_grams;
    }
  });

  return breakdown;
};

export default function ResinRecordManagement() {
  const router = useRouter();
  const { projects } = useData();
  const [records, setRecords] = useState<ResinRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<ResinRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [expandedCards, setExpandedCards] = useState<{ [key: string]: boolean }>({});
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [expandSummary, setExpandSummary] = useState(false);

  // Load records from database
  const loadRecords = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('resin_records')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading records:', error);
        Alert.alert('Error', 'Failed to load resin records');
        setLoading(false);
        return;
      }

      const loadedRecords: ResinRecord[] = (data || []).map((record: any) => ({
        id: record.id,
        project_id: record.project_id,
        project_name: record.project_name || '',
        material: record.material,
        with_oil: record.with_oil,
        total_grams: record.total_grams,
        component1_grams: record.component1_grams,
        component2_grams: record.component2_grams,
        oil_grams: record.oil_grams,
        created_at: record.created_at,
      }));

      setRecords(loadedRecords);

      // Use projects from useData hook
      if (projects.length > 0 && !selectedProject) {
        setSelectedProject(projects[0].id);
        setFilteredRecords(loadedRecords.filter((r) => r.project_id === projects[0].id));
      } else if (selectedProject) {
        setFilteredRecords(loadedRecords.filter((r) => r.project_id === selectedProject));
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
            const { error } = await supabase
              .from('resin_records')
              .delete()
              .eq('id', recordId);

            if (error) {
              console.error('Error deleting record:', error);
              Alert.alert('Error', 'Failed to delete record');
              return;
            }

            const updatedRecords = records.filter((r) => r.id !== recordId);
            setRecords(updatedRecords);

            if (selectedProject) {
              setFilteredRecords(updatedRecords.filter((r) => r.project_id === selectedProject));
            } else {
              setFilteredRecords(updatedRecords);
            }

            Alert.alert('Success', 'Record deleted successfully');
          } catch (error) {
            console.error('Error deleting record:', error);
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

  const toggleCardExpand = (recordId: string) => {
    setExpandedCards((prev) => ({
      ...prev,
      [recordId]: !prev[recordId],
    }));
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
    const isExpanded = expandedCards[item.id] || false;

    return (
      <View style={styles.recordCard}>
        <TouchableOpacity
          style={styles.recordHeader}
          onPress={() => toggleCardExpand(item.id)}
          activeOpacity={0.7}
        >
          <View style={styles.recordInfo}>
            <ThemedText style={styles.recordMaterial}>{item.material}</ThemedText>
            <ThemedText style={styles.recordDate}>{formattedDate}</ThemedText>
          </View>
          <View style={styles.headerActions}>
            <ThemedText style={styles.totalGrams}>{item.total_grams.toFixed(2)} g</ThemedText>
            <ChevronDown
              size={20}
              color="#6B7280"
              style={[
                styles.chevron,
                isExpanded && styles.chevronRotated,
              ]}
            />
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <>
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

            <View style={styles.recordFooter}>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDeleteRecord(item.id)}
              >
                <Trash2 size={18} color="#EF4444" />
                <ThemedText style={styles.deleteButtonText}>Delete</ThemedText>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    );
  };

  return (
    <View style={styles.outerContainer}>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <View style={styles.headerSection}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <ArrowLeft size={24} color="#111827" />
            </TouchableOpacity>
            <ThemedText style={styles.headerTitle}>Resin Records</ThemedText>
            <View style={styles.headerPlaceholder} />
          </View>

          {/* Project Filter Dropdown */}
          {projects.length > 0 && (
            <View style={styles.filterContainer}>
              <TouchableOpacity
                style={styles.dropdownButton}
                onPress={() => setShowProjectDropdown(true)}
              >
                <View style={styles.dropdownContent}>
                  <ThemedText style={styles.dropdownLabel}>Project:</ThemedText>
                  <ThemedText style={styles.dropdownValue}>
                    {selectedProject
                      ? projects.find((p) => p.id === selectedProject)?.name || 'Select Project'
                      : 'All Projects'}
                  </ThemedText>
                </View>
                <ChevronDown
                  size={20}
                  color="#2563EB"
                  style={showProjectDropdown && styles.chevronUp}
                />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Project Selection Modal */}
        <Modal
          visible={showProjectDropdown}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setShowProjectDropdown(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            onPress={() => setShowProjectDropdown(false)}
            activeOpacity={1}
          >
            <View style={styles.dropdownMenu}>
              <TouchableOpacity
                style={[styles.dropdownMenuItem, !selectedProject && styles.dropdownMenuItemActive]}
                onPress={() => {
                  handleClearFilter();
                  setShowProjectDropdown(false);
                }}
              >
                <ThemedText
                  style={[
                    styles.dropdownMenuItemText,
                    !selectedProject && styles.dropdownMenuItemTextActive,
                  ]}
                >
                  All Projects
                </ThemedText>
              </TouchableOpacity>

              {projects.map((project) => (
                <TouchableOpacity
                  key={project.id}
                  style={[
                    styles.dropdownMenuItem,
                    selectedProject === project.id && styles.dropdownMenuItemActive,
                  ]}
                  onPress={() => {
                    handleFilterChange(project.id);
                    setShowProjectDropdown(false);
                  }}
                >
                  <ThemedText
                    style={[
                      styles.dropdownMenuItemText,
                      selectedProject === project.id && styles.dropdownMenuItemTextActive,
                    ]}
                  >
                    {project.name}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </Modal>

        <ScrollView style={styles.scrollableContent} showsVerticalScrollIndicator={false}>
          {/* Records List */}
          {filteredRecords.length > 0 ? (
            <View style={styles.recordsList}>
              {filteredRecords.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map((item) => renderRecordItem({ item }))}
            </View>
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
        </ScrollView>
      </SafeAreaView>

      {/* Summary Card */}
      {records.length > 0 && (
        <View style={styles.summaryCard}>
          {/* Expanded View - Top */}
          {expandSummary && (
            <View style={styles.expandedTopContainer}>
              {(() => {
                const breakdown = calculateResinBreakdown(filteredRecords);
                const columns = [
                  [
                    { label: 'Onyx (BK)', value: breakdown.onyx },
                    { label: 'Tough74', value: breakdown.tough74 },
                  ],
                  [
                    { label: 'Nylon Mecha', value: breakdown.nylonMecha },
                    { label: 'F39', value: breakdown.f39 },
                  ],
                  [
                    { label: 'Clear V2', value: breakdown.clearV2 },
                    { label: '111 Oil', value: breakdown.oil },
                  ],
                ];

                return (
                  <View style={styles.expandedItemsGrid}>
                    {columns.map((column, colIndex) => (
                      <View 
                        key={colIndex} 
                        style={[
                          styles.expandedGridColumn,
                          colIndex < columns.length - 1 && styles.expandedGridColumnWithBorder
                        ]}
                      >
                        {column.map((item, rowIndex) => (
                          <View key={rowIndex} style={styles.expandedSummaryItem}>
                            <ThemedText style={styles.summaryLabel}>{item.label}</ThemedText>
                            <ThemedText style={styles.summaryValue}>{item.value.toFixed(2)} g</ThemedText>
                          </View>
                        ))}
                      </View>
                    ))}
                  </View>
                );
              })()}
              <View style={styles.summaryDivider} />
            </View>
          )}

          {/* Collapsed View */}
          <TouchableOpacity
            onPress={() => setExpandSummary(!expandSummary)}
            activeOpacity={0.7}
          >
            <View style={styles.summaryContent}>
              <View style={styles.summaryItem}>
                <ThemedText style={styles.summaryLabel}>
                  {selectedProject ? 'Project Total' : 'Overall Total'}
                </ThemedText>
                <ThemedText style={styles.summaryValue}>
                  {filteredRecords.reduce((sum, record) => sum + record.total_grams, 0).toFixed(2)} g
                </ThemedText>
              </View>
              <View style={styles.summarySeparator} />
              <View style={styles.summaryItem}>
                <ThemedText style={styles.summaryLabel}>Records</ThemedText>
                <ThemedText style={styles.summaryValue}>{filteredRecords.length}</ThemedText>
              </View>
              <View style={styles.expandIcon}>
                <ChevronDown
                  size={20}
                  color="#2563EB"
                  style={expandSummary && styles.expandIconRotated}
                />
              </View>
            </View>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    flexDirection: 'column',
  },
  headerSection: {
    backgroundColor: '#F3F4F6',
  },
  scrollableContent: {
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
    paddingHorizontal: 12,
    paddingVertical: 12,
    paddingBottom: 20,
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
    marginBottom: 0,
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  totalGrams: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563EB',
  },
  chevron: {
    width: 20,
    height: 20,
  },
  chevronRotated: {
    transform: [{ rotate: '180deg' }],
  },
  recordFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#FEF2F2',
  },
  deleteButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#EF4444',
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
    paddingHorizontal: 20,
    paddingVertical: 40,
    alignItems: 'center',
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
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  dropdownContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dropdownLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dropdownValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  chevronUp: {
    transform: [{ rotate: '180deg' }],
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownMenu: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    minWidth: 280,
    maxWidth: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    overflow: 'hidden',
  },
  dropdownMenuItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dropdownMenuItemActive: {
    backgroundColor: '#EFF6FF',
    borderBottomColor: '#DBEAFE',
  },
  dropdownMenuItemText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  dropdownMenuItemTextActive: {
    color: '#2563EB',
    fontWeight: '600',
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 8,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2563EB',
  },
  summarySeparator: {
    width: 1,
    height: 32,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 16,
  },
  expandIcon: {
    marginLeft: 12,
  },
  expandIconRotated: {
    transform: [{ rotate: '180deg' }],
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 12,
  },
  breakdownContainer: {
    gap: 8,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  expandedTopContainer: {
    paddingBottom: 12,
  },
  expandedItemsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  expandedGridColumn: {
    flex: 1,
    gap: 8,
  },
  expandedGridColumnWithBorder: {
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
    paddingRight: 8,
  },
  columnSeparator: {
    width: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 4,
  },
  expandedSummaryItem: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  breakdownLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  breakdownValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
});
