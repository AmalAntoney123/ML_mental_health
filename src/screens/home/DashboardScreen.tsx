import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Dimensions, SafeAreaView } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CHALLENGE_SIZE = SCREEN_WIDTH * 0.25;
const LEVEL_CONTAINER_SIZE = SCREEN_WIDTH * 0.9;

type Challenge = {
  id: string;
  title: string;
  icon: string;
  completed: boolean;
};

type LevelData = {
  level: number;
  challenges: Challenge[];
};

const DashboardScreen: React.FC = () => {
  const { colors } = useTheme();
  const navigation = useNavigation();

  const [userStreak, setUserStreak] = useState(7);
  const [userLevel, setUserLevel] = useState(3);
  const [userPoints, setUserPoints] = useState(100);
  const flatListRef = useRef<FlatList>(null);

  const baseChallenges: Omit<Challenge, 'id' | 'completed'>[] = [
    { title: 'Mindfulness', icon: 'self-improvement' },
    { title: 'Gratitude', icon: 'favorite' },
    { title: 'Exercise', icon: 'fitness-center' },
    { title: 'Social', icon: 'people' },
    { title: 'Nutrition', icon: 'restaurant' },
    { title: 'Sleep', icon: 'nightlight' },
    { title: 'Hydration', icon: 'local-drink' },
  ];

  const generateLevels = useCallback((numLevels: number): LevelData[] => {
    return Array.from({ length: numLevels }, (_, levelIndex) => ({
      level: levelIndex + 1,
      challenges: baseChallenges.map((challenge, index) => ({
        ...challenge,
        id: `${levelIndex + 1}-${index + 1}`,
        completed: levelIndex + 1 < userLevel || (levelIndex + 1 === userLevel && index < userStreak % baseChallenges.length),
      })),
    }));
  }, [userLevel, userStreak]);

  const levels = generateLevels(10);
  const lastCompletedLevelIndex = levels.findIndex(level => level.level === userLevel) - 1;

  useEffect(() => {
    if (flatListRef.current && lastCompletedLevelIndex >= 0) {
      flatListRef.current.scrollToIndex({
        index: lastCompletedLevelIndex,
        animated: false,
      });
    }
  }, []);

  const renderChallenge = ({ item, index }: { item: Challenge; index: number }) => {
    const isLocked = !item.completed;
  
    return (
      <View style={styles.challengeWrapper}>
        <TouchableOpacity
          style={[
            styles.challengeItem,
            {
              backgroundColor: isLocked ? colors.disabledBackground : colors.primary,
            },
          ]}
          onPress={() => {
            if (!isLocked) {
              // navigation.navigate('ChallengeDetails', { challengeId: item.id });
            }
          }}
          disabled={isLocked}
        >
          <Icon name={item.icon} size={36} color={isLocked ? colors.disabled : colors.onPrimary} />
          {isLocked && <Icon name="lock" size={24} color={colors.disabled} style={styles.lockIcon} />}
        </TouchableOpacity>
        <Text style={[styles.challengeText, { color: isLocked ? colors.disabled : colors.text }]}>{item.title}</Text>
        {!isLocked && (
          <View style={[styles.banner, { backgroundColor: colors.onBackground }]}>
            <Icon name="check" size={16} color={colors.secondary} />
          </View>
        )}
      </View>
    );
  };
  

  const renderLevel = ({ item, index }: { item: LevelData; index: number }) => {
    const isLocked = item.level > userLevel;
    const allChallengesCompleted = item.challenges.every(challenge => challenge.completed);
    const levelWrapperStyle = [
      styles.levelWrapper,
      { marginTop: index === 0 ? 20 : 5 }
    ];

    return (
      <View style={levelWrapperStyle}>
        <View style={[styles.levelContainer, { backgroundColor: colors.secondaryBackground }]}>
          <View style={styles.levelHeaderContainer}>
            {index === 0 ? (
              <View style={[styles.levelTextContainer, { backgroundColor: isLocked ? colors.disabledBackground : colors.secondary }]}>
                <Text style={[styles.levelText, { color: isLocked ? colors.disabled : colors.onPrimary }]}>Level {item.level}</Text>
              </View>
            ) : (
              <>
                <View style={[styles.levelIconContainer, { backgroundColor: isLocked ? colors.disabledBackground : colors.background }]}>
                  <Icon
                    name="emoji-events"
                    size={40}
                    color={isLocked ? colors.disabled : colors.primary}
                  />
                </View>
                <View style={[styles.levelTextContainer, { backgroundColor: isLocked ? colors.disabledBackground : colors.secondary }]}>
                  <Text style={[styles.levelText, { color: isLocked ? colors.disabled : colors.onPrimary }]}>Level {item.level}</Text>
                </View>
              </>
            )}
          </View>
          <View style={styles.challengesContainer}>
            {item.challenges.map((challenge, challengeIndex) => (
              <View key={challenge.id} style={styles.challengeWrapper}>
                {renderChallenge({ item: challenge, index: challengeIndex })}
              </View>
            ))}
          </View>
        </View>
        {allChallengesCompleted && index < levels.length - 1 && (
          <View style={styles.nextLevelArrow}>
            <Icon name="arrow-downward" size={40} color={colors.primary} />
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Welcome Back, User</Text>
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
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  pointsText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  userLevelContainer: {
    padding: 8,
    borderRadius: 20,
  },
  userLevelText: {
    fontSize: 16,
    fontWeight: 'bold',
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
    top: -90,  // Adjust this value to control how much the icon overlaps
    width: 100,  // Adjust size as needed
    height: 100,  // Adjust size as needed
    borderRadius: 100,  // Half of width/height to make it circular
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 0,
  },
  levelTextContainer: {
    paddingHorizontal: 24,
    paddingVertical: 2,
    borderRadius: 20,
    marginTop: -6,  // Adjust this to fine-tune vertical position
  },
  levelText: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    elevation: 3,
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
  fullWidthChallenge: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 10,
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
  nextLevelArrow: {
    alignSelf: 'center',
    marginTop: 20,
  },

});

export default DashboardScreen;
