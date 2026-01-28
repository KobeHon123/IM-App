import { Tabs } from 'expo-router';
import { FolderOpen, Search, User, LayoutGrid } from 'lucide-react-native';
import { View, TouchableOpacity, Text, StyleSheet, Animated, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEasterEgg } from '@/context/EasterEggContext';
import { useEffect, useRef, useState } from 'react';
import { ThemedText } from '@/components/ThemedText';

function TabsContent() {
  const { showOffWorkCounter, setShowOffWorkCounter, timeLeft, isOffTime, isBeforeTenAM, isWeekend } = useEasterEgg();
  const [cannonActive, setCannonActive] = useState(false);
  const backgroundColor = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();
  
  // Cannon animations
  const cannon1X = useRef(new Animated.Value(0)).current;
  const cannon1Y = useRef(new Animated.Value(0)).current;
  const cannon1Opacity = useRef(new Animated.Value(1)).current;
  
  const cannon2X = useRef(new Animated.Value(0)).current;
  const cannon2Y = useRef(new Animated.Value(0)).current;
  const cannon2Opacity = useRef(new Animated.Value(1)).current;
  
  const cannon3X = useRef(new Animated.Value(0)).current;
  const cannon3Y = useRef(new Animated.Value(0)).current;
  const cannon3Opacity = useRef(new Animated.Value(1)).current;
  
  const cannon4X = useRef(new Animated.Value(0)).current;
  const cannon4Y = useRef(new Animated.Value(0)).current;
  const cannon4Opacity = useRef(new Animated.Value(1)).current;

  const triggerCannonAnimation = () => {
    setCannonActive(true);
    // Reset values
    cannon1X.setValue(0);
    cannon1Y.setValue(0);
    cannon1Opacity.setValue(1);
    cannon2X.setValue(0);
    cannon2Y.setValue(0);
    cannon2Opacity.setValue(1);
    cannon3X.setValue(0);
    cannon3Y.setValue(0);
    cannon3Opacity.setValue(1);
    cannon4X.setValue(0);
    cannon4Y.setValue(0);
    cannon4Opacity.setValue(1);

    // Cannon 1 - Top Left (Red-Orange)
    Animated.parallel([
      Animated.timing(cannon1X, {
        toValue: -80,
        duration: 1200,
        useNativeDriver: true,
      }),
      Animated.timing(cannon1Y, {
        toValue: -120,
        duration: 1200,
        useNativeDriver: true,
      }),
      Animated.timing(cannon1Opacity, {
        toValue: 0,
        duration: 1200,
        useNativeDriver: true,
      }),
    ]).start();

    // Cannon 2 - Top Right (Yellow)
    Animated.parallel([
      Animated.timing(cannon2X, {
        toValue: 80,
        duration: 1200,
        useNativeDriver: true,
      }),
      Animated.timing(cannon2Y, {
        toValue: -120,
        duration: 1200,
        useNativeDriver: true,
      }),
      Animated.timing(cannon2Opacity, {
        toValue: 0,
        duration: 1200,
        useNativeDriver: true,
      }),
    ]).start();

    // Cannon 3 - Bottom Left (Purple)
    Animated.parallel([
      Animated.timing(cannon3X, {
        toValue: -100,
        duration: 1200,
        useNativeDriver: true,
      }),
      Animated.timing(cannon3Y, {
        toValue: 80,
        duration: 1200,
        useNativeDriver: true,
      }),
      Animated.timing(cannon3Opacity, {
        toValue: 0,
        duration: 1200,
        useNativeDriver: true,
      }),
    ]).start();

    // Cannon 4 - Bottom Right (Blue)
    Animated.parallel([
      Animated.timing(cannon4X, {
        toValue: 100,
        duration: 1200,
        useNativeDriver: true,
      }),
      Animated.timing(cannon4Y, {
        toValue: 80,
        duration: 1200,
        useNativeDriver: true,
      }),
      Animated.timing(cannon4Opacity, {
        toValue: 0,
        duration: 1200,
        useNativeDriver: true,
      }),
    ]).start();
    
    // Reset cannon active state after animation completes
    setTimeout(() => {
      setCannonActive(false);
    }, 1200);
  };

  useEffect(() => {
    if (isOffTime) {
      Animated.timing(backgroundColor, {
        toValue: 1,
        duration: 800,
        useNativeDriver: false,
      }).start();
      // Trigger cannon animation at 6:30 PM
      triggerCannonAnimation();
    } else {
      Animated.timing(backgroundColor, {
        toValue: 0,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
  }, [isOffTime]);

  // Trigger cannon when banner is first shown (after 3 taps)
  useEffect(() => {
    if (showOffWorkCounter && !isOffTime) {
      triggerCannonAnimation();
    }
  }, [showOffWorkCounter]);

  const animatedBackgroundColor = backgroundColor.interpolate({
    inputRange: [0, 1],
    outputRange: ['#EF4444', '#10B981'],
  });

  return (
    <View style={[styles.container, Platform.OS === 'web' && { display: 'flex', flexDirection: 'column' }]}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#2563EB',
          tabBarInactiveTintColor: '#6B7280',
          tabBarStyle: {
            backgroundColor: '#FFFFFF',
            borderTopColor: '#E5E7EB',
            paddingTop: 8,
            paddingBottom: Math.max(insets.bottom, 8),
            height: 60 + Math.max(insets.bottom, 0),
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
      
      {showOffWorkCounter && (
        <>
          <Animated.View style={[styles.offWorkCounterContainer, { backgroundColor: animatedBackgroundColor }]}>
            {isWeekend ? (
              <View style={styles.offWorkCounter}>
                <ThemedText style={styles.offWorkCounterText}>Please enjoy your holiday 💢</ThemedText>
              </View>
            ) : isBeforeTenAM ? (
              <View style={styles.offWorkCounter}>
                <ThemedText style={styles.offWorkCounterText}>You really like to work, don't you?</ThemedText>
              </View>
            ) : isOffTime ? (
              <View style={styles.offWorkCounter}>
                <ThemedText style={styles.offWorkCounterTextOff}>Now is off🎉!!!!</ThemedText>
              </View>
            ) : (
              <View style={styles.offWorkCounter}>
                <ThemedText style={styles.offWorkCounterLabel}>Time left:</ThemedText>
                <ThemedText style={styles.offWorkCounterText}>{timeLeft}</ThemedText>
              </View>
            )}
            <TouchableOpacity 
              style={styles.closeCounterButton}
              onPress={() => setShowOffWorkCounter(false)}
            >
              <ThemedText style={styles.closeCounterButtonText}>✕</ThemedText>
            </TouchableOpacity>
          </Animated.View>

          {(isOffTime || cannonActive) && (
            <>
              {/* Cannon 1 - Top Left */}
              <Animated.View
                style={[
                  styles.cannonParticle,
                  styles.cannonParticle1,
                  {
                    transform: [
                      { translateX: cannon1X },
                      { translateY: cannon1Y },
                    ],
                    opacity: cannon1Opacity,
                  },
                ]}
              />
              {/* Cannon 2 - Top Right */}
              <Animated.View
                style={[
                  styles.cannonParticle,
                  styles.cannonParticle2,
                  {
                    transform: [
                      { translateX: cannon2X },
                      { translateY: cannon2Y },
                    ],
                    opacity: cannon2Opacity,
                  },
                ]}
              />
              {/* Cannon 3 - Bottom Left */}
              <Animated.View
                style={[
                  styles.cannonParticle,
                  styles.cannonParticle3,
                  {
                    transform: [
                      { translateX: cannon3X },
                      { translateY: cannon3Y },
                    ],
                    opacity: cannon3Opacity,
                  },
                ]}
              />
              {/* Cannon 4 - Bottom Right */}
              <Animated.View
                style={[
                  styles.cannonParticle,
                  styles.cannonParticle4,
                  {
                    transform: [
                      { translateX: cannon4X },
                      { translateY: cannon4Y },
                    ],
                    opacity: cannon4Opacity,
                  },
                ]}
              />
            </>
          )}
        </>
      )}
    </View>
  );
}

export default function TabLayout() {
  return <TabsContent />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  offWorkCounterContainer: {
    position: 'absolute',
    bottom: 60,
    left: 0,
    right: 0,
    backgroundColor: '#EF4444',
    paddingVertical: 6,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1000,
  },
  offWorkCounterContainerOff: {
    backgroundColor: '#10B981',
  },
  offWorkCounter: {
    flex: 1,
  },
  offWorkCounterLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  offWorkCounterText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  offWorkCounterTextOff: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  closeCounterButton: {
    padding: 8,
  },
  closeCounterButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  cannonParticle: {
    position: 'absolute',
    bottom: 65,
    width: 12,
    height: 12,
    borderRadius: 6,
    zIndex: 999,
  },
  cannonParticle1: {
    left: '10%',
    backgroundColor: '#FF6B6B',
  },
  cannonParticle2: {
    right: '10%',
    backgroundColor: '#FFD93D',
  },
  cannonParticle3: {
    left: '8%',
    backgroundColor: '#A8E6CF',
  },
  cannonParticle4: {
    right: '8%',
    backgroundColor: '#6C9FFF',
  },
});