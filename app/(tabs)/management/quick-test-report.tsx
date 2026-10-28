import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  RefreshControl,
  Image,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, ChevronDown, Plus, Trash2 } from 'lucide-react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { QuickTestRequestForm, QuickTestRequestValues } from '@/components/QuickTestRequestForm';
import { useData } from '@/hooks/useData';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { uploadPartImage } from '@/lib/supabaseHelpers';
import { useColors } from '@/context/ThemeContext';
import type { ThemeColors } from '@/constants/Colors';
import type { QuickTestReport, QuickTestStatus } from '@/types';

type Filter = 'all' | QuickTestStatus;

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'passed', label: 'Passed' },
  { value: 'failed', label: 'Failed' },
];

const STATUS_LABEL: Record<QuickTestStatus, string> = {
  pending: 'Pending',
  passed: 'Passed',
  failed: 'Failed',
};

const fromRow = (r: any): QuickTestReport => ({
  id: r.id,
  userId: r.user_id,
  applicantName: r.applicant_name,
  materialInfo: r.material_info,
  vendor: r.vendor,
  testingSurface: r.testing_surface,
  sampleQuantity: r.sample_quantity,
  sampleDimensions: r.sample_dimensions,
  antimicrobialInfo: r.antimicrobial_info,
  finalApplication: r.final_application,
  projectId: r.project_id,
  projectName: r.project_name,
  pictureUrl: r.picture_url,
  status: r.status,
  resultUpdatedBy: r.result_updated_by,
  resultUpdatedByName: r.result_updated_by_name,
  resultUpdatedAt: r.result_updated_at ? new Date(r.result_updated_at) : null,
  createdAt: new Date(r.created_at),
});

const formatDate = (date: Date) =>
  date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

