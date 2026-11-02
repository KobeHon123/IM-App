import React, { useMemo, useRef } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';
import Svg, { Path, G, Rect, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useColors } from '@/context/ThemeContext';
import type { ThemeColors } from '@/constants/Colors';
import type { LabParameters } from '@/lib/3d-lab/types';

interface PartPreviewProps {
  partTypeId: string;
  params: LabParameters;
  onResetView?: () => void;
}

export function PartPreview({ partTypeId, params, onResetView }: PartPreviewProps) {
  const colors = useColors();
  const panRef = useRef({ x: 0, y: 0, scale: 1 });

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          panRef.current = { ...panRef.current };
        },
        onPanResponderMove: (_, gestureState) => {
          panRef.current = {
            x: panRef.current.x + gestureState.dx / 2,
            y: panRef.current.y + gestureState.dy / 2,
            scale: panRef.current.scale,
          };
        },
      }),
    []
  );

  if (partTypeId !== 'curved-shape') {
    return (
      <View style={[styles.previewShell, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
        <View style={styles.emptyState}>
          <View style={[styles.emptyBadge, { backgroundColor: colors.primarySoft }]}>
            <View style={[styles.badgeDot, { backgroundColor: colors.primary }]} />
          </View>
          <View style={styles.emptyTextBox}>
            <View style={[styles.emptyLine, { backgroundColor: colors.borderStrong }]} />
            <View style={[styles.emptyLineShort, { backgroundColor: colors.border }]} />
          </View>
        </View>
      </View>
    );
  }

  const innerRadius = (params.handleDiameter + 2) / 2;
  const outerRadius = innerRadius + 2.5;
  const halfHeight = Number(params.height) / 2;
  const profileW = outerRadius * 2.2;
  const profileH = 180;

  const pathD = [
    `M ${120 - outerRadius * 1.8} ${100 + halfHeight * 0.22}`,
    `L ${120 - outerRadius * 1.4} ${100 + halfHeight * 0.18}`,
    `L ${120 - innerRadius * 1.3} ${100 + halfHeight * 0.04}`,
    `L ${120 - innerRadius * 0.98} ${100 - halfHeight * 0.2}`,
    `L ${120 + innerRadius * 0.98} ${100 - halfHeight * 0.2}`,
    `L ${120 + innerRadius * 1.3} ${100 + halfHeight * 0.04}`,
    `L ${120 + outerRadius * 1.4} ${100 + halfHeight * 0.18}`,
    `L ${120 + outerRadius * 1.8} ${100 + halfHeight * 0.22}`,
  ].join(' ');

  return (
    <View
      style={[styles.previewShell, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}
      {...panResponder.panHandlers}
    >
      <View style={styles.previewFrame}>
        <Svg width="100%" height="100%" viewBox="0 0 320 240">
          <Defs>
            <LinearGradient id="surfaceGrad" x1="0" x2="1">
              <Stop offset="0%" stopColor={colors.primaryMuted} />
              <Stop offset="100%" stopColor={colors.primary} />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="320" height="240" fill={colors.surfaceMuted} />
          <G transform={`translate(${panRef.current.x}, ${panRef.current.y})`}>
            <Path d={pathD} fill="url(#surfaceGrad)" opacity={0.9} />
            <Path
              d={`M ${120 - outerRadius * 1.9} ${100 - halfHeight * 0.1} Q ${120} ${100 + halfHeight * 0.8} ${120 + outerRadius * 1.9} ${100 - halfHeight * 0.1}`}
              fill="none"
              stroke={colors.primaryStrongText}
              strokeWidth={1.2}
              opacity={0.37}
            />
            <Circle cx={120} cy={100} r={innerRadius * 1.08} fill="none" stroke={colors.borderStrong} strokeWidth={1.2} opacity={0.55} />
            <Circle cx={120} cy={100} r={outerRadius * 1.08} fill="none" stroke={colors.borderStrong} strokeWidth={1} opacity={0.4} />
          </G>
        </Svg>
      </View>
      <View style={styles.resetWrap}>
        <View style={styles.resetButton} onTouchEnd={onResetView} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  previewShell: {
    borderWidth: 1,
    borderRadius: 20,
    overflow: 'hidden',
    minHeight: 280,
  },
  previewFrame: {
    width: '100%',
    height: 280,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  emptyBadge: {
    width: 54,
    height: 54,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeDot: {
    width: 12,
    height: 12,
    borderRadius: 12,
  },
  emptyTextBox: {
    width: 120,
    gap: 8,
    alignItems: 'center',
  },
  emptyLine: {
    height: 10,
    width: 120,
    borderRadius: 999,
  },
  emptyLineShort: {
    height: 8,
    width: 72,
    borderRadius: 999,
  },
  resetWrap: {
    position: 'absolute',
    right: 12,
    bottom: 12,
  },
  resetButton: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(17, 24, 39, 0.15)',
  },
});
