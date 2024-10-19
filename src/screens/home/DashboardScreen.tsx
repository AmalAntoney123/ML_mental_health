import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Dimensions, SafeAreaView, Platform, Alert } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { RootStackParamList } from '../../navigation/types';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import database, { FirebaseDatabaseTypes } from '@react-native-firebase/database';
import { useAuth } from '../../utils/auth';
import PushNotification from 'react-native-push-notification';
import { PermissionsAndroid } from 'react-native';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CHALLENGE_SIZE = SCREEN_WIDTH * 0.25;
const LEVEL_CONTAINER_SIZE = SCREEN_WIDTH * 0.9;

type Challenge = {
  id: string;
  title: string;
  icon: string;
  completed: boolean;
  screens: (keyof RootStackParamList)[];
};

type LevelData = {
  level: number;
  challenges: Challenge[];
};

type DashboardNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Detail'>;

type Props = {
  navigation: DashboardNavigationProp;
};

const DashboardScreen: React.FC<Props> = ({ navigation }) => {
  const { colors } = useTheme();
  const { user } = useAuth();

  const [userLevel, setUserLevel] = useState(1);
  const [completedChallenges, setCompletedChallenges] = useState(0);
  const [challengeData, setChallengeData] = useState({
    mindfulness: 0,
    gratitude: 0,
    exercise: 0,
    social: 0,
    journal: 0,
    sleep: 0,
    positivity: 0,
  });
  const flatListRef = useRef<FlatList>(null);

  const baseChallenges: Omit<Challenge, 'id' | 'completed' | 'screen'>[] = [
    {
      title: 'Mindfulness',
      icon: 'self-improvement',
      screens: ['Breathing', 'Meditation']
    },
    { title: 'Gratitude', icon: 'favorite', screens: ['Gratitude'] },
    { title: 'Exercise', icon: 'fitness-center', screens: ['Exercise'] },
    { title: 'Social', icon: 'people', screens: ['Social'] },
    { title: 'Journal', icon: 'book', screens: ['JournalChallenge'] },
    { title: 'Sleep', icon: 'nightlight', screens: ['Sleep'] },
    { title: 'Positivity', icon: 'sentiment-very-satisfied', screens: ['Positivity'] },
  ];

  const initializeUserChallenges = async (userId: string) => {
    const challengesRef = database().ref(`users/${userId}/challenges`);
    const initialChallenges = {
      mindfulness: 0,
      gratitude: 0,
      exercise: 0,
      social: 0,
      journal: 0,
      sleep: 0,
      positivity: 0,
    };

    try {
      await challengesRef.set(initialChallenges);
      setChallengeData(initialChallenges);
    } catch (error) {
      console.error('Error initializing challenges:', error);
    }
  };

  const requestNotificationPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
          {
            title: "Notification Permission",
            message: "We need your permission to send you notifications.",
            buttonNeutral: "Ask Me Later",
            buttonNegative: "Cancel",
            buttonPositive: "OK"
          }
        );
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          console.log("Notification permission granted");
          return true;
        } else {
          console.log("Notification permission denied");
          return false;
        }
      } catch (err) {
        console.warn(err);
        return false;
      }
    } else if (Platform.OS === 'ios') {
      try {
        const authStatus = await PushNotification.requestPermissions(['alert', 'badge', 'sound']);
        return authStatus.alert && authStatus.badge && authStatus.sound;
      } catch (error) {
        console.error("Error requesting iOS notification permissions:", error);
        return false;
      }
    }
    return true;
  };

  useEffect(() => {
    const initializePermissions = async () => {
      try {
        const hasNotificationPermission = await requestNotificationPermission();
        if (hasNotificationPermission) {
          console.log('Notification permission granted');
          // You can add any notification-related setup here
        } else {
          console.log('Notification permission denied');
          Alert.alert('Permission Denied', 'Notification permission is required to receive reminders and updates.');
        }
      } catch (error) {
        console.error('Error initializing permissions:', error);
      }
    };

    initializePermissions();

    if (!user) return;

    const userId = user.uid;
    const userRef = database().ref(`users/${userId}`);

    const fetchUserData = async () => {
      try {
        const snapshot = await userRef.once('value');
        const userData = snapshot.val();

        if (userData) {
          if (!userData.challenges) {
            await initializeUserChallenges(userId);
          } else {
            setChallengeData(userData.challenges);
          }

          if (userData.completedChallenges !== undefined) {
            setCompletedChallenges(userData.completedChallenges);
          } else {
            // Initialize completedChallenges if it doesn't exist
            await userRef.child('completedChallenges').set(0);
            setCompletedChallenges(0);
          }
        } else {
          console.error('User data not found');
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    fetchUserData();

    // Set up a listener for real-time updates
    const onDataChange = (snapshot: FirebaseDatabaseTypes.DataSnapshot) => {
      const userData = snapshot.val();
      if (userData) {
        if (userData.challenges) {
          setChallengeData(userData.challenges);
        }
        if (userData.completedChallenges !== undefined) {
          setCompletedChallenges(userData.completedChallenges);
        }
      }
    };

    userRef.on('value', onDataChange);

    // Clean up the listener
    return () => userRef.off('value', onDataChange);
  }, []); // Empty dependency array to run only once when component mounts

  useEffect(() => {
    // Update user level based on completed challenges
    // Ensure the user is at least Level 1
    setUserLevel(Math.max(1, Math.floor(completedChallenges / 7) + 1));
  }, [completedChallenges]);

  const generateLevels = useCallback((numLevels: number): LevelData[] => {
    return Array.from({ length: numLevels }, (_, levelIndex) => ({
      level: levelIndex + 1,
      challenges: baseChallenges.map((challenge, index) => ({
        ...challenge,
        id: `${levelIndex + 1}-${index + 1}`,
        completed: challengeData[challenge.title.toLowerCase().replace(/\s+/g, '') as keyof typeof challengeData] > levelIndex,
      })),
    }));
  }, [challengeData]);


  const levels = generateLevels(10);
  const lastCompletedLevelIndex = Math.max(0, userLevel - 2);

  useEffect(() => {
    if (flatListRef.current && lastCompletedLevelIndex >= 0) {
      flatListRef.current.scrollToIndex({
        index: lastCompletedLevelIndex,
        animated: false,
      });
    }
  }, [lastCompletedLevelIndex]);



  const getRandomScreen = (screens: (keyof RootStackParamList)[]) => {
    return screens[Math.floor(Math.random() * screens.length)];
  };
  const renderChallenge = ({ item, index, levelIndex }: { item: Challenge; index: number; levelIndex: number }) => {
    const isLevelOne = levelIndex === 0;
    const challengeKey = item.title.toLowerCase().replace(/\s+/g, '') as keyof typeof challengeData;
    const challengeCount = challengeData[challengeKey];
    const isCompleted = challengeCount > levelIndex;
    const isLocked = !isLevelOne && (levelIndex + 1 > userLevel);

    const handleChallengePress = () => {
      const selectedScreen = getRandomScreen(item.screens);
      if (selectedScreen) {
        navigation.navigate(selectedScreen);
      }
    };

    return (
      <View style={styles.challengeWrapper}>
        <TouchableOpacity
          style={[
            styles.challengeItem,
            {
              backgroundColor: isLocked ? colors.disabledBackground : colors.primary,
            },
          ]}
          onPress={handleChallengePress}
          disabled={isLocked}
        >
          <Icon
            name={item.icon}
            size={36}
            color={isLocked ? colors.disabled : colors.onPrimary}
          />
          {isLocked && <Icon name="lock" size={24} color={colors.disabled} style={styles.lockIcon} />}
        </TouchableOpacity>
        <Text
          style={[
            styles.challengeText,
            { color: isLocked ? colors.disabled : colors.text }
          ]}
        >
          {item.title}
        </Text>
        {isCompleted && (
          <View style={[styles.banner, { backgroundColor: colors.onBackground }]}>
            <Icon name="check" size={16} color={colors.secondary} />
          </View>
        )}
      </View>
    );
  };

  const renderLevel = ({ item, index }: { item: LevelData; index: number }) => {
    const isLocked = item.level > userLevel && item.level !== 1;
    const levelWrapperStyle = [
      styles.levelWrapper,
      { marginTop: index === 0 ? 20 : 5 }
    ];

    return (
      <View style={levelWrapperStyle}>
        <View style={[styles.levelContainer, { backgroundColor: colors.secondaryBackground }]}>
          <View style={styles.levelHeaderContainer}>
            <View
              style={[
                styles.levelTextContainer,
                { backgroundColor: isLocked ? colors.disabledBackground : colors.secondary }
              ]}
            >
              <Text
                style={[
                  styles.levelText,
                  { color: isLocked ? colors.disabled : colors.onPrimary }
                ]}
              >
                Level {item.level}
              </Text>
            </View>
            {index !== 0 && (
              <View
                style={[
                  styles.levelIconContainer,
                  { backgroundColor: isLocked ? colors.disabledBackground : colors.background }
                ]}
              >
                <Icon
                  name="emoji-events"
                  size={40}
                  color={isLocked ? colors.disabled : colors.primary}
                />
              </View>
            )}
          </View>
          <View style={styles.challengesContainer}>
            {item.challenges.map((challenge, challengeIndex) => (
              <View key={challenge.id} style={styles.challengeWrapper}>
                {renderChallenge({ item: challenge, index: challengeIndex, levelIndex: index })}
              </View>
            ))}
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.headerText, { color: colors.onBackground }]}>Welcome Back, User</Text>
      </View>
      <FlatList
        ref={flatListRef}
        data={levels}
        renderItem={renderLevel}
        keyExtractor={(item) => item.level.toString()}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onScrollToIndexFailed={(info) => {
          const wait = new Promise(resolve => setTimeout(resolve, 500));
          wait.then(() => {
            if (flatListRef.current) {
              flatListRef.current.scrollToIndex({ index: info.index, animated: false });
            }
          });
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  listContent: {
    paddingBottom: CHALLENGE_SIZE,
  },
  levelWrapper: {
    marginBottom: 40,
  },
  levelContainer: {
    width: LEVEL_CONTAINER_SIZE,
    padding: 20,
    borderRadius: 20,
    alignSelf: 'center',
  },
  levelHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  levelIconContainer: {
    position: 'absolute',
    top: -90,
    width: 100,
    height: 100,
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 0,
  },
  levelTextContainer: {
    paddingHorizontal: 24,
    paddingVertical: 2,
    borderRadius: 20,
    marginTop: -6,
    zIndex: 3,
  },
  levelText: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    zIndex: 3,
  },
  challengesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  challengeWrapper: {
    width: '50%',
    alignItems: 'center',
    marginVertical: 10,
  },
  challengeItem: {
    width: CHALLENGE_SIZE,
    height: CHALLENGE_SIZE,
    borderRadius: CHALLENGE_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 10,
  },
  challengeText: {
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  lockIcon: {
    position: 'absolute',
    bottom: 16,
    right: 16,
  },
  banner: {
    position: 'absolute',
    top: 0,
    right: 0,
    paddingHorizontal: 4,
    paddingVertical: 4,
    borderRadius: 20
  }
});

export default DashboardScreen;
