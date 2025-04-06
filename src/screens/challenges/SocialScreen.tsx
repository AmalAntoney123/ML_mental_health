import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Dimensions, Animated } from 'react-native';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import database from '@react-native-firebase/database';
import auth from '@react-native-firebase/auth';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../../utils/auth';
import { RootStackParamList } from '../../navigation/types';
import LottieView from 'lottie-react-native';

const { width: screenWidth } = Dimensions.get('window');

interface SupportGroup {
  id: string;
  name: string;
  description: string;
}

const SocialScreen: React.FC = () => {
  const [stage, setStage] = useState<'instructions' | 'social' | 'finished'>('instructions');
  const [showReflectionModal, setShowReflectionModal] = useState(false);
  const [groups, setGroups] = useState<SupportGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [pointsEarned, setPointsEarned] = useState<{
    base: number;
    levelBonus: number;
    total: number;
  } | null>(null);
  const { colors } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const animationRef = useRef<LottieView>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const instructions = "Connect with others by sending a message in any support group. This simple act can help build community and support.";
  const quotes = [
    "Alone we can do so little; together we can do so much.",
    "The strength of the team is each individual member. The strength of each member is the team.",
    "Coming together is a beginning, staying together is progress, and working together is success.",
  ];

  useEffect(() => {
    if (stage === 'social') {
      fetchGroups();
    }
  }, [stage]);

  const fetchGroups = async () => {
    const currentUser = auth().currentUser;
    if (!currentUser) return;

    const groupsRef = database().ref('supportGroups');
    const snapshot = await groupsRef.once('value');
    const groupsData = snapshot.val();

    if (groupsData) {
      const userGroups = Object.entries(groupsData)
        .filter(([_, group]: [string, any]) => group.members && group.members[currentUser.uid])
        .map(([id, group]: [string, any]) => ({
          id,
          name: group.name,
          description: group.description,
        }));
      setGroups(userGroups);
    }
    setLoading(false);
  };

  const handleStart = () => {
    setStage('social');
  };

  const handleGroupPress = (group: SupportGroup) => {
    navigation.navigate('ChatScreen', { group, fromSocialChallenge: true });
  };

  const handleFinish = async () => {
    setShowReflectionModal(false);
    setStage('finished');
    animationRef.current?.play();

    if (!user) {
      console.error('No user found');
      return;
    }

    const userId = user.uid;
    const userRef = database().ref(`users/${userId}`);

    try {
      // Initialize points structure if it doesn't exist
      await initializePoints(userRef);

      const userSnapshot = await userRef.once('value');
      const userData = userSnapshot.val();

      if (!userData) {
        console.error('No user data found');
        return;
      }

      // Initialize challenges if they don't exist
      if (!userData.challenges) {
        await userRef.child('challenges').set({
          gratitude: 0,
          mindfulness: 0,
          breathing: 0,
          exercise: 0,
          sleep: 0,
          social: 0,
          journal: 0
        });
      }

      // Initialize completedChallenges if it doesn't exist
      if (typeof userData.completedChallenges !== 'number') {
        await userRef.child('completedChallenges').set(0);
      }

      const currentLevel = Math.floor((userData.completedChallenges || 0) / 7) + 1;
      const currentSocialCount = userData.challenges?.social || 0;

      if (currentSocialCount < currentLevel) {
        const points = userData.points || { total: 0, weekly: 0, lastReset: new Date().toISOString() };
        
        // Check if points need to be reset
        const lastReset = new Date(points.lastReset);
        const now = new Date();
        const shouldReset = now.getTime() - lastReset.getTime() > 7 * 24 * 60 * 60 * 1000;
        
        if (shouldReset) {
          points.weekly = 0;
          points.lastReset = now.toISOString();
        }

        // Calculate new points
        const basePoints = 100;
        const levelBonus = currentLevel * 50;
        const pointsToAdd = basePoints + levelBonus;

        // Update points
        await userRef.child('points').set({
          total: (points.total || 0) + pointsToAdd,
          weekly: (points.weekly || 0) + pointsToAdd,
          lastReset: points.lastReset
        });

        // Update challenge counts
        await userRef.child('challenges/social').set(currentSocialCount + 1);
        await userRef.child('completedChallenges').set((userData.completedChallenges || 0) + 1);

        // Set points earned for display
        setPointsEarned({
          base: basePoints,
          levelBonus: levelBonus,
          total: pointsToAdd
        });
      }
    } catch (error) {
      console.error('Error updating social and completed challenges count:', error);
    }
  };

  const initializePoints = async (userRef: any) => {
    try {
      const pointsSnapshot = await userRef.child('points').once('value');
      if (!pointsSnapshot.exists()) {
        await userRef.child('points').set({
          total: 0,
          weekly: 0,
          lastReset: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error initializing points:', error);
    }
  };

  const renderGroupItem = ({ item }: { item: SupportGroup }) => (
    <TouchableOpacity
      style={[styles.groupItem, { backgroundColor: colors.surface }]}
      onPress={() => handleGroupPress(item)}
    >
      <Icon name="group" size={24} color={colors.primary} style={styles.groupIcon} />
      <View style={styles.groupInfo}>
        <Text style={[styles.groupName, { color: colors.text }]}>{item.name}</Text>
        <Text style={[styles.groupDescription, { color: colors.text }]} numberOfLines={2}>
          {item.description}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderContent = () => {
    switch (stage) {
      case 'instructions':
        return (
          <>
            <Text style={[styles.text, { color: colors.text }]}>{instructions}</Text>
            <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]} onPress={handleStart}>
              <Text style={styles.buttonText}>Start Challenge</Text>
            </TouchableOpacity>
          </>
        );
      case 'social':
        return (
          <>
            <Text style={[styles.title, { color: colors.text }]}>Social Challenge</Text>
            <Text style={[styles.text, { color: colors.text }]}>
              Send a message in any support group to complete this challenge.
            </Text>
            {groups.length > 0 ? (
              <View style={styles.groupListContainer}>
                <Text style={[styles.subtitle, { color: colors.text }]}>Your Support Groups:</Text>
                <FlatList
                  data={groups}
                  renderItem={renderGroupItem}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={styles.groupList}
                />
              </View>
            ) : (
              <View style={styles.noGroupsContainer}>
                <Text style={[styles.noGroupsText, { color: colors.text }]}>
                  You haven't joined any support groups yet.
                </Text>
                <TouchableOpacity
                  style={[styles.button, { backgroundColor: colors.primary }]}
                  onPress={() => navigation.navigate('FindGroupsScreen')}
                >
                  <Text style={styles.buttonText}>Find Groups</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        );
      case 'finished':
        return (
          <>
            <Icon name="celebration" size={64} color={colors.primary} />
            <Text style={[styles.title, { color: colors.text }]}>Challenge Complete!</Text>
            <Text style={[styles.text, { color: colors.text }]}>
              {quotes[Math.floor(Math.random() * quotes.length)]}
            </Text>
            
          </>
        );
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {renderContent()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  text: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  button: {
    padding: 15,
    borderRadius: 25,
    minWidth: 120,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  groupListContainer: {
    width: '100%',
    flex: 1,
  },
  groupList: {
    flexGrow: 1,
  },
  groupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    marginBottom: 10,
    borderRadius: 8,
  },
  groupIcon: {
    marginRight: 15,
  },
  groupInfo: {
    flex: 1,
  },
  groupName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  groupDescription: {
    fontSize: 14,
  },
  noGroupsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noGroupsText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
});

export default SocialScreen;