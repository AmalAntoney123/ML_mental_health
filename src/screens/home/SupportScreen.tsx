import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, RefreshControl, TextInput } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../../context/ThemeContext';
import database from '@react-native-firebase/database';
import auth from '@react-native-firebase/auth';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/types';
import { StackNavigationProp } from '@react-navigation/stack';
import { HfInference } from '@huggingface/inference';
import { HUGGINGFACE_API_KEY } from '../../config';

interface SupportGroup {
  id: string;
  name: string;
  description: string;
  createdAt: number;
  createdBy: string;
  members: { [key: string]: boolean };
  lastMessage: string | null;
  lastMessageTimestamp: number | null;
  messages?: {
    [key: string]: {
      readBy: { [key: string]: boolean };
      text: string;
      timestamp: number;
      userId: string;
      userName: string;
    };
  };
}

type SupportScreenNavigationProp = StackNavigationProp<RootStackParamList, 'SupportScreen'>;

const SupportScreen: React.FC = () => {
  const { colors } = useTheme();
  const [joinedGroups, setJoinedGroups] = useState<SupportGroup[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation<SupportScreenNavigationProp>();

  const getFilteredGroups = (groups: SupportGroup[]) => {
    return groups.filter(group =>
      (group.name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
      (group.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
    );
  };

  const fetchJoinedGroups = async () => {
    try {
      const currentUser = auth().currentUser;
      if (!currentUser) {
        console.log('No current user');
        return;
      }

      const supportGroupsRef = database().ref('supportGroups');
      const snapshot = await supportGroupsRef.once('value');
      const groupsData = snapshot.val();

      if (groupsData) {
        const groupsArray: SupportGroup[] = Object.entries(groupsData)
          .map(([id, data]: [string, any]) => ({
            id,
            name: data.name || '',
            description: data.description || '',
            createdAt: data.createdAt || 0,
            createdBy: data.createdBy || '',
            members: data.members || {},
            lastMessage: data.lastMessage || null,
            lastMessageTimestamp: data.lastMessageTimestamp || null,
            messages: data.messages || {}
          }))
          .filter(group => group.members[currentUser.uid]);

        setJoinedGroups(groupsArray);
      } else {
        setJoinedGroups([]);
      }
    } catch (error) {
      console.error('Failed to fetch joined groups:', error);
      setJoinedGroups([]);
    } finally {
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchJoinedGroups();
    }, [fetchJoinedGroups])
  );
  
  useEffect(() => {
    fetchJoinedGroups();
  }, []);

  const handleGroupPress = (group: SupportGroup) => {
    navigation.navigate('ChatScreen', { group, fromSocialChallenge: false });  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchJoinedGroups();
  };

  const filteredGroups = (groups: SupportGroup[]) => {
    return groups.filter(group =>
      (group.name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
      (group.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
    );
  };

  const getUnreadCount = (group: SupportGroup) => {
    const currentUser = auth().currentUser;
    if (!currentUser || !group.messages) return 0;

    return Object.values(group.messages).filter(
      message => !message.readBy?.[currentUser.uid]
    ).length;
  };

  const renderGroupItem = ({ item }: { item: SupportGroup }) => (
    <TouchableOpacity
      style={[styles.option, { backgroundColor: colors.surface }]}
      onPress={() => handleGroupPress(item)}
    >
      <Icon name="group" size={24} color={colors.primary} />
      <View style={styles.groupInfo}>
        <View style={styles.groupHeader}>
          <Text style={[styles.optionTitle, { color: colors.text }]}>{item.name}</Text>
          {getUnreadCount(item) > 0 && (
            <View style={[styles.unreadBadge, { backgroundColor: colors.primary }]}>
              <Text style={[styles.unreadCount, { color: colors.background }]}>
                {getUnreadCount(item)}
              </Text>
            </View>
          )}
        </View>
        <Text style={[styles.optionDescription, { color: colors.text }]}>{item.description}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>Support Groups</Text>
      <View style={styles.searchContainer}>
        <TextInput
          style={[styles.searchInput, { backgroundColor: colors.surface, color: colors.text }]}
          placeholder="Search groups..."
          placeholderTextColor={colors.text}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('FindGroupsScreen')}
        >
          <Icon name="add" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>
      {/* AI Chat Card */}
      <TouchableOpacity 
        style={[styles.aiChatCard, { backgroundColor: colors.surface }]}
        onPress={() => navigation.navigate('AIChatScreen')}
      >
        <View style={styles.aiChatContent}>
          <Icon name="psychology" size={32} color={colors.primary} />
          <View style={styles.aiChatInfo}>
            <Text style={[styles.aiChatTitle, { color: colors.text }]}>
              Emo Assistant
            </Text>
            <Text style={[styles.aiChatDescription, { color: colors.text }]}>
              Your 24/7 mental health companion. Share your thoughts and get supportive responses.
            </Text>
          </View>
        </View>
      </TouchableOpacity>
      {joinedGroups.length === 0 ? (
        <View style={styles.noGroupsContainer}>
          <Text style={[styles.noGroupsText, { color: colors.text }]}>You haven't joined any groups yet.</Text>
          <TouchableOpacity
            style={[styles.joinButton, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate('FindGroupsScreen')}
          >
            <Text style={[styles.joinButtonText, { color: colors.background }]}>Join Groups</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={getFilteredGroups(joinedGroups)}
          renderItem={renderGroupItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
            />
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    paddingHorizontal: 16,
    marginRight: 8,
  },
  addButton: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  noGroupsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noGroupsText: {
    fontSize: 16,
    marginBottom: 16,
    textAlign: 'center',
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
  listContainer: {
    paddingBottom: 16,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginVertical: 8,
    borderRadius: 8,
  },
  groupInfo: {
    marginLeft: 16,
    flex: 1,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  optionDescription: {
    fontSize: 14,
    marginTop: 4,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadCount: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  aiChatCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
  },
  aiChatContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  aiChatInfo: {
    marginLeft: 16,
    flex: 1,
  },
  aiChatTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  aiChatDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
});

export default SupportScreen;