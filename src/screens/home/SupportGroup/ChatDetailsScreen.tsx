import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ScrollView } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../../navigation/types';
import { useTheme } from '../../../context/ThemeContext';
import database from '@react-native-firebase/database';

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

  if (!groupDetails) {
    return <View style={styles.container}><Text>Loading...</Text></View>;
  }

  const memberIds = Object.keys(groupDetails.members || {});

  return (
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
    </ScrollView>
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
});

export default ChatDetailsScreen;
