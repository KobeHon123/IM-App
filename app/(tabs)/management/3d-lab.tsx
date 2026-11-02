import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Switch,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Box, Download } from 'lucide-react-native';
import { ThemedText } from '@/components/ThemedText';
import { PartTypeSelector } from '@/components/PartTypeSelector';
import { ParameterSlider } from '@/components/3d-lab/ParameterSlider';
import { PartPreview, type PartPreviewHandle, type PreviewStatus } from '@/components/3d-lab/PartPreview';
import { Toast, type ToastMessage } from '@/components/3d-lab/Toast';
import { useColors } from '@/context/ThemeContext';
import type { ThemeColors } from '@/constants/Colors';
import { DEFAULT_PART_TYPE, PART_TYPES, getPartType } from '@/lib/3d-lab/partTypes';
import { analyzeMesh } from '@/lib/3d-lab/mesh';
import { meshToBinaryStl } from '@/lib/3d-lab/stl';
import { saveStl } from '@/lib/3d-lab/saveStl';
import { toViewerPayload, type ViewerMeshPayload } from '@/lib/3d-lab/viewerPayload';
import { defaultValues, type BuiltPart, type ParamValues, type PartTypeId } from '@/lib/3d-lab/types';

/** the preview rebuilds at most this often while a slider is being dragged */
const REBUILD_INTERVAL_MS = 180;

const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error));

export default function ThreeDLabScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const { height: windowHeight } = useWindowDimensions();

  const [typeId, setTypeId] = useState<PartTypeId>(DEFAULT_PART_TYPE);
  const definition = getPartType(typeId);
  const [valuesByType, setValuesByType] = useState<Partial<Record<PartTypeId, ParamValues>>>({});
  const values = useMemo(() => valuesByType[typeId] ?? defaultValues(definition), [valuesByType, typeId, definition]);

  const [mesh, setMesh] = useState<ViewerMeshPayload | null>(null);
  const [busy, setBusy] = useState(false);
  const [buildError, setBuildError] = useState<string | null>(null);
  const [previewStatus, setPreviewStatus] = useState<PreviewStatus>('loading');
  const [exporting, setExporting] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const previewRef = useRef<PartPreviewHandle>(null);
  const latest = useRef({ typeId, values });
  latest.current = { typeId, values };
  const lastBuilt = useRef<{ key: string; part: BuiltPart } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastRun = useRef(0);

  const showToast = useCallback((tone: ToastMessage['tone'], text: string) => {
    setToast({ id: Date.now(), tone, text });
  }, []);

  const keyOf = (id: PartTypeId, v: ParamValues) => `${id}:${JSON.stringify(getPartType(id).normalize(v))}`;

  const buildNow = useCallback(() => {
    timer.current = null;
    lastRun.current = Date.now();
    const { typeId: id, values: v } = latest.current;
    const def = getPartType(id);
    if (def.status !== 'ready') {
      setBusy(false);
      return;
    }
    try {
      const part = def.build(v);
      lastBuilt.current = { key: keyOf(id, v), part };
      setMesh(toViewerPayload(part));
      setBuildError(null);
    } catch (error) {
      setBuildError(errorText(error));
    } finally {
      setBusy(false);
    }
  }, []);

  const scheduleBuild = useCallback(
    (immediate = false) => {
      if (getPartType(latest.current.typeId).status !== 'ready') return;
      setBusy(true);
      if (timer.current) {
        if (!immediate) return; // a rebuild is already queued and will pick up the newest values
        clearTimeout(timer.current);
      }
      const wait = immediate ? 0 : Math.max(0, REBUILD_INTERVAL_MS - (Date.now() - lastRun.current));
      timer.current = setTimeout(buildNow, wait);
    },
    [buildNow]
  );

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  // build when the part type changes (and once on open)
  useEffect(() => {
    scheduleBuild(true);
  }, [typeId, scheduleBuild]);

  const setValue = (key: string, value: number | boolean, immediate: boolean) => {
    setValuesByType((prev) => {
      const next = { ...(prev[typeId] ?? defaultValues(definition)), [key]: value };
      latest.current = { typeId, values: next };
      return { ...prev, [typeId]: next };
    });
    scheduleBuild(immediate);
  };

  const notes = useMemo(() => definition.describe(values), [definition, values]);

  const download = async () => {
    if (exporting) return;
    setExporting(true);
    // let the spinner render before the heavy work starts
    await new Promise((resolve) => setTimeout(resolve, 30));
    try {
      const { typeId: id, values: v } = latest.current;
      const def = getPartType(id);
      const key = keyOf(id, v);
      const part = lastBuilt.current?.key === key ? lastBuilt.current.part : def.build(v);
      const stats = analyzeMesh(part.mesh);
      if (!stats.watertight) throw new Error('The model is not watertight - please change a parameter and try again.');
      const fileName = def.exportFileName(v);
      await saveStl(fileName, meshToBinaryStl(part.mesh));
      showToast('success', `${fileName} is ready`);
    } catch (error) {
      showToast('error', `Could not create the STL: ${errorText(error)}`);
    } finally {
      setExporting(false);
    }
  };

  const previewHeight = Math.min(430, Math.max(250, Math.round(windowHeight * 0.38)));
  const ready = definition.status === 'ready';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} accessibilityLabel="Back">
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>3D Lab</ThemedText>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.selectorBlock}>
        <ThemedText style={styles.sectionLabel}>Part Type</ThemedText>
        <PartTypeSelector
          options={PART_TYPES.map((t) => ({ value: t.id, label: t.label }))}
          value={typeId}
          onChange={setTypeId}
        />
      </View>

      <View style={[styles.previewBox, { height: previewHeight }]}>
        {ready ? (
          <PartPreview ref={previewRef} mesh={mesh} busy={busy} onStatusChange={setPreviewStatus} />
        ) : (
          <View style={styles.comingSoon}>
            <Box size={40} color={colors.textMuted} strokeWidth={1.5} />
            <ThemedText style={styles.comingSoonTitle}>Coming soon</ThemedText>
            <ThemedText style={styles.comingSoonText}>{definition.label} is not available in the 3D Lab yet.</ThemedText>
          </View>
        )}
      </View>

      <ScrollView style={styles.panel} contentContainerStyle={styles.panelContent} keyboardShouldPersistTaps="handled">
        {ready ? (
          <>
            <View style={styles.card}>
              <ThemedText style={styles.partTitle}>{definition.title}</ThemedText>
              <ThemedText style={styles.partDescription}>{definition.description}</ThemedText>
            </View>

            <View style={styles.card}>
              {definition.parameters.map((spec) => {
                const paramNotes = notes.filter((n) => n.paramKey === spec.key);
                const noteViews = paramNotes.map((note) => (
                  <View key={note.text} style={[styles.note, note.tone === 'warning' && styles.noteWarning]}>
                    <ThemedText style={[styles.noteText, note.tone === 'warning' && styles.noteTextWarning]}>{note.text}</ThemedText>
                  </View>
                ));

                if (spec.kind === 'slider') {
                  return (
                    <View key={spec.key}>
                      <ParameterSlider
                        spec={spec}
                        value={values[spec.key] as number}
                        onChange={(v) => setValue(spec.key, v, false)}
                        onChangeEnd={(v) => setValue(spec.key, v, true)}
                      />
                      {noteViews.length > 0 && <View style={styles.notes}>{noteViews}</View>}
                    </View>
                  );
                }

                return (
                  <View key={spec.key} style={styles.toggleBlock}>
                    <View style={styles.toggleRow}>
                      <View style={styles.toggleText}>
                        <ThemedText style={styles.toggleLabel}>{spec.label}</ThemedText>
                        {spec.description ? <ThemedText style={styles.toggleDescription}>{spec.description}</ThemedText> : null}
                      </View>
                      <Switch
                        value={values[spec.key] === true}
                        onValueChange={(v) => setValue(spec.key, v, true)}
                        trackColor={{ false: colors.surfaceStrong, true: colors.primary }}
                        thumbColor="#FFFFFF"
                      />
                    </View>
                    {noteViews.length > 0 && values[spec.key] === true && <View style={styles.notes}>{noteViews}</View>}
                  </View>
                );
              })}
            </View>

            {buildError && (
              <View style={[styles.note, styles.noteWarning, styles.errorNote]}>
                <ThemedText style={styles.noteTextWarning}>Could not build this model: {buildError}</ThemedText>
              </View>
            )}

            <TouchableOpacity
              style={[styles.downloadButton, (exporting || !!buildError) && styles.downloadDisabled]}
              onPress={download}
              disabled={exporting || !!buildError}
              accessibilityLabel="Download STL"
            >
              {exporting ? <ActivityIndicator color="#FFFFFF" /> : <Download size={20} color="#FFFFFF" />}
              <ThemedText style={styles.downloadText}>{exporting ? 'Generating STL…' : 'Download STL'}</ThemedText>
            </TouchableOpacity>
            <ThemedText style={styles.footnote}>
              Binary STL in millimetres · {definition.exportFileName(values)}
              {previewStatus === 'unsupported' ? '\nThe preview is unavailable on this device, but the STL is generated normally.' : ''}
            </ThemedText>
          </>
        ) : (
          <View style={styles.card}>
            <ThemedText style={styles.partTitle}>{definition.label}</ThemedText>
            <ThemedText style={styles.partDescription}>
              The parameters and STL export for this part type will be added later. Pick U/Curved shape to try the configurator.
            </ThemedText>
          </View>
        )}
      </ScrollView>

      <Toast message={toast} onHide={() => setToast(null)} />
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
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
    headerSpacer: { width: 40 },
    selectorBlock: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 10 },
    sectionLabel: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 8 },
    previewBox: { marginHorizontal: 16 },
    comingSoon: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      borderStyle: 'dashed',
      backgroundColor: colors.surface,
      padding: 24,
    },
    comingSoonTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: 6 },
    comingSoonText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
    panel: { flex: 1, marginTop: 12 },
    panelContent: { paddingHorizontal: 16, paddingBottom: 40, gap: 12 },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    partTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
    partDescription: { fontSize: 13, color: colors.textSecondary, marginTop: 4, lineHeight: 18 },
    notes: { marginTop: -8, marginBottom: 14, gap: 6 },
    note: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, backgroundColor: colors.primarySoft },
    noteWarning: { backgroundColor: colors.warningSoft },
    errorNote: { marginTop: 0 },
    noteText: { fontSize: 12, color: colors.textStrong, lineHeight: 17 },
    noteTextWarning: { fontSize: 12, color: colors.warningStrong, lineHeight: 17 },
    toggleBlock: { marginBottom: 4 },
    toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
    toggleText: { flex: 1 },
    toggleLabel: { fontSize: 14, fontWeight: '600', color: colors.text },
    toggleDescription: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
    downloadButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 16,
    },
    downloadDisabled: { opacity: 0.6 },
    downloadText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
    footnote: { fontSize: 11, color: colors.textMuted, textAlign: 'center' },
  });
