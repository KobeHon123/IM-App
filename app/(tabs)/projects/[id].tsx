import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Plus, MapPin, Package, Calendar as CalendarIcon, Table2 } from 'lucide-react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useData } from '@/hooks/useData';
import VenueTab from './VenueTab';
import PartTab from './PartTab';
import CalendarTabSimplified from './CalendarTabSimplified';
import { ThemedText } from '@/components/ThemedText';
import { useColors } from '@/context/ThemeContext';
import type { ThemeColors } from '@/constants/Colors';

export default function ProjectDetailScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const { id } = useLocalSearchParams();
  const { projects } = useData();
  const [activeTab, setActiveTab] = useState<'venue' | 'part' | 'calendar'>('venue');
  const [venueViewMode, setVenueViewMode] = useState<'cards' | 'matrix'>('cards');

  const project = projects.find((p) => p.id === id);

  if (!project) {
    return (
<<<<<<< HEAD
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
=======
      <SafeAreaView style={styles.container} edges={['top']}>
>>>>>>> 545897cc8f0debf77bdca2f658ade5a7abf5c977
        <ThemedText style={styles.notFoundText}>Project not found</ThemedText>
      </SafeAreaView>
    );
  }

  return (
<<<<<<< HEAD
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
=======
    <SafeAreaView style={styles.container} edges={['top']}>
>>>>>>> 545897cc8f0debf77bdca2f658ade5a7abf5c977
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            console.log('Navigating back from project ID:', id);
            router.back();
          }}
        >
          <ArrowLeft color={colors.textSecondary} size={24} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <ThemedText style={styles.headerTitle}>{project.name}</ThemedText>
          <ThemedText style={styles.headerSubtitle}>PIC: {project.pic}</ThemedText>
        </View>
        {activeTab === 'venue' && (
          <TouchableOpacity
            style={[styles.headerModeButton, venueViewMode === 'matrix' && styles.headerModeButtonActive]}
            onPress={() => setVenueViewMode(prev => prev === 'cards' ? 'matrix' : 'cards')}
            accessibilityLabel={venueViewMode === 'matrix' ? 'Switch to venue cards view' : 'Switch to venue matrix view'}
          >
            <Table2 color={venueViewMode === 'matrix' ? '#FFFFFF' : colors.textSecondary} size={20} />
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'venue' && styles.activeTab]}
          onPress={() => {
            console.log('Switching to venue tab');
            setActiveTab('venue');
          }}
        >
          <MapPin color={activeTab === 'venue' ? colors.primaryText : colors.textSecondary} size={20} />
          <ThemedText style={[styles.tabText, activeTab === 'venue' && styles.activeTabText]}>
            Venue
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'part' && styles.activeTab]}
          onPress={() => {
            console.log('Switching to part tab');
            setActiveTab('part');
          }}
        >
          <Package color={activeTab === 'part' ? colors.primaryText : colors.textSecondary} size={20} />
          <ThemedText style={[styles.tabText, activeTab === 'part' && styles.activeTabText]}>
            Part
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'calendar' && styles.activeTab]}
          onPress={() => {
            console.log('Switching to calendar tab');
            setActiveTab('calendar');
          }}
        >
          <CalendarIcon color={activeTab === 'calendar' ? colors.primaryText : colors.textSecondary} size={20} />
          <ThemedText style={[styles.tabText, activeTab === 'calendar' && styles.activeTabText]}>
            Calendar
          </ThemedText>
        </TouchableOpacity>
      </View>
      {activeTab === 'venue' && <VenueTab projectId={id as string} viewMode={venueViewMode} />}
      {activeTab === 'part' && <PartTab projectId={id as string} />}
      {activeTab === 'calendar' && <CalendarTabSimplified projectId={id as string} />}
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  notFoundText: {
    fontSize: 18,
    color: colors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    marginRight: 16,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  headerModeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  headerModeButtonActive: {
    backgroundColor: colors.primary,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginLeft: 8,
  },
  activeTabText: {
    color: colors.primaryText,
    fontWeight: '600',
  },
});