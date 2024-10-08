import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Dimensions, Alert, PermissionsAndroid, Platform } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import database from '@react-native-firebase/database';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '../../utils/auth';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Voice, { SpeechResultsEvent } from '@react-native-voice/voice';
import { RectButton } from 'react-native-gesture-handler';
import Swipeable from 'react-native-gesture-handler/Swipeable';

const { width, height } = Dimensions.get('window');

type JournalEntry = {
  id: string;
  date: string;
  content: string;
};

type GroupedEntry = {
  date: string;
  entries: JournalEntry[];
};

const requestMicrophonePermission = async () => {
  if (Platform.OS === 'android') {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
          title: 'Microphone Permission',
          message: 'We need access to your microphone to record voice notes.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        },
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      console.warn(err);
      return false;
    }
  }
  return true;
};

const JournalScreen: React.FC = () => {
  const { colors } = useTheme();
  const { user, isEmailVerified } = useAuth();
  const [entries, setEntries] = useState<GroupedEntry[]>([]);
  const [newEntry, setNewEntry] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [partialResults, setPartialResults] = useState<string[]>([]);

  useEffect(() => {
    const initializeVoice = async () => {
      try {

        
        const hasPermission = await requestMicrophonePermission();
        
        if (hasPermission) {
          await Voice.destroy();
          await Voice.removeAllListeners();
          Voice.onSpeechResults = onSpeechResults;
          Voice.onSpeechPartialResults = onSpeechPartialResults;
          Voice.onSpeechError = (e) => {
            console.error('Speech recognition error:', e);
          };
        } else {
          Alert.alert('Permission Denied', 'Microphone permission is required to use voice notes.');
        }
      } catch (error) {
        console.error('Error initializing Voice:', error);
      }
    };

    if (user && isEmailVerified) {
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

      initializeVoice();

      return () => {
        Voice.destroy().then(Voice.removeAllListeners);
      };
    }
  }, [user, isEmailVerified]);

  const onSpeechError = (error: any) => {
    console.error('Speech recognition error:', error);
  };

  const onSpeechResults = (e: SpeechResultsEvent) => {
    if (e.value && e.value.length > 0) {
      const text = e.value[0];
      setNewEntry((prevEntry) => prevEntry + ' ' + text);
      setPartialResults([]);
    }
  };

  const onSpeechPartialResults = (e: SpeechResultsEvent) => {
    setPartialResults(e.value ?? []);
  };

  const startVoiceRecording = async () => {
    try {
      const isAvailable = await Voice.isAvailable();
      if (isAvailable) {
        await Voice.start('en-US');
        setIsRecording(true);
      } else {
        Alert.alert('Error', 'Voice recognition is not available on this device');
      }
    } catch (error) {
      console.error('Error starting voice recording:', error);
    }
  };

  const stopVoiceRecording = async () => {
    try {
      await Voice.stop();
      setIsRecording(false);
      setPartialResults([]);
    } catch (error) {
      console.error('Error stopping voice recording:', error);
    }
  };

  const addEntry = () => {
    if (newEntry.trim() && user) {
      const entriesRef = database().ref(`users/${user.uid}/entries`);
      const newEntryRef = entriesRef.push();

      newEntryRef.set({
        date: new Date().toISOString().split('T')[0],
        content: newEntry.trim(),
      });

      setNewEntry('');
    }
  };

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

  if (!user || !isEmailVerified) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.title, { color: colors.text }]}>Please log in or verify your email to access the journal.</Text>
      </View>
    );
  }

  const renderJournalInput = () => {
    const today = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    return (
      <View style={[styles.journalContainer, { backgroundColor: colors.surface }]}>
        <Text style={[styles.dateText, { color: colors.text }]}>{today}</Text>
        <View style={styles.pageLines}>
          {Array.from({ length: 10 }).map((_, index) => (
            <View key={index} style={[styles.line, { borderColor: colors.text }]} />
          ))}
        </View>
        <TextInput
          style={[styles.journalInput, { color: colors.text }]}
          value={newEntry + (partialResults.length > 0 ? ' ' + partialResults[0] : '')}
          onChangeText={setNewEntry}
          placeholder="Write your thoughts..."
          placeholderTextColor={colors.text}
          multiline
        />
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>Journal</Text>
      {renderJournalInput()}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={addEntry}
        >
          <Text style={[styles.buttonText, { color: colors.background }]}>Add Entry</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.voiceButton, { backgroundColor: isRecording ? colors.error : colors.primary }]}
          onPress={isRecording ? stopVoiceRecording : startVoiceRecording}
        >
          <Icon name={isRecording ? "mic-off" : "mic"} size={24} color={colors.background} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={filterEntries()}
        renderItem={renderItem}
        keyExtractor={(item) => item.date}
        style={styles.list}
      />

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
  journalContainer: {
    borderWidth: 1,
    borderColor: '#d0d0d0',
    borderRadius: 8,
    marginBottom: 16,
    height: height * 0.3,
    overflow: 'hidden',
    position: 'relative',
  },
  pageLines: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 24,
  },
  line: {
    borderBottomWidth: 1,
    borderColor: '#a0a0a0',
    opacity: 0.5,
    marginBottom: 24,
  },
  journalInput: {
    flex: 1,
    padding: 16,
    paddingTop: 24,
    fontSize: 16,
    lineHeight: 24,
    textAlignVertical: 'top',
  },
  button: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginRight: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
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
  dateText: {
    position: 'absolute',
    top: 3,
    right: 16,
    fontSize: 14,
    fontStyle: 'italic',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  voiceButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    backgroundColor: 'red',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: '100%',
  },
});

export default JournalScreen;