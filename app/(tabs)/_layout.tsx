import { Tabs } from 'expo-router';
import { FolderOpen, Search, User, LayoutGrid } from 'lucide-react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#2563EB',
        tabBarInactiveTintColor: '#6B7280',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E5E7EB',
          paddingTop: 8,
          paddingBottom: 8,
          height: 60,
        },
        tabBarShowLabel: false,
      }}>
      <Tabs.Screen
        name="projects"
        options={{
          tabBarIcon: ({ size, color }) => (
            <FolderOpen size={28} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          tabBarIcon: ({ size, color }) => (
            <Search size={30} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="management"
        options={{
          tabBarIcon: ({ size, color }) => (
            <LayoutGrid size={30} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ size, color }) => (
            <User size={30} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}