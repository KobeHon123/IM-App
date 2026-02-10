import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Plus, MapPin, Package, Calendar as CalendarIcon } from 'lucide-react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useData } from '@/hooks/useData';
import VenueTab from './VenueTab';
import PartTab from './PartTab';
import CalendarTabSimplified from './CalendarTabSimplified';
import { ThemedText } from '@/components/ThemedText';

export default function ProjectDetailScreen() {
  const { id } = useLocalSearchParams();
  const { projects } = useData();
  const [activeTab, setActiveTab] = useState<'venue' | 'part' | 'calendar'>('venue');

  const project = projects.find((p) => p.id === id);

  if (!project) {
    return (
      <SafeAreaView style={styles.container}>
        <ThemedText style={styles.notFoundText}>Project not found</ThemedText>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            console.log('Navigating back from project ID:', id);
            router.back();
          }}
        >
          <ArrowLeft color="#6B7280" size={24} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <ThemedText style={styles.headerTitle}>{project.name}</ThemedText>
          <ThemedText style={styles.headerSubtitle}>PIC: {project.pic}</ThemedText>
        </View>
      </View>
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'venue' && styles.activeTab]}
          onPress={() => {
            console.log('Switching to venue tab');
            setActiveTab('venue');
          }}
        >
          <MapPin color={activeTab === 'venue' ? '#2563EB' : '#6B7280'} size={20} />
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
          <Package color={activeTab === 'part' ? '#2563EB' : '#6B7280'} size={20} />
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
          <CalendarIcon color={activeTab === 'calendar' ? '#2563EB' : '#6B7280'} size={20} />
          <ThemedText style={[styles.tabText, activeTab === 'calendar' && styles.activeTabText]}>
            Calendar
          </ThemedText>
        </TouchableOpacity>
      </View>
      {activeTab === 'venue' && <VenueTab projectId={id as string} />}
      {activeTab === 'part' && <PartTab projectId={id as string} />}
      {activeTab === 'calendar' && <CalendarTabSimplified projectId={id as string} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  notFoundText: {
    fontSize: 18,
    color: '#6B7280',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
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
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
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
    borderBottomColor: '#2563EB',
  },
  tabText: {
    fontSize: 16,
    color: '#6B7280',
    marginLeft: 8,
  },
  activeTabText: {
    color: '#2563EB',
    fontWeight: '600',
  },
});