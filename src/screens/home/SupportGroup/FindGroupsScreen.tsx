import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, TextInput } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../../../context/ThemeContext';
import database from '@react-native-firebase/database';
import auth from '@react-native-firebase/auth';
import { useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../../../navigation/types';
import { StackNavigationProp } from '@react-navigation/stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

interface SupportGroup {
  id: string;
  name: string;
  description: string;
  createdAt: number;
  createdBy: string;
  members: { [key: string]: boolean };
  isDeleted?: boolean;
}

type FindGroupsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'FindGroupsScreen'>;

const FindGroupsScreen: React.FC = () => {
  const { colors } = useTheme();
  const [availableGroups, setAvailableGroups] = useState<SupportGroup[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const navigation = useNavigation<FindGroupsScreenNavigationProp>();

  useEffect(() => {
    fetchAvailableGroups();
  }, []);

  const fetchAvailableGroups = async () => {
    try {
      const currentUser = auth().currentUser;
      if (!currentUser) return;

      const supportGroupsRef = database().ref('supportGroups');
      const snapshot = await supportGroupsRef.once('value');
      const groupsData = snapshot.val();

      if (groupsData) {
        const groupsArray: SupportGroup[] = Object.entries(groupsData)
          .map(([id, data]: [string, any]) => ({
            id,
            name: data.name,
            description: data.description,
            createdAt: data.createdAt,
            createdBy: data.createdBy,
            members: data.members || {},
            isDeleted: data.isDeleted || false,
          }))
          .filter(group => !group.members[currentUser.uid] && !group.isDeleted);

        setAvailableGroups(groupsArray);
      }
    } catch (error) {
      console.error('Failed to fetch available groups:', error);
    }
  };

  const handleJoinGroup = async (group: SupportGroup) => {
    try {
      const currentUser = auth().currentUser;
      if (!currentUser) return;

      // Get user name before joining group
      const userRef = database().ref(`users/${currentUser.uid}`);
      const userSnapshot = await userRef.once('value');
      const userName = userSnapshot.val()?.name || 'Unknown';

      // Add the user to the group
      await database()
        .ref(`supportGroups/${group.id}/members/${currentUser.uid}`)
        .set(true);

      // Add system message about user joining
      const messagesRef = database().ref(`supportGroups/${group.id}/messages`);
      await messagesRef.push({
        text: `${userName} has joined the group`,
        userId: 'system',
        userName: 'System',
        timestamp: database.ServerValue.TIMESTAMP,
        isSystemMessage: true,
        readBy: { [currentUser.uid]: true },
      });

      // Navigate to the chat screen
      navigation.replace('ChatScreen', { 
        group: {
          ...group,
          members: {
            ...group.members,
            [currentUser.uid]: true
          },
          lastMessage: null,
          lastMessageTimestamp: null
        }
      });
    } catch (error) {
      console.error('Failed to join group:', error);
      Toast.show({
        type: 'error',
        text1: 'Failed to join group',
        text2: 'Please try again',
        position: 'bottom',
        visibilityTime: 3000,
      });
    }
  };

  const filteredGroups = availableGroups.filter(group =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    group.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderGroupItem = ({ item }: { item: SupportGroup }) => (
    <View style={[styles.groupItem, { backgroundColor: colors.surface }]}>
      <View style={styles.groupInfo}>
        <Text style={[styles.groupName, { color: colors.text }]}>{item.name}</Text>
        <Text style={[styles.groupDescription, { color: colors.text }]}>{item.description}</Text>
      </View>
      <TouchableOpacity
        style={[styles.joinButton, { backgroundColor: colors.primary }]}
        onPress={() => handleJoinGroup(item)}
      >
        <Text style={[styles.joinButtonText, { color: colors.background }]}>Join</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>

      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.title, { color: colors.text }]}>Find New Groups</Text>
        <TextInput
          style={[styles.searchInput, { backgroundColor: colors.surface, color: colors.text }]}
          placeholder="Search groups..."
          placeholderTextColor={colors.text}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <FlatList
          data={filteredGroups}
          renderItem={renderGroupItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
        />
      </View>
    </SafeAreaView>

  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  searchInput: {
    height: 40,
    borderRadius: 20,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  listContainer: {
    paddingBottom: 16,
  },
  groupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginVertical: 8,
    borderRadius: 8,
  },
  groupInfo: {
    flex: 1,
  },
  groupName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  groupDescription: {
    fontSize: 14,
    marginTop: 4,
  },
  joinButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  joinButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default FindGroupsScreen;