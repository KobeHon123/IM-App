import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Clipboard, Calculator, History, FlaskConical, Hourglass } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { useMemo } from 'react';
import { useColors } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import type { ThemeColors } from '@/constants/Colors';

export default function ManagementTab() {
  const colors = useColors();
  const { role } = useAuth();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const router = useRouter();

  const managementPrograms: {
    id: string;
    name: string;
    icon: typeof Clipboard;
    route: string | null;
    disabled?: boolean;
  }[] = [
    {
      id: 'part-time-timesheet',
      name: 'Part Time\nTimeSheet',
      icon: Clipboard,
      route: '/(tabs)/management/part-time-timesheet',
    },
    {
      id: 'resin-record',
      name: 'Resin\nCalculator',
      icon: Calculator,
      route: '/(tabs)/management/resin-calculator',
    },
    {
      id: 'resin-record-management',
      name: 'Resin Record\nManagement',
      icon: History,
      route: '/(tabs)/management/resin-record-management',
    },
    {
      id: 'quick-test-report',
      name: 'Quick Test\nReport',
      icon: FlaskConical,
      route: '/(tabs)/management/quick-test-report',
    },
    {
      id: 'stopwatch',
      name: 'Stopwatch\nTimer',
      icon: Hourglass,
      route: '/(tabs)/management/stopwatch',
    },
  ];

  return (
<<<<<<< HEAD
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
=======
    <SafeAreaView style={styles.container} edges={['top']}>
>>>>>>> 545897cc8f0debf77bdca2f658ade5a7abf5c977
      <View style={styles.header}>
        <ThemedText style={styles.headerTitle}>Management</ThemedText>
      </View>
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.grid}>
          {managementPrograms.filter((program) => !(role === 'fuhong_worker' && program.id === 'part-time-timesheet')).map((program) => {
            const IconComponent = program.icon;
            return (
              <TouchableOpacity
                key={program.id}
                style={[styles.programCard, program.disabled && styles.programCardDisabled]}
                onPress={() => {
                  if (!program.disabled && program.route) {
                    router.push(program.route as any);
                  }
                }}
                disabled={program.disabled}
              >
                <View style={styles.cardContent}>
                  <IconComponent 
                    size={48} 
                    color={program.disabled ? colors.textMuted : colors.primaryText} 
                    strokeWidth={1.5} 
                    opacity={program.disabled ? 0.5 : 1}
                  />
                  <ThemedText style={[styles.programName, program.disabled && styles.programNameDisabled]}>
                    {program.name}
                  </ThemedText>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.surface,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  programCard: {
    width: '47%',
<<<<<<< HEAD
    aspectRatio: 1,
    backgroundColor: colors.surface,
=======
    aspectRatio: 1.1,
    backgroundColor: '#FFFFFF',
>>>>>>> 545897cc8f0debf77bdca2f658ade5a7abf5c977
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  programCardDisabled: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.borderStrong,
    opacity: 0.5,
  },
  cardContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  programName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    lineHeight: 20,
  },
  programNameDisabled: {
    color: colors.textMuted,
  },
});
