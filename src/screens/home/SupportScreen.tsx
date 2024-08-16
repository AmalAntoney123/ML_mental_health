import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../../context/ThemeContext';
import database from '@react-native-firebase/database';
import auth from '@react-native-firebase/auth';
import { useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/types';
import { StackNavigationProp } from '@react-navigation/stack';
interface SupportGroup {
  id: string;
  name: string;
  description: string;
  createdAt: number;
  createdBy: string;
  members: { [key: string]: boolean };
  lastMessage: string | null;
  lastMessageTimestamp: number | null;
}

type SupportScreenNavigationProp = StackNavigationProp<RootStackParamList, 'SupportScreen'>;

const SupportScreen: React.FC = () => {
  const { colors } = useTheme();
  const [supportGroups, setSupportGroups] = useState<SupportGroup[]>([]);
  const navigation = useNavigation<SupportScreenNavigationProp>();
  
  useEffect(() => {
    const fetchSupportGroups = async () => {
      try {
        const supportGroupsRef = database().ref('supportGroups');
        const snapshot = await supportGroupsRef.once('value');
        const groupsData = snapshot.val();
        
        if (groupsData) {
          const groupsArray: SupportGroup[] = Object.entries(groupsData).map(([id, data]: [string, any]) => ({
            id,
            name: data.name,
            description: data.description,
            createdAt: data.createdAt,
            createdBy: data.createdBy,
            members: data.members || {},
            lastMessage: data.lastMessage || null,
            lastMessageTimestamp: data.lastMessageTimestamp || null
          }));
          setSupportGroups(groupsArray);
        }
      } catch (error) {
        console.error('Failed to fetch support groups:', error);
      }
    };

    fetchSupportGroups();
  }, []);

  const handleGroupPress = (group: SupportGroup) => {
    navigation.navigate('ChatScreen', { group });
  };

  const renderGroupItem = ({ item }: { item: SupportGroup }) => (
    <TouchableOpacity
      style={[styles.option, { backgroundColor: colors.surface }]}
      onPress={() => handleGroupPress(item)}
    >
      <Icon name="group" size={24} color={colors.primary} />
      <View style={styles.groupInfo}>
        <Text style={[styles.optionTitle, { color: colors.text }]}>{item.name}</Text>
        <Text style={[styles.optionDescription, { color: colors.text }]}>{item.description}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>Support Groups</Text>
      <FlatList
        data={supportGroups}
        renderItem={renderGroupItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
      />
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
});

export default SupportScreen;