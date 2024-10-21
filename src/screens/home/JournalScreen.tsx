import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, PermissionsAndroid, Platform } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import database from '@react-native-firebase/database';
import { useAuth } from '../../utils/auth';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Voice, { SpeechResultsEvent } from '@react-native-voice/voice';
import { useNavigation, NavigationProp } from '@react-navigation/native';

// Define your navigation param list type
type RootStackParamList = {
  Journal: undefined;
  JournalHistory: undefined;
  // Add other screens here
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
  const [newEntry, setNewEntry] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [partialResults, setPartialResults] = useState<string[]>([]);
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

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
      initializeVoice();
    }

    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, [user, isEmailVerified]);

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
          {Array.from({ length: 20 }).map((_, index) => (
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

  if (!user || !isEmailVerified) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.title, { color: colors.text }]}>Please log in or verify your email to access the journal.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>Journal</Text>
      {renderJournalInput()}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.iconButton, { backgroundColor: colors.primary }]}
          onPress={() => navigation.navigate('JournalHistory')}
        >
          <Icon name="history" size={24} color={colors.background} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.textButton, { backgroundColor: colors.primary }]}
          onPress={addEntry}
        >
          <Text style={[styles.buttonText, { color: colors.background }]}>Add Entry</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.iconButton, { backgroundColor: isRecording ? colors.error : colors.primary }]}
          onPress={isRecording ? stopVoiceRecording : startVoiceRecording}
        >
          <Icon name={isRecording ? "mic-off" : "mic"} size={24} color={colors.background} />
        </TouchableOpacity>
      </View>
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
  journalContainer: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d0d0d0',
    borderRadius: 8,
    marginBottom: 16,
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
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textButton: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 16,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  dateText: {
    position: 'absolute',
    top: 3,
    right: 16,
    fontSize: 14,
    fontStyle: 'italic',
  },
});

export default JournalScreen;
