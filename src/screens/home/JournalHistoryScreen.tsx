import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Alert } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import database from '@react-native-firebase/database';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '../../utils/auth';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { RectButton } from 'react-native-gesture-handler';
import Swipeable from 'react-native-gesture-handler/Swipeable';

type JournalEntry = {
  id: string;
  date: string;
  content: string;
};

type GroupedEntry = {
  date: string;
  entries: JournalEntry[];
};

const JournalHistoryScreen: React.FC = () => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [entries, setEntries] = useState<GroupedEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    if (user) {
      const entriesRef = database().ref(`users/${user.uid}/entries`);

      entriesRef.on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const entryList: JournalEntry[] = Object.entries(data).map(([id, entry]: [string, any]) => ({
            id,
            date: entry.date,
            content: entry.content,
          }));

          // Group entries by date
          const groupedEntries = entryList.reduce((acc, entry) => {
            const existingGroup = acc.find(group => group.date === entry.date);
            if (existingGroup) {
              existingGroup.entries.push(entry);
            } else {
              acc.push({ date: entry.date, entries: [entry] });
            }
            return acc;
          }, [] as GroupedEntry[]);

          // Sort grouped entries by date (newest first)
          groupedEntries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

          setEntries(groupedEntries);
        } else {
          setEntries([]);
        }
      });
    }
  }, [user]);

  const deleteEntry = (groupDate: string, entryId: string) => {
    Alert.alert(
      "Delete Entry",
      "Are you sure you want to delete this entry?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Delete",
          onPress: () => {
            if (user) {
              const entryRef = database().ref(`users/${user.uid}/entries/${entryId}`);
              entryRef.remove();
            }
          },
          style: "destructive"
        }
      ]
    );
  };

  const filterEntries = () => {
    return entries.filter((groupedEntry) => {
      const dateMatch = selectedDate ? groupedEntry.date === selectedDate.toISOString().split('T')[0] : true;
      const contentMatch = groupedEntry.entries.some(entry =>
        entry.content.toLowerCase().includes(searchQuery.toLowerCase())
      );
      return dateMatch && contentMatch;
    });
  };

  const SwipeableEntry = ({ item, groupDate }: { item: JournalEntry; groupDate: string }) => {
    const renderRightActions = (progress: any, dragX: any) => {
      return (
        <RectButton style={styles.deleteButton} onPress={() => deleteEntry(groupDate, item.id)}>
          <Icon name="delete" size={24} color="#fff" />
        </RectButton>
      );
    };

    return (
      <Swipeable renderRightActions={renderRightActions}>
        <View style={[styles.entry, { backgroundColor: colors.surface }]}>
          <Text style={[styles.content, { color: colors.text }]}>{item.content}</Text>
        </View>
      </Swipeable>
    );
  };

  const renderItem = ({ item }: { item: GroupedEntry }) => (
    <View style={[styles.groupedEntry, { backgroundColor: colors.surface }]}>
      <Text style={[styles.date, { color: colors.text }]}>{item.date}</Text>
      {item.entries.map((entry) => (
        <SwipeableEntry key={entry.id} item={entry} groupDate={item.date} />
      ))}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>Journal History</Text>
      <View style={styles.searchContainer}>
        <TextInput
          style={[styles.searchInput, { color: colors.text, borderColor: colors.border }]}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search entries..."
          placeholderTextColor={colors.text}
        />
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => setShowDatePicker(true)}
        >
          <Icon name="date-range" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>
      <FlatList
        data={filterEntries()}
        renderItem={renderItem}
        keyExtractor={(item) => item.date}
        style={styles.list}
      />
      {showDatePicker && (
        <DateTimePicker
          value={selectedDate || new Date()}
          mode="date"
          display="default"
          onChange={(event, date) => {
            setShowDatePicker(false);
            if (date) setSelectedDate(date);
          }}
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
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    marginRight: 8,
  },
  dateButton: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
  },
  list: {
    flex: 1,
  },
  entry: {
    padding: 16,
    marginVertical: 1,
    borderRadius: 8,
  },
  date: {
    fontSize: 14,
    marginBottom: 2,
  },
  content: {
    fontSize: 16,
  },
  groupedEntry: {
    padding: 16,
    marginVertical: 8,
    borderRadius: 8,
  },
  deleteButton: {
    backgroundColor: 'red',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: '100%',
  },
});

export default JournalHistoryScreen;