export default function QuickTestReportScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const router = useRouter();
  const { projects } = useData();
  const { user, profile, canEdit } = useAuth();
  const isDev = (profile?.role || '').toLowerCase() === 'dev';

  const [reports, setReports] = useState<QuickTestReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resultTarget, setResultTarget] = useState<QuickTestReport | null>(null);
  const [updatingResult, setUpdatingResult] = useState(false);
  const [viewImage, setViewImage] = useState<string | null>(null);

  const loadReports = useCallback(async () => {
    const { data, error } = await supabase
      .from('quick_test_reports')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading quick test reports:', error);
      Alert.alert('Error', 'Failed to load test reports');
      return;
    }
    setReports((data || []).map(fromRow));
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadReports().finally(() => setLoading(false));
    }, [loadReports])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadReports();
    setRefreshing(false);
  };

  const handleSubmit = async (values: QuickTestRequestValues) => {
    if (!user) {
      Alert.alert('Error', 'You must be signed in to submit a request');
      return;
    }
    setSubmitting(true);
    try {
      let pictureUrl: string | null = null;
      if (values.pictureUri) {
        pictureUrl = await uploadPartImage(values.pictureUri, 'test-reports');
      }
      const project = projects.find(p => p.id === values.projectId);
      const { error } = await supabase.from('quick_test_reports').insert({
        user_id: user.id,
        applicant_name: profile?.full_name || profile?.email || user.email || 'Unknown',
        material_info: values.materialInfo,
        vendor: values.vendor,
        testing_surface: values.testingSurface,
        sample_quantity: values.sampleQuantity,
        sample_dimensions: values.sampleDimensions,
        antimicrobial_info: values.antimicrobialInfo,
        final_application: values.finalApplication,
        project_id: project?.id ?? null,
        project_name: project?.name ?? null,
        picture_url: pictureUrl,
        status: 'pending',
      });
      if (error) throw error;

      setShowForm(false);
      await loadReports();
      Alert.alert('Submitted', 'Your test request has been submitted. The result is pending.');
    } catch (error) {
      console.error('Error submitting quick test report:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateResult = async (status: 'passed' | 'failed') => {
    if (!resultTarget || !user) return;
    setUpdatingResult(true);
    try {
      const { error } = await supabase
        .from('quick_test_reports')
        .update({
          status,
          result_updated_by: user.id,
          result_updated_by_name: profile?.full_name || profile?.email || user.email || 'Unknown',
          result_updated_at: new Date().toISOString(),
        })
        .eq('id', resultTarget.id);
      if (error) throw error;

      setResultTarget(null);
      await loadReports();
    } catch (error) {
      console.error('Error updating test result:', error);
      Alert.alert('Error', 'Failed to update test result. Only users with the Dev role can update results.');
    } finally {
      setUpdatingResult(false);
    }
  };

  const handleDelete = (report: QuickTestReport) => {
    Alert.alert('Delete Test Request', 'Are you sure you want to delete this test request? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const { data, error } = await supabase
              .from('quick_test_reports')
              .delete()
              .eq('id', report.id)
              .select('id');
            if (error) throw error;
            if (!data || data.length === 0) {
              Alert.alert('Error', 'You do not have permission to delete this request.');
              return;
            }
            setReports(prev => prev.filter(r => r.id !== report.id));
          } catch (error) {
            console.error('Error deleting test request:', error);
            Alert.alert('Error', 'Failed to delete test request');
          }
        },
      },
    ]);
  };

  const filtered = reports.filter(r => filter === 'all' || r.status === filter);

  const statusStyle = (status: QuickTestStatus) => {
    switch (status) {
      case 'passed':
        return { badge: styles.badgePassed, text: styles.badgeTextPassed };
      case 'failed':
        return { badge: styles.badgeFailed, text: styles.badgeTextFailed };
      default:
        return { badge: styles.badgePending, text: styles.badgeTextPending };
    }
  };

  const renderDetail = (label: string, value: string | null) =>
    value ? (
      <View style={styles.detailBlock}>
        <ThemedText style={styles.detailLabel}>{label}</ThemedText>
        <ThemedText style={styles.detailValue}>{value}</ThemedText>
      </View>
    ) : null;

  const renderReport = (report: QuickTestReport) => {
    const isExpanded = expanded[report.id] || false;
    const s = statusStyle(report.status);
    return (
      <View key={report.id} style={styles.card}>
        <TouchableOpacity
          style={styles.cardHeader}
          onPress={() => setExpanded(prev => ({ ...prev, [report.id]: !prev[report.id] }))}
          activeOpacity={0.7}
        >
          <View style={styles.cardInfo}>
            <ThemedText style={styles.cardTitle} numberOfLines={isExpanded ? undefined : 2}>
              {report.materialInfo}
            </ThemedText>
            <ThemedText style={styles.cardMeta}>
              {report.applicantName} · {formatDate(report.createdAt)}
            </ThemedText>
          </View>
          <View style={styles.cardRight}>
            <View style={[styles.badge, s.badge]}>
              <ThemedText style={[styles.badgeText, s.text]}>{STATUS_LABEL[report.status]}</ThemedText>
            </View>
            <ChevronDown
              size={20}
              color={colors.textSecondary}
              style={isExpanded ? styles.chevronRotated : undefined}
            />
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <View>
            <View style={styles.divider} />
            {renderDetail('Vendor or manufacturer', report.vendor)}
            {renderDetail('Testing surface', report.testingSurface)}
            {renderDetail('Number of samples', report.sampleQuantity)}
            {renderDetail('Dimensions of samples', report.sampleDimensions)}
            {renderDetail('Antimicrobial chemical form and application %', report.antimicrobialInfo)}
            {renderDetail('Final application of the samples', report.finalApplication)}
            {renderDetail('Project', report.projectName)}
            {report.pictureUrl ? (
              <View style={styles.detailBlock}>
                <ThemedText style={styles.detailLabel}>Sample picture</ThemedText>
                <TouchableOpacity onPress={() => setViewImage(report.pictureUrl)}>
                  <Image source={{ uri: report.pictureUrl }} style={styles.picture} />
                </TouchableOpacity>
              </View>
            ) : null}

            {report.status !== 'pending' && report.resultUpdatedAt ? (
              <ThemedText style={styles.resultMeta}>
                Result updated by {report.resultUpdatedByName || 'Unknown'} · {formatDate(report.resultUpdatedAt)}
              </ThemedText>
            ) : null}

            {(isDev || report.userId === user?.id) && (
              <TouchableOpacity style={styles.deleteButton} onPress={() => handleDelete(report)}>
                <Trash2 size={16} color={colors.danger} />
                <ThemedText style={styles.deleteButtonText}>Delete Request</ThemedText>
              </TouchableOpacity>
            )}

            {isDev && (
              <TouchableOpacity style={styles.updateButton} onPress={() => setResultTarget(report)}>
                <ThemedText style={styles.updateButtonText}>Update Test Result</ThemedText>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.outer}>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>Quick Test Report</ThemedText>
          {canEdit ? (
            <TouchableOpacity style={styles.addButton} onPress={() => setShowForm(true)}>
              <Plus size={22} color="#FFFFFF" strokeWidth={2.5} />
            </TouchableOpacity>
          ) : (
            <View style={styles.addButtonPlaceholder} />
          )}
        </View>

        <View style={styles.filterRow}>
          {FILTERS.map(f => (
            <TouchableOpacity
              key={f.value}
              style={[styles.filterChip, filter === f.value && styles.filterChipActive]}
              onPress={() => setFilter(f.value)}
            >
              <ThemedText style={[styles.filterChipText, filter === f.value && styles.filterChipTextActive]}>
                {f.label}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        >
          {loading && reports.length === 0 ? (
            <ActivityIndicator style={styles.loader} color={colors.primaryText} />
          ) : filtered.length > 0 ? (
            filtered.map(renderReport)
          ) : (
            <View style={styles.emptyState}>
              <ThemedText style={styles.emptyTitle}>No Test Requests</ThemedText>
              <ThemedText style={styles.emptyText}>
                {reports.length === 0
                  ? (canEdit ? 'Tap + to submit a new test request.' : 'No test requests have been submitted yet.')
                  : 'No requests match the selected filter.'}
              </ThemedText>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>

      <QuickTestRequestForm
        visible={showForm}
        projects={projects.map(p => ({ id: p.id, name: p.name }))}
        submitting={submitting}
        onClose={() => setShowForm(false)}
        onSubmit={handleSubmit}
      />

      <Modal
        visible={!!resultTarget}
        transparent
        animationType="fade"
        onRequestClose={() => setResultTarget(null)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => !updatingResult && setResultTarget(null)}
        >
          <TouchableOpacity style={styles.resultModal} activeOpacity={1}>
            <ThemedText style={styles.resultTitle}>Update Test Result</ThemedText>
            <ThemedText style={styles.resultSubtitle} numberOfLines={2}>
              {resultTarget?.materialInfo}
            </ThemedText>
            {updatingResult ? (
              <ActivityIndicator style={styles.loader} color={colors.primaryText} />
            ) : (
              <View style={styles.resultButtons}>
                <TouchableOpacity
                  style={[styles.resultButton, styles.resultPassed]}
                  onPress={() => handleUpdateResult('passed')}
                >
                  <ThemedText style={styles.resultButtonText}>Passed</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.resultButton, styles.resultFailed]}
                  onPress={() => handleUpdateResult('failed')}
                >
                  <ThemedText style={styles.resultButtonText}>Failed</ThemedText>
                </TouchableOpacity>
              </View>
            )}
            <TouchableOpacity
              style={styles.resultCancel}
              onPress={() => setResultTarget(null)}
              disabled={updatingResult}
            >
              <ThemedText style={styles.resultCancelText}>Cancel</ThemedText>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <Modal visible={!!viewImage} transparent animationType="fade" onRequestClose={() => setViewImage(null)}>
        <TouchableOpacity style={styles.imageOverlay} activeOpacity={1} onPress={() => setViewImage(null)}>
          {viewImage ? <Image source={{ uri: viewImage }} style={styles.fullImage} resizeMode="contain" /> : null}
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    outer: { flex: 1, backgroundColor: colors.background },
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backButton: { padding: 4, width: 40 },
    headerTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
    addButtonPlaceholder: { width: 36, height: 36 },
    addButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    filterRow: {
      flexDirection: 'row',
      gap: 8,
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    filterChip: {
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 16,
      backgroundColor: colors.surfaceMuted,
    },
    filterChipActive: { backgroundColor: colors.primary },
    filterChipText: { fontSize: 13, fontWeight: '500', color: colors.textSecondary },
    filterChipTextActive: { color: '#FFFFFF', fontWeight: '600' },
    list: { flex: 1 },
    listContent: { padding: 16, paddingBottom: 32 },
    loader: { marginVertical: 24 },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 3,
      elevation: 2,
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
    cardInfo: { flex: 1 },
    cardTitle: { fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: 4 },
    cardMeta: { fontSize: 12, color: colors.textMuted },
    cardRight: { alignItems: 'flex-end', gap: 8 },
    chevronRotated: { transform: [{ rotate: '180deg' }] },
    badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
    badgeText: { fontSize: 12, fontWeight: '600' },
    badgePending: { backgroundColor: colors.warningSoft },
    badgeTextPending: { color: colors.warningStrong },
    badgePassed: { backgroundColor: colors.successSoft },
    badgeTextPassed: { color: colors.successStrong },
    badgeFailed: { backgroundColor: colors.dangerSoft },
    badgeTextFailed: { color: colors.dangerStrong },
    divider: { height: 1, backgroundColor: colors.borderSubtle, marginVertical: 12 },
    detailBlock: { marginBottom: 12 },
    detailLabel: { fontSize: 12, fontWeight: '500', color: colors.textSecondary, marginBottom: 2 },
    detailValue: { fontSize: 14, color: colors.text, lineHeight: 20 },
    picture: { width: 120, height: 120, borderRadius: 10, marginTop: 4 },
    resultMeta: { fontSize: 12, color: colors.textMuted, marginBottom: 4 },
    updateButton: {
      marginTop: 8,
      paddingVertical: 10,
      borderRadius: 8,
      alignItems: 'center',
      backgroundColor: colors.primarySoft,
      borderWidth: 1,
      borderColor: colors.primaryBorder,
    },
    deleteButton: {
      marginTop: 8,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 10,
      borderRadius: 8,
      backgroundColor: colors.dangerSoft,
      borderWidth: 1,
      borderColor: colors.dangerBorder,
    },
    deleteButtonText: { fontSize: 14, fontWeight: '600', color: colors.danger },
    updateButtonText: { fontSize: 14, fontWeight: '600', color: colors.primaryText },
    emptyState: { paddingVertical: 48, alignItems: 'center' },
    emptyTitle: { fontSize: 18, fontWeight: '600', color: colors.text, marginBottom: 8 },
    emptyText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    resultModal: {
      width: '100%',
      maxWidth: 360,
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 20,
    },
    resultTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 4 },
    resultSubtitle: { fontSize: 13, color: colors.textSecondary, marginBottom: 16 },
    resultButtons: { flexDirection: 'row', gap: 12 },
    resultButton: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
    resultPassed: { backgroundColor: '#10B981' },
    resultFailed: { backgroundColor: '#EF4444' },
    resultButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
    resultCancel: { marginTop: 12, alignItems: 'center', paddingVertical: 8 },
    resultCancelText: { fontSize: 14, color: colors.textSecondary },
    imageOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    fullImage: { width: '100%', height: '80%' },
  });
