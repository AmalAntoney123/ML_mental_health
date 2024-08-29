import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Dimensions } from 'react-native';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import database from '@react-native-firebase/database';
import auth from '@react-native-firebase/auth';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../../utils/auth';
import { RootStackParamList } from '../../navigation/types';

const { width: screenWidth } = Dimensions.get('window');

interface SupportGroup {
  id: string;
  name: string;
  description: string;
}

const SocialScreen: React.FC = () => {
  const [stage, setStage] = useState<'instructions' | 'challenge' | 'finished'>('instructions');
  const [joinedGroups, setJoinedGroups] = useState<SupportGroup[]>([]);
  const [taskCompleted, setTaskCompleted] = useState(false);
  const { colors } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  const instructions = "Connect with others by sending a message in any support group. This simple act can help build community and support.";
  const quotes = [
    "Alone we can do so little; together we can do so much.",
    "The strength of the team is each individual member. The strength of each member is the team.",
    "Coming together is a beginning, staying together is progress, and working together is success.",
  ];

  useEffect(() => {
    if (stage === 'challenge') {
      fetchJoinedGroups();
      checkTaskCompletion();
    }
  }, [stage]);

  const fetchJoinedGroups = async () => {
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
      setJoinedGroups(userGroups);
    }
  };

  const checkTaskCompletion = async () => {
    if (!user) return;

    const userRef = database().ref(`users/${user.uid}`);
    const snapshot = await userRef.child('challenges/social').once('value');
    const socialChallengeCount = snapshot.val() || 0;

    const currentLevel = Math.floor((await userRef.child('completedChallenges').once('value')).val() / 7) + 1;

    setTaskCompleted(socialChallengeCount >= currentLevel);
  };

  const handleStart = () => {
    setStage('challenge');
  };

  const handleGroupPress = (group: SupportGroup) => {
    navigation.navigate('ChatScreen', { group, fromSocialChallenge: true });
  };

  const handleFinish = async () => {
    if (user) {
      const userRef = database().ref(`users/${user.uid}`);
      const socialChallengeSnapshot = await userRef.child('challenges/social').once('value');
      const currentSocialChallengeCount = socialChallengeSnapshot.val() || 0;
      
      const completedChallengesSnapshot = await userRef.child('completedChallenges').once('value');
      const currentLevel = Math.floor(completedChallengesSnapshot.val() / 7) + 1;

      if (currentSocialChallengeCount < currentLevel) {
        await userRef.child('challenges/social').set(currentSocialChallengeCount + 1);
        await userRef.child('completedChallenges').set(completedChallengesSnapshot.val() + 1);
      }
    }
    setStage('finished');
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
      case 'challenge':
        return (
          <>
            <Text style={[styles.title, { color: colors.text }]}>Social Challenge</Text>
            <Text style={[styles.text, { color: colors.text }]}>
              Send a message in any support group to complete this challenge.
            </Text>
            {taskCompleted ? (
              <View style={styles.completedContainer}>
                <Icon name="check-circle" size={48} color={colors.primary} />
                <Text style={[styles.completedText, { color: colors.text }]}>
                  Challenge completed! Great job interacting with your support group.
                </Text>
                <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]} onPress={handleFinish}>
                  <Text style={styles.buttonText}>Finish</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.groupListContainer}>
                <Text style={[styles.subtitle, { color: colors.text }]}>Your Support Groups:</Text>
                {joinedGroups.length > 0 ? (
                  <FlatList
                    data={joinedGroups}
                    renderItem={renderGroupItem}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.groupList}
                  />
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
  completedContainer: {
    alignItems: 'center',
  },
  completedText: {
    fontSize: 18,
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
});

export default SocialScreen;