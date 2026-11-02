import React, { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState, forwardRef } from 'react';
import { ActivityIndicator, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { RotateCcw } from 'lucide-react-native';
import { ThemedText } from '@/components/ThemedText';
import { useColors, useTheme } from '@/context/ThemeContext';
import type { ThemeColors } from '@/constants/Colors';
import { VIEWER_HTML } from '@/lib/3d-lab/viewerHtml.generated';
import type { ViewerMeshPayload } from '@/lib/3d-lab/viewerPayload';

export type PreviewStatus = 'loading' | 'ready' | 'unsupported' | 'error';

export interface PartPreviewHandle {
  resetView: () => void;
}

interface PartPreviewProps {
  /** latest mesh to show; `null` while nothing has been generated yet */
  mesh: ViewerMeshPayload | null;
  busy?: boolean;
  onStatusChange?: (status: PreviewStatus) => void;
}

/**
 * Orbit-controls preview (drag = rotate, pinch = zoom, two fingers = pan). It runs three.js inside a
 * WebView on iOS / Android and inside an iframe on the web, so no native 3D module is needed.
 * The geometry is generated from the parameters in JS and pushed into the page - nothing is loaded from a file.
 */
export const PartPreview = forwardRef<PartPreviewHandle, PartPreviewProps>(function PartPreview({ mesh, busy, onStatusChange }, ref) {
  const colors = useColors();
  const { isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const webViewRef = useRef<WebView>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const pageReady = useRef(false);
  const [status, setStatus] = useState<PreviewStatus>('loading');
  const [reloadKey, setReloadKey] = useState(0);
  const [detail, setDetail] = useState('');

  const theme = useMemo(
    () => ({
      background: isDark ? '#1A1D23' : '#EEF1F5',
      part: isDark ? '#B9C5D3' : '#A9B8C9',
      grid: isDark ? '#4A5260' : '#9AA4B2',
    }),
    [isDark]
  );

  const updateStatus = useCallback(
    (next: PreviewStatus) => {
      setStatus(next);
      onStatusChange?.(next);
    },
    [onStatusChange]
  );

  const send = useCallback((message: object) => {
    if (!pageReady.current) return;
    const text = JSON.stringify(message);
    if (Platform.OS === 'web') {
      iframeRef.current?.contentWindow?.postMessage(text, '*');
    } else {
      webViewRef.current?.injectJavaScript(`window.__lab && window.__lab.handle(${text}); true;`);
    }
  }, []);

  const handlePageMessage = useCallback(
    (raw: string) => {
      let message: { type?: string; code?: string; message?: string };
      try {
        message = JSON.parse(raw);
      } catch {
        return;
      }
      if (message.type === 'ready') {
        pageReady.current = true;
        updateStatus('ready');
      } else if (message.type === 'error') {
        setDetail(message.message ?? '');
        updateStatus(message.code === 'no-webgl' ? 'unsupported' : 'error');
      }
    },
    [updateStatus]
  );

  // keep the newest mesh and theme in refs so they can be replayed once the page says it is ready
  const meshRef = useRef(mesh);
  meshRef.current = mesh;
  const themeRef = useRef(theme);
  themeRef.current = theme;

  useEffect(() => {
    if (status === 'ready' && mesh) send({ type: 'mesh', positions: mesh.positions, normals: mesh.normals, theme });
  }, [mesh, status, send]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (status === 'ready') send({ type: 'theme', theme });
  }, [theme, status, send]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const listener = (event: MessageEvent) => {
      if (event.source === iframeRef.current?.contentWindow && typeof event.data === 'string') handlePageMessage(event.data);
    };
    window.addEventListener('message', listener);
    return () => window.removeEventListener('message', listener);
  }, [handlePageMessage]);

  useImperativeHandle(ref, () => ({ resetView: () => send({ type: 'reset' }) }), [send]);

  const retry = () => {
    pageReady.current = false;
    updateStatus('loading');
    setReloadKey((k) => k + 1);
  };

  const failed = status === 'unsupported' || status === 'error';

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {!failed && (
        Platform.OS === 'web' ? (
          React.createElement('iframe', {
            key: reloadKey,
            ref: (node: HTMLIFrameElement | null) => {
              iframeRef.current = node;
            },
            srcDoc: VIEWER_HTML,
            title: '3D preview',
            style: { border: 0, width: '100%', height: '100%', display: 'block' },
          })
        ) : (
          <WebView
            key={reloadKey}
            ref={webViewRef}
            originWhitelist={['*']}
            source={{ html: VIEWER_HTML }}
            javaScriptEnabled
            domStorageEnabled
            scrollEnabled={false}
            bounces={false}
            overScrollMode="never"
            nestedScrollEnabled
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
            setSupportMultipleWindows={false}
            style={{ backgroundColor: theme.background }}
            onMessage={(event: WebViewMessageEvent) => handlePageMessage(event.nativeEvent.data)}
            onError={() => {
              setDetail('The preview page could not be loaded.');
              updateStatus('error');
            }}
            onRenderProcessGone={() => {
              setDetail('The preview stopped unexpectedly.');
              updateStatus('error');
            }}
            onContentProcessDidTerminate={() => {
              setDetail('The preview stopped unexpectedly.');
              updateStatus('error');
            }}
          />
        )
      )}

      {failed && (
        <View style={styles.notice}>
          <ThemedText style={styles.noticeTitle}>
            {status === 'unsupported' ? '3D preview is not supported on this device' : 'The 3D preview stopped'}
          </ThemedText>
          <ThemedText style={styles.noticeText}>
            {status === 'unsupported'
              ? 'Your device has no WebGL support. You can still adjust the parameters and download the STL.'
              : detail || 'Something went wrong while drawing the part.'}
          </ThemedText>
          {status === 'error' && (
            <TouchableOpacity style={styles.retry} onPress={retry}>
              <ThemedText style={styles.retryText}>Try again</ThemedText>
            </TouchableOpacity>
          )}
        </View>
      )}

      {!failed && (status === 'loading' || (busy && !mesh)) && (
        <View style={styles.overlayCenter} pointerEvents="none">
          <ActivityIndicator color={colors.primaryText} />
        </View>
      )}

      {!failed && (
        <>
          <TouchableOpacity
            style={styles.resetButton}
            onPress={() => send({ type: 'reset' })}
            accessibilityLabel="Reset view"
            disabled={status !== 'ready' || !mesh}
          >
            <RotateCcw color={colors.textStrong} size={16} />
            <ThemedText style={styles.resetText}>Reset view</ThemedText>
          </TouchableOpacity>
          {busy && mesh && (
            <View style={styles.busyChip} pointerEvents="none">
              <ActivityIndicator size="small" color={colors.primaryText} />
              <ThemedText style={styles.busyText}>Updating…</ThemedText>
            </View>
          )}
        </>
      )}
    </View>
  );
});

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, overflow: 'hidden', borderRadius: 14, borderWidth: 1, borderColor: colors.border },
    overlayCenter: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
    resetButton: {
      position: 'absolute',
      top: 10,
      right: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: 16,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      opacity: 0.95,
    },
    resetText: { fontSize: 12, fontWeight: '600', color: colors.textStrong },
    busyChip: {
      position: 'absolute',
      left: 10,
      top: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: 16,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    busyText: { fontSize: 12, color: colors.textSecondary },
    notice: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 8 },
    noticeTitle: { fontSize: 15, fontWeight: '700', color: colors.text, textAlign: 'center' },
    noticeText: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 18 },
    retry: { marginTop: 6, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, backgroundColor: colors.primary },
    retryText: { color: '#FFFFFF', fontWeight: '600', fontSize: 13 },
  });
