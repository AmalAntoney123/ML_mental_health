import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, Image, Animated, Modal } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../context/ThemeContext';
import { logout, useAuth } from '../utils/auth';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { getDatabase, ref, get } from 'firebase/database';
import { FAB, Portal, Provider } from 'react-native-paper';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import auth from '@react-native-firebase/auth';
import database from '@react-native-firebase/database';
import LottieView from 'lottie-react-native';

import DashboardScreen from './home/DashboardScreen';
import LeaderboardScreen from './home/LeaderboardScreen';
import JournalScreen from './home/JournalScreen';
import TherapyScreen from './home/TherapyScreen';
import SupportScreen from './home/SupportScreen';
import MoodTrackingScreen from './home/MoodTrackingScreen'; // Assuming this is the correct import for MoodTrackingScreen

type CounterProps = {
  icon: string;
  count: number;
  color: string;
  testID?: string;
  showAnimation?: boolean;
  isBreakingStreak?: boolean;
  onPress?: () => void;
  isStreakCounter?: boolean;
};

type BottomNavItemProps = {
  icon: string;
  label: string;
  isActive: boolean;
  onPress: () => void;
};

const Counter: React.FC<CounterProps> = ({ 
  icon, 
  count, 
  color, 
  testID, 
  showAnimation, 
  isBreakingStreak,
  onPress,
  isStreakCounter 
}) => {
  const { colors } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (showAnimation) {
      Animated.sequence([
        Animated.spring(scaleAnim, {
          toValue: 1.3,
          useNativeDriver: true,
          friction: 3,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          friction: 3,
        }),
      ]).start();
    }

    if (isBreakingStreak) {
      Animated.sequence([
        Animated.timing(opacityAnim, {
          toValue: 0.2,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [showAnimation, isBreakingStreak]);

  const renderContent = () => (
    <Animated.View 
      style={[
        styles.counterContent,
        { 
          transform: [{ scale: scaleAnim }],
          opacity: opacityAnim
        }
      ]} 
    >
      <Icon name={icon} size={20} color={color} />
      <Text style={[styles.counterText, { color: colors.text }]}>
        {count?.toLocaleString() || '0'}
      </Text>
      {isBreakingStreak && (
        <View style={styles.brokenStreakIcon}>
          <Icon name="flash-off" size={16} color={colors.error} />
        </View>
      )}
      {isStreakCounter && (
        <Icon name="chevron-right" size={16} color={colors.text} style={styles.streakArrow} />
      )}
    </Animated.View>
  );

  if (onPress) {
    return (
      <TouchableOpacity 
        onPress={onPress}
        style={[
          styles.counter,
          isStreakCounter && styles.streakCounter
        ]}
        testID={testID}
      >
        {renderContent()}
      </TouchableOpacity>
    );
  }

  return (
    <View 
      style={[
        styles.counter,
        isStreakCounter && styles.streakCounter
      ]}
      testID={testID}
    >
      {renderContent()}
    </View>
  );
};

const BottomNavItem: React.FC<BottomNavItemProps> = ({ icon, label, isActive, onPress }) => {
  const { colors } = useTheme();
  return (
    <TouchableOpacity style={styles.navItem} onPress={onPress}>
      <Icon name={icon} size={24} color={isActive ? colors.primary : colors.gray} />
      <Text style={[styles.navLabel, { color: isActive ? colors.primary : colors.gray }]}>{label}</Text>
    </TouchableOpacity>
  );
};

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;
type ProfileNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Profile'>;
type AdminNavigationProp = NativeStackNavigationProp<RootStackParamList, 'AdminPanel'>;

type BottomTabNavigatorProps = {
  navigation: NativeStackNavigationProp<RootStackParamList>;
};

const Tab = createBottomTabNavigator();

const Header: React.FC<{
  setShowStreakModal: (show: boolean) => void;
  setShowBreakStreakModal: (show: boolean) => void;
  setNewStreak: (streak: number) => void;
  animateModal: () => void;
}> = ({ setShowStreakModal, setShowBreakStreakModal, setNewStreak, animateModal }) => {
  const { colors } = useTheme();
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { user } = useAuth();
  const [userData, setUserData] = useState<any>(null);
  const [points, setPoints] = useState<number>(0);
  const [isElevated, setIsElevated] = useState(false);
  const [streak, setStreak] = useState(0);
  const [showStreakAnimation, setShowStreakAnimation] = useState(false);
  const [showBreakingAnimation, setShowBreakingAnimation] = useState(false);
  const [weeklyPoints, setWeeklyPoints] = useState<number>(0);

  const bounceAnim = useRef(new Animated.Value(1)).current;
  const modalScaleAnim = useRef(new Animated.Value(0)).current;
  const modalOpacityAnim = useRef(new Animated.Value(0)).current;

  const checkAndResetWeeklyPoints = async (data: any) => {
    if (!user) return 0;
    
    const userRef = database().ref(`users/${user.uid}`);
    const now = new Date();
    const lastReset = data.points?.lastReset ? new Date(data.points.lastReset) : null;
    
    // Check if we need to reset (it's a new week or first time)
    const isResetNeeded = !lastReset || 
        lastReset.getDay() > now.getDay() || // If we've passed Sunday (0)
        (now.getTime() - lastReset.getTime()) > 7 * 24 * 60 * 60 * 1000; // Or if it's been more than a week

    if (isResetNeeded) {
        // Reset weekly points but keep total points
        await userRef.child('points').update({
            weekly: 0,
            lastReset: now.toISOString()
        });
        return 0;
    }
    return data.points?.weekly || 0;
  };

  useEffect(() => {
    const fetchUserData = async () => {
      if (user) {
        try {
          const userRef = database().ref(`users/${user.uid}`);
          const unsubscribe = userRef.on('value', async (snapshot) => {
            const data = snapshot.val();
            if (data) {
              // Initialize points structure if it doesn't exist
              if (!data.points) {
                await userRef.child('points').set({
                  total: 0,
                  weekly: 0,
                  lastReset: new Date().toISOString()
                });
                data.points = { total: 0, weekly: 0 };
              }

              const currentWeeklyPoints = await checkAndResetWeeklyPoints(data);
              setUserData(data);
              setPoints(data.points?.total || 0);
              setWeeklyPoints(currentWeeklyPoints);
            }
          });

          return () => userRef.off('value', unsubscribe);
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      }
    };

    fetchUserData();
  }, [user]);

  useEffect(() => {
    const checkElevateStatus = async () => {
      if (!user) return;

      const userRef = database().ref(`users/${user.uid}/emoElevate`);
      const unsubscribe = userRef.on('value', (snapshot) => {
        const elevateData = snapshot.val();
        setIsElevated(elevateData?.active && new Date(elevateData.expiryDate) > new Date());
      });

      return () => userRef.off('value', unsubscribe);
    };
    
    checkElevateStatus();
  }, [user]);

  useEffect(() => {
    const bounceAnimation = Animated.sequence([
      Animated.timing(bounceAnim, {
        toValue: 1.2,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(bounceAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]);

    const loopAnimation = Animated.loop(
      Animated.sequence([
        Animated.delay(5000),
        bounceAnimation,
      ])
    );

    loopAnimation.start();

    return () => loopAnimation.stop();
  }, [bounceAnim]);

  useEffect(() => {
    if (!user) return;

    const checkAndUpdateStreak = async () => {
      const userRef = database().ref(`users/${user.uid}`);
      const snapshot = await userRef.once('value');
      const userData = snapshot.val();
      
      const now = new Date();
      const lastLoginTimestamp = userData?.lastLoginTimestamp || null;
      const currentStreak = userData?.streak || 0;
      
      // Function to check if two dates are the same calendar day
      const isSameDay = (date1: Date, date2: Date) => {
        return date1.getFullYear() === date2.getFullYear() &&
               date1.getMonth() === date2.getMonth() &&
               date1.getDate() === date2.getDate();
      };

      // Function to check if two dates are consecutive days
      const isConsecutiveDay = (date1: Date, date2: Date) => {
        const dayDiff = Math.abs(date2.getTime() - date1.getTime()) / (1000 * 60 * 60 * 24);
        return dayDiff >= 1 && dayDiff < 2;
      };

      if (!lastLoginTimestamp || !isSameDay(new Date(lastLoginTimestamp), now)) {
        if (lastLoginTimestamp && isConsecutiveDay(new Date(lastLoginTimestamp), now)) {
          const newStreakCount = currentStreak + 1;
          await userRef.update({
            streak: newStreakCount,
            lastLoginTimestamp: now.getTime()
          });
          setStreak(newStreakCount);
          setNewStreak(newStreakCount);
          setShowStreakAnimation(true);
          setShowStreakModal(true);
          animateModal();
        } else if (lastLoginTimestamp) {
          await userRef.update({
            streak: 0,
            lastLoginTimestamp: now.getTime()
          });
          setShowBreakingAnimation(true);
          setStreak(0);
          setShowBreakStreakModal(true);
          animateModal();
        } else {
          await userRef.update({
            streak: 1,
            lastLoginTimestamp: now.getTime()
          });
          setStreak(1);
          setNewStreak(1);
          setShowStreakAnimation(true);
          setShowStreakModal(true);
          animateModal();
        }
      } else {
        setStreak(currentStreak);
      }
    };

    checkAndUpdateStreak();
  }, [user, setShowStreakModal, setShowBreakStreakModal, setNewStreak, animateModal]);

  const handleStreakPress = () => {
    navigation.navigate('StreakInfo', {
      streak: streak,
      lastLoginTimestamp: userData?.lastLoginTimestamp || Date.now(),
    });
  };

  const handlePointsPress = () => {
    navigation.navigate('WeeklyHighscores');
  };

  return (
    <View style={[styles.header, { backgroundColor: colors.surface }]} testID="header">
      <View style={styles.headerLeft}>
        <Counter
          icon="local-fire-department"
          count={userData?.streak || 0}
          color={colors.primary}
          onPress={handleStreakPress}
          isStreakCounter
        />
        <Counter
          icon="emoji-events"
          count={weeklyPoints}
          color={colors.secondary}
          testID="points-counter"
          onPress={handlePointsPress}
        />
      </View>
      <View style={styles.headerRight}>
        <TouchableOpacity 
          onPress={() => navigation.navigate('EmoElevate')}
          style={styles.headerItem}
          testID="elevate-icon"
        >
          <Animated.View style={{ transform: [{ scale: bounceAnim }] }}>
            <Image
              source={isElevated ? require('../assets/premium.png') : require('../assets/no-premium.png')}
              style={styles.elevateImage}
              resizeMode="contain"
            />
          </Animated.View>
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => navigation.navigate('Profile')} 
          style={styles.headerItem} 
          testID="profile-icon"
        >
          <Icon name="person" size={24} color={colors.onSurface} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const MainScreen: React.FC = () => {
  const { colors } = useTheme();
  const [showStreakModal, setShowStreakModal] = useState(false);
  const [showBreakStreakModal, setShowBreakStreakModal] = useState(false);
  const [newStreak, setNewStreak] = useState(0);
  const modalScaleAnim = useRef(new Animated.Value(0)).current;
  const modalOpacityAnim = useRef(new Animated.Value(0)).current;

  const animateModal = () => {
    modalScaleAnim.setValue(0);
    modalOpacityAnim.setValue(0);
    Animated.parallel([
      Animated.spring(modalScaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        friction: 8,
        tension: 40,
      }),
      Animated.timing(modalOpacityAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  return (
    <View style={{ flex: 1 }}>
      <TabNavigator 
        setShowStreakModal={setShowStreakModal}
        setShowBreakStreakModal={setShowBreakStreakModal}
        setNewStreak={setNewStreak}
        animateModal={animateModal}
      />
      
      <Modal
        transparent
        visible={showStreakModal}
        onRequestClose={() => setShowStreakModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Animated.View 
            style={[
              styles.modalContent,
              { 
                transform: [{ scale: modalScaleAnim }],
                opacity: modalOpacityAnim,
                backgroundColor: colors.surface,
              }
            ]}
          >
            <Icon name="local-fire-department" size={48} color={colors.primary} />
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {newStreak === 1 ? "Streak Started!" : "Streak Extended!"}
            </Text>
            <Text style={[styles.modalStreak, { color: colors.primary }]}>{newStreak}</Text>
            <Text style={[styles.modalSubtitle, { color: colors.text }]}>
              {newStreak === 1 
                ? "You've started your streak! Come back tomorrow to keep it going!"
                : `${newStreak} days and counting! Keep up the great work!`}
            </Text>
            <TouchableOpacity 
              style={[styles.modalButton, { backgroundColor: colors.primary }]}
              onPress={() => setShowStreakModal(false)}
            >
              <Text style={styles.modalButtonText}>Continue</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>

      <Modal
        transparent
        visible={showBreakStreakModal}
        onRequestClose={() => setShowBreakStreakModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Animated.View 
            style={[
              styles.modalContent,
              { 
                transform: [{ scale: modalScaleAnim }],
                opacity: modalOpacityAnim,
                backgroundColor: colors.surface,
              }
            ]}
          >
            <Icon name="flash-off" size={48} color={colors.error} />
            <Text style={[styles.modalTitle, { color: colors.text }]}>Streak Lost</Text>
            <Text style={[styles.modalSubtitle, { color: colors.text }]}>
              Don't worry! Everyone misses a day sometimes. Start a new streak today!
            </Text>
            <TouchableOpacity 
              style={[styles.modalButton, { backgroundColor: colors.primary }]}
              onPress={() => setShowBreakStreakModal(false)}
            >
              <Text style={styles.modalButtonText}>Start Fresh</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
};

const TabNavigator: React.FC<{
  setShowStreakModal: (show: boolean) => void;
  setShowBreakStreakModal: (show: boolean) => void;
  setNewStreak: (streak: number) => void;
  animateModal: () => void;
}> = ({ setShowStreakModal, setShowBreakStreakModal, setNewStreak, animateModal }) => {
  const { colors } = useTheme();
  const navigation = useNavigation<HomeScreenNavigationProp>();

  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
        <View style={styles.container}>
          <Header 
            setShowStreakModal={setShowStreakModal}
            setShowBreakStreakModal={setShowBreakStreakModal}
            setNewStreak={setNewStreak}
            animateModal={animateModal}
          />
          <Tab.Navigator
            screenOptions={({ route }) => ({
              headerShown: false,
              tabBarIcon: ({ color, size }) => {
                let iconName: string = 'circle';
                if (route.name === 'Dashboard') iconName = 'dashboard';
                else if (route.name === 'Journal') iconName = 'book';
                else if (route.name === 'Therapy') iconName = 'healing';
                else if (route.name === 'Support') iconName = 'group';
                return <Icon name={iconName} size={size} color={color} />;
              },
              tabBarActiveTintColor: colors.primary,
              tabBarInactiveTintColor: colors.text,
              tabBarStyle: { 
                backgroundColor: colors.background,
                paddingBottom: 8,
                height: 60,
                paddingTop: 8,
              },
            })}
            initialRouteName="Dashboard"
          >
            <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ tabBarTestID: "dashboard-tab" }} />
            <Tab.Screen name="Journal" component={JournalScreen} options={{ tabBarTestID: "journal-tab" }} />
            <Tab.Screen
              name=" "
              options={{
                tabBarIcon: () => (
                  <FAB
                    icon={() => <Icon name="mood" size={24} color={colors.primary} />}
                    onPress={() => navigation.navigate('MoodTracking')}
                    style={[styles.fab, {backgroundColor: colors.onPrimary}]}
                    testID="mood-tracking-fab"
                  />
                ),
              }}
            >
              {() => null}
            </Tab.Screen>
            <Tab.Screen name="Therapy" component={TherapyScreen} options={{ tabBarTestID: "therapy-tab" }} />
            <Tab.Screen name="Support" component={SupportScreen} options={{ tabBarTestID: "support-tab" }} />
          </Tab.Navigator>
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    height: 60,
    backgroundColor: 'transparent',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  headerItem: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  counter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  counterContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  counterText: {
    marginLeft: 4,
    fontWeight: 'bold',
    fontSize: 16,
  },
  elevateImage: {
    width: 24,
    height: 24,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
  },
  navItem: {
    alignItems: 'center',
  },
  navLabel: {
    fontSize: 12,
  },
  sidebar: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 250,
    height: '100%',
    paddingTop: 50,
    paddingLeft: 20,
    paddingRight: 20,
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  drawer: {
    flex: 1,
    paddingTop: 50,
    paddingHorizontal: 20,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  drawerText: {
    marginLeft: 10,
    fontSize: 18,
  },
  fab: {
    position: 'absolute',
    bottom: 3,
    alignSelf: 'center',
    alignItems: 'center',
    borderRadius: 100,
    padding: 6,
  },
  elevateButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brokenStreakIcon: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 2,
  },
  streakCounter: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  streakArrow: {
    marginLeft: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContent: {
    margin: 20,
    padding: 24,
    borderRadius: 16,
    width: '85%',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
    textAlign: 'center',
  },
  modalStreak: {
    fontSize: 48,
    fontWeight: 'bold',
    marginVertical: 16,
  },
  modalSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  modalButton: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
    minWidth: 150,
    alignItems: 'center',
  },
  modalButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default MainScreen;
