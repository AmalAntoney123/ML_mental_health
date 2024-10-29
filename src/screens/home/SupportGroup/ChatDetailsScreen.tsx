import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../../../navigation/types';
import { useTheme } from '../../../context/ThemeContext';
import database from '@react-native-firebase/database';
import auth from '@react-native-firebase/auth';
import Toast from 'react-native-toast-message';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LeaveGroupModal from './LeaveGroupModal';

type ChatDetailsScreenRouteProp = RouteProp<RootStackParamList, 'ChatDetailsScreen'>;

interface GroupDetails {
  description: string;
  createdAt: number;
  createdBy: string;
  members: { [key: string]: boolean };
  name: string;
}

const ChatDetailsScreen: React.FC = () => {
  const { colors } = useTheme();
  const route = useRoute<ChatDetailsScreenRouteProp>();
  const { group } = route.params;
  const [groupDetails, setGroupDetails] = useState<GroupDetails | null>(null);
  const [memberNames, setMemberNames] = useState<{ [key: string]: string }>({});
  const navigation = useNavigation();
  const currentUser = auth().currentUser;
  const [isLeaveModalVisible, setIsLeaveModalVisible] = useState(false);

  useEffect(() => {
    const groupRef = database().ref(`supportGroups/${group.id}`);
    const usersRef = database().ref('users');
    
    const fetchGroupDetails = async () => {
      groupRef.on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
          setGroupDetails(data);
          
          // Fetch member names
          const memberIds = Object.keys(data.members || {});
          if (memberIds.length > 0) {
            memberIds.forEach((id) => {
              usersRef.child(id).child('name').once('value', (snapshot) => {
                const name = snapshot.val();
                if (name) {
                  setMemberNames((prevNames) => ({
                    ...prevNames,
                    [id]: name
                  }));
                } else {
                  console.log(`Name not found for user ${id}`);
                }
              });
            });
          }
        }
      });
    };
  
    fetchGroupDetails();
  
    return () => groupRef.off();
  }, [group.id]);

  const renderMember = ({ item }: { item: string }) => (
    <View style={[styles.memberItem, { backgroundColor: colors.surface }]}>
      <Text style={[styles.memberName, { color: colors.text }]}>{memberNames[item] || item}</Text>
    </View>
  );

  const handleLeaveGroup = async () => {
    setIsLeaveModalVisible(true);
  };

  const handleConfirmLeave = async () => {
    if (!currentUser || !groupDetails) return;

    try {
      // Get user name before removing from group
      const userRef = database().ref(`users/${currentUser.uid}`);
      const userSnapshot = await userRef.once('value');
      const userName = userSnapshot.val()?.name || 'Unknown';

      // Add system message about user leaving
      const messagesRef = database().ref(`supportGroups/${group.id}/messages`);
      await messagesRef.push({
        text: `${userName} has left the group`,
        userId: 'system',
        userName: 'System',
        timestamp: database.ServerValue.TIMESTAMP,
        isSystemMessage: true,
        readBy: { [currentUser.uid]: true },
      });

      // Remove user from group
      await database()
        .ref(`supportGroups/${group.id}/members/${currentUser.uid}`)
        .remove();
      
      await database()
        .ref(`supportGroups/${group.id}/typing/${currentUser.uid}`)
        .remove();

      Toast.show({
        type: 'success',
        text1: 'Left group successfully',
        text2: 'You can join other support groups',
        position: 'bottom',
        visibilityTime: 3000,
      });

      navigation.reset({
        index: 0,
        routes: [
          { name: 'MainScreen' as never },
          { name: 'FindGroupsScreen' as never }
        ],
      });
    } catch (error) {
      console.error('Failed to leave group:', error);
      Toast.show({
        type: 'error',
        text1: 'Failed to leave group',
        text2: 'Please try again',
        position: 'bottom',
        visibilityTime: 3000,
      });
    }
  };

  if (!groupDetails) {
    return <View style={styles.container}><Text>Loading...</Text></View>;
  }

  const memberIds = Object.keys(groupDetails.members || {});

  return (
    <>
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.title, { color: colors.text }]}>{groupDetails.name}</Text>
        <View style={styles.detailsContainer}>
          <Text style={[styles.description, { color: colors.text }]}>
            Description: {groupDetails.description}
          </Text>
          <Text style={[styles.createdAt, { color: colors.text }]}>
            Created: {new Date(groupDetails.createdAt).toLocaleDateString()}
          </Text>
        </View>
        <Text style={[styles.subtitle, { color: colors.text }]}>
          Members ({memberIds.length})
        </Text>
        <FlatList
          data={memberIds}
          renderItem={renderMember}
          keyExtractor={(item) => item}
          contentContainerStyle={styles.listContainer}
          scrollEnabled={false}
        />
        
        <TouchableOpacity
          style={[
            styles.leaveButton, 
            { 
              backgroundColor: colors.error || 'red',
              shadowColor: "#000",
              shadowOffset: {
                width: 0,
                height: 2,
              },
              shadowOpacity: 0.25,
              shadowRadius: 3.84,
              elevation: 5,
            }
          ]}
          onPress={handleLeaveGroup}
        >
          <Icon name="exit-to-app" size={24} color="white" style={styles.leaveIcon} />
          <Text style={styles.leaveButtonText}>Leave Group</Text>
        </TouchableOpacity>
      </ScrollView>
      
      <LeaveGroupModal
        visible={isLeaveModalVisible}
        onClose={() => setIsLeaveModalVisible(false)}
        onConfirm={handleConfirmLeave}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  detailsContainer: {
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    marginBottom: 8,
  },
  createdAt: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 16,
    fontWeight: 'bold',
  },
  listContainer: {
    paddingBottom: 16,
  },
  memberItem: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  memberName: {
    fontSize: 16,
  },
  leaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginTop: 24,
    marginBottom: 32,
    marginHorizontal: 16,
  },
  leaveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
    letterSpacing: 0.5,
  },
  leaveIcon: {
    marginRight: 4,
  },
});

export default ChatDetailsScreen;
