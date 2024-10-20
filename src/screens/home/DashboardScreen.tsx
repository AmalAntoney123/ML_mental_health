import React, { useState, useCallback, useRef, useEffect, useMemo, memo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Dimensions, SafeAreaView, Platform, Alert } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { RootStackParamList } from '../../navigation/types';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import database, { FirebaseDatabaseTypes } from '@react-native-firebase/database';
import { useAuth } from '../../utils/auth';
import PushNotification from 'react-native-push-notification';
import { PermissionsAndroid } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

// Memoize the Challenge component
const Challenge = memo(({ item, index, levelIndex, onPress, colors, userLevel, challengeData }: {
  item: Challenge;
  index: number;
  levelIndex: number;
  onPress: () => void;
  colors: any;
  userLevel: number;
  challengeData: any;
}) => {
  const isLevelOne = levelIndex === 0;
  const challengeKey = item.title.toLowerCase().replace(/\s+/g, '') as keyof typeof challengeData;
  const challengeCount = challengeData[challengeKey];
  const isCompleted = challengeCount > levelIndex;
  const isLocked = !isLevelOne && (levelIndex + 1 > userLevel);

  return (
    <View style={styles.challengeWrapper}>
      <TouchableOpacity
        style={[
          styles.challengeItem,
          {
            backgroundColor: isLocked ? colors.disabledBackground : colors.primary,
          },
        ]}
        onPress={onPress}
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
});

// Memoize the Level component
const Level = memo(({ item, index, renderChallenge, colors, userLevel }: {
  item: LevelData;
  index: number;
  renderChallenge: (props: any) => JSX.Element;
  colors: any;
  userLevel: number;
}) => {
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
});

const TutorialOverlay: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { colors } = useTheme();
  return (
    <View style={[StyleSheet.absoluteFill, styles.tutorialOverlay]}>
      <View style={[styles.tutorialContent, {
        backgroundColor: colors.background,
      }]}>
        <Text style={[styles.tutorialText, { color: colors.onBackground }]}>
          Welcome to your Dashboard!
        </Text>
        <Text style={[styles.tutorialSubText, { color: colors.onBackground }]}>
          Here you can see your challenges and progress.
          Complete challenges to level up and unlock new ones!
        </Text>
        <TouchableOpacity
          style={[styles.tutorialButton, { backgroundColor: colors.primary }]}
          onPress={onClose}
        >
          <Text style={[styles.tutorialButtonText, { color: colors.onPrimary }]}>
            Got it!
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const DashboardScreen: React.FC<Props> = ({ navigation }) => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [userName, setUserName] = useState<string>('User');
  const [isFirstTime, setIsFirstTime] = useState<boolean>(true);
  const [challengeData, setChallengeData] = useState({
    mindfulness: 0,
    gratitude: 0,
    exercise: 0,
    social: 0,
    journal: 0,
    sleep: 0,
    positivity: 0,
  });
  const [levels, setLevels] = useState<LevelData[]>([]);
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

  const checkFirstTimeUser = async () => {
    try {
      const hasOpenedDashboard = await AsyncStorage.getItem('hasOpenedDashboard');
      if (hasOpenedDashboard === null) {
        setIsFirstTime(true);
        await AsyncStorage.setItem('hasOpenedDashboard', 'true');
      } else {
        setIsFirstTime(false);
      }
    } catch (error) {
      console.error('Error checking first time dashboard status:', error);
      setIsFirstTime(false);
    }
  };

  checkFirstTimeUser();

  useEffect(() => {
    console.log('DashboardScreen mounted');
    if (!user) {
      console.log('No user found');
      return;
    }

    const userId = user.uid;
    const userRef = database().ref(`users/${userId}`);

    const fetchUserData = async () => {
      try {
        console.log('Fetching user data...');
        const snapshot = await userRef.once('value');
        const userData = snapshot.val();

        if (userData) {
          console.log('User data fetched:', userData);
          setUserName(userData.name || 'User');
          if (!userData.challenges) {
            console.log('No challenges found, initializing...');
            await initializeUserChallenges(userId);
          } else {
            console.log('Setting challenge data:', userData.challenges);
            setChallengeData(userData.challenges);
          }

          if (userData.completedChallenges === undefined) {
            console.log('Initializing completed challenges to 0');
            await userRef.child('completedChallenges').set(0);
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
      console.log('Real-time update received:', userData);
      if (userData) {
        setUserName(userData.name || 'User');
        if (userData.challenges) {
          console.log('Updating challenge data:', userData.challenges);
          setChallengeData(userData.challenges);
        }
      }
    };

    userRef.on('value', onDataChange);

    // Clean up the listener
    return () => {
      console.log('DashboardScreen unmounting, removing listener');
      userRef.off('value', onDataChange);
    };
  }, [user]);

  // Memoize the generateLevels function
  const generateLevels = useMemo(() => (numLevels: number): LevelData[] => {
    return Array.from({ length: numLevels }, (_, levelIndex) => {
      const challenges = baseChallenges.map((challenge, index) => {
        const challengeKey = challenge.title.toLowerCase().replace(/\s+/g, '') as keyof typeof challengeData;
        const completed = challengeData[challengeKey] > levelIndex;
        return {
          ...challenge,
          id: `${levelIndex + 1}-${index + 1}`,
          completed: completed,
        };
      });
      return { level: levelIndex + 1, challenges };
    });
  }, [challengeData]);

  // Calculate user level and completed challenges more efficiently
  const { userLevel, completedChallenges } = useMemo(() => {
    const totalCompleted = Object.values(challengeData).reduce((sum, count) => sum + count, 0);
    return {
      userLevel: Math.max(1, Math.floor(totalCompleted / 7) + 1),
      completedChallenges: totalCompleted,
    };
  }, [challengeData]);

  useEffect(() => {
    console.log('Generating levels with challenge data:', challengeData);
    const generatedLevels = generateLevels(10);
    console.log('Generated levels:', generatedLevels);
    setLevels(generatedLevels);
  }, [challengeData, generateLevels]);

  // Add this new useEffect to set the initial scroll position
  useEffect(() => {
    if (flatListRef.current && levels.length > 0) {
      // Scroll to the current user level minus one (because array is 0-indexed)
      flatListRef.current.scrollToIndex({
        index: Math.max(0, userLevel - 1),
        animated: false,
        viewPosition: 0, // This will position the item at the top of the view
      });
    }
  }, [userLevel, levels]);

  const getRandomScreen = (screens: (keyof RootStackParamList)[]) => {
    return screens[Math.floor(Math.random() * screens.length)];
  };
  const renderChallenge = useCallback(({ item, index, levelIndex }: { item: Challenge; index: number; levelIndex: number }) => {
    const handleChallengePress = () => {
      const selectedScreen = getRandomScreen(item.screens);
      if (selectedScreen) {
        navigation.navigate(selectedScreen);
      }
    };

    return (
      <Challenge
        item={item}
        index={index}
        levelIndex={levelIndex}
        onPress={handleChallengePress}
        colors={colors}
        userLevel={userLevel}
        challengeData={challengeData}
      />
    );
  }, [challengeData, userLevel, colors, navigation]);

  const renderLevel = useCallback(({ item, index }: { item: LevelData; index: number }) => {
    return (
      <Level
        item={item}
        index={index}
        renderChallenge={renderChallenge}
        colors={colors}
        userLevel={userLevel}
      />
    );
  }, [renderChallenge, colors, userLevel]);


  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.headerText, { color: colors.onBackground }]}>Welcome Back, {userName}</Text>
      </View>
      {levels.length > 0 ? (
        <FlatList
          ref={flatListRef}
          data={levels}
          renderItem={renderLevel}
          keyExtractor={(item) => item.level.toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          initialScrollIndex={Math.max(0, userLevel - 1)} // Set initial scroll position
          onScrollToIndexFailed={(info) => {
            const wait = new Promise(resolve => setTimeout(resolve, 500));
            wait.then(() => {
              if (flatListRef.current) {
                flatListRef.current.scrollToIndex({ index: info.index, animated: false });
              }
            });
          }}
        />
      ) : (
        <Text style={[styles.loadingText, { color: colors.text }]}>Loading levels...</Text>
      )}
      {isFirstTime && (
        <TutorialOverlay onClose={() => setIsFirstTime(false)} />
      )}
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
    fontSize: 20,
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
  },
  loadingText: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 20,
  },
  tutorialOverlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tutorialContent: {
    padding: 20,
    borderRadius: 10,
    width: '80%',
    alignItems: 'center',
  },
  tutorialText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  tutorialSubText: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  tutorialButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  tutorialButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default memo(DashboardScreen);
