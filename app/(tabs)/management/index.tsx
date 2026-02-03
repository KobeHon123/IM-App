import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Clipboard, Calculator, History } from 'lucide-react-native';
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
  ];

  return (
    <SafeAreaView style={styles.container}>
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
                style={styles.programCard}
                onPress={() => {
                  router.push(program.route as any);
                }}
              >
                <View style={styles.iconContainer}>
                  <IconComponent size={48} color="#2563EB" strokeWidth={1.5} />
                </View>
                <ThemedText style={styles.programName}>{program.name}</ThemedText>
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
    justifyContent: 'space-between',
  },
  programCard: {
    width: '47%',
    aspectRatio: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  iconContainer: {
    marginBottom: 12,
  },
  programName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
  },
});
