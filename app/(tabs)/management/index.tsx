import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Clipboard, Calculator, History, FlaskConical, Hourglass } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';

export default function ManagementTab() {
  const router = useRouter();

  const managementPrograms = [
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
      route: null,
      disabled: true,
    },
    {
      id: 'stopwatch',
      name: 'Stopwatch',
      icon: Hourglass,
      route: '/(tabs)/management/stopwatch',
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <ThemedText style={styles.headerTitle}>Management</ThemedText>
      </View>
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.grid}>
          {managementPrograms.map((program) => {
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
                    color={program.disabled ? '#9CA3AF' : '#2563EB'} 
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
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
    aspectRatio: 1.1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  programCardDisabled: {
    backgroundColor: '#F3F4F6',
    borderColor: '#D1D5DB',
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
    color: '#111827',
    textAlign: 'center',
  },
  programNameDisabled: {
    color: '#9CA3AF',
  },
});
