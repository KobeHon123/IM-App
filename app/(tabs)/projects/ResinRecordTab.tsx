import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import LoadingSpinner from '@/components/LoadingSpinner';
import { supabase } from '@/lib/supabase';

interface ResinRecord {
  id: string;
  project_id: string;
  material: string;
  with_oil: boolean;
  total_grams: number;
  component1_grams: number;
  component2_grams: number;
  oil_grams: number;
  created_at: string;
}

interface ResinSummary {
  material: string;
  totalGrams: number;
  component1Name: string;
  component1Grams: number;
  component2Name: string;
  component2Grams: number;
  oilGrams: number;
  recordCount: number;
}

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

const ResinRecordTab = ({ projectId }: { projectId: string }) => {
  const [records, setRecords] = useState<ResinRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [resinSummaries, setResinSummaries] = useState<ResinSummary[]>([]);

  // Load records from database
  const loadRecords = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('resin_records')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading records:', error);
        setLoading(false);
        return;
      }

      const loadedRecords: ResinRecord[] = (data || []).map((record: any) => ({
        id: record.id,
        project_id: record.project_id,
        material: record.material,
        with_oil: record.with_oil,
        total_grams: record.total_grams,
        component1_grams: record.component1_grams,
        component2_grams: record.component2_grams,
        oil_grams: record.oil_grams,
        created_at: record.created_at,
      }));

      setRecords(loadedRecords);

      // Calculate summaries by material type
      const summaryMap: { [key: string]: ResinSummary } = {};

      loadedRecords.forEach((record) => {
        if (!summaryMap[record.material]) {
          const names = getComponentNames(record.material);
          summaryMap[record.material] = {
            material: record.material,
            totalGrams: 0,
            component1Name: names.component1,
            component1Grams: 0,
            component2Name: names.component2,
            component2Grams: 0,
            oilGrams: 0,
            recordCount: 0,
          };
        }

        summaryMap[record.material].totalGrams += record.total_grams;
        summaryMap[record.material].component1Grams += record.component1_grams;
        summaryMap[record.material].component2Grams += record.component2_grams;
        summaryMap[record.material].oilGrams += record.oil_grams;
        summaryMap[record.material].recordCount += 1;
      });

      setResinSummaries(Object.values(summaryMap));
    } catch (error) {
      console.error('Error loading records:', error);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useFocusEffect(
    useCallback(() => {
      loadRecords();
    }, [loadRecords])
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <LoadingSpinner size={50} color="#2563EB" strokeWidth={5} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        {resinSummaries.length === 0 ? (
          <View style={styles.emptyContainer}>
            <ThemedText style={styles.placeholderText}>No Resin Records</ThemedText>
            <ThemedText style={styles.placeholderSubtext}>Start adding resin records from the Resin Calculator</ThemedText>
          </View>
        ) : (
          <>
            <ThemedText style={styles.sectionTitle}>Resin Usage Summary</ThemedText>
            {resinSummaries.map((summary) => (
              <View key={summary.material} style={styles.summaryCard}>
                <View style={styles.cardHeader}>
                  <ThemedText style={styles.materialName}>{summary.material}</ThemedText>
                  <ThemedText style={styles.recordCountBadge}>{summary.recordCount} {summary.recordCount === 1 ? 'record' : 'records'}</ThemedText>
                </View>

                <View style={styles.totalSection}>
                  <ThemedText style={styles.totalLabel}>Total Used</ThemedText>
                  <ThemedText style={styles.totalValue}>{summary.totalGrams.toFixed(1)} g</ThemedText>
                </View>

                <View style={styles.divider} />

                <View style={styles.componentsSection}>
                  <View style={styles.componentRow}>
                    <ThemedText style={styles.componentLabel}>{summary.component1Name}</ThemedText>
                    <ThemedText style={styles.componentValue}>{summary.component1Grams.toFixed(1)} g</ThemedText>
                  </View>

                  {summary.component2Name && (
                    <View style={styles.componentRow}>
                      <ThemedText style={styles.componentLabel}>{summary.component2Name}</ThemedText>
                      <ThemedText style={styles.componentValue}>{summary.component2Grams.toFixed(1)} g</ThemedText>
                    </View>
                  )}

                  {summary.oilGrams > 0 && (
                    <View style={styles.componentRow}>
                      <ThemedText style={styles.componentLabel}>111 Oil</ThemedText>
                      <ThemedText style={styles.componentValue}>{summary.oilGrams.toFixed(1)} g</ThemedText>
                    </View>
                  )}
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  placeholderText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
  },
  placeholderSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  summaryCard: {
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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  materialName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  recordCountBadge: {
    fontSize: 12,
    fontWeight: '500',
    color: '#2563EB',
    backgroundColor: '#EFF6FF',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  totalSection: {
    marginBottom: 12,
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  totalValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2563EB',
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 12,
  },
  componentsSection: {
    gap: 8,
  },
  componentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  componentLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  componentValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
});

export default ResinRecordTab;
