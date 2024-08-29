import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../utils/auth';
import database from '@react-native-firebase/database';
import Toast from 'react-native-toast-message';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Voice, { SpeechResultsEvent } from '@react-native-voice/voice';

const { width, height } = Dimensions.get('window');

const JournalChallengeScreen: React.FC = () => {
  const [stage, setStage] = useState<'instructions' | 'writing' | 'finished'>('instructions');
  const [journalEntry, setJournalEntry] = useState('');
  const { colors } = useTheme();
  const { user } = useAuth();
  const [isRecording, setIsRecording] = useState(false);
  const [partialResults, setPartialResults] = useState<string[]>([]);

  const instructions = "Take a moment to reflect on your day. We'll guide you through a journaling exercise to help you process your thoughts and emotions.";
  const quotes = [
    "The life of every man is a diary in which he means to write one story, and writes another.",
    "Journal writing is a voyage to the interior.",
    "Fill your paper with the breathings of your heart.",
  ];

  useEffect(() => {
    Voice.onSpeechResults = onSpeechResults;
    Voice.onSpeechPartialResults = onSpeechPartialResults;
    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, []);

  const onSpeechResults = (e: SpeechResultsEvent) => {
    if (e.value && e.value.length > 0) {
      const text = e.value[0];
      setJournalEntry((prevEntry) => prevEntry + ' ' + text);
      setPartialResults([]);
    }
  };

  const onSpeechPartialResults = (e: SpeechResultsEvent) => {
    setPartialResults(e.value ?? []);
  };

  const startVoiceRecording = async () => {
    try {
      await Voice.start('en-US');
      setIsRecording(true);
      setPartialResults([]);
    } catch (error) {
      console.error(error);
    }
  };

  const stopVoiceRecording = async () => {
    try {
      await Voice.stop();
      setIsRecording(false);
      setPartialResults([]);
    } catch (error) {
      console.error(error);
    }
  };

  const handleStart = () => {
    setStage('writing');
  };

  const handleSubmitJournal = async () => {
    if (!journalEntry.trim() || !user) return;

    try {
      const userRef = database().ref(`users/${user.uid}`);
      const journalChallengeSnapshot = await userRef.child('challenges/journal').once('value');
      const currentJournalChallengeCount = journalChallengeSnapshot.val() || 0;
      
      const completedChallengesSnapshot = await userRef.child('completedChallenges').once('value');
      const currentLevel = Math.floor(completedChallengesSnapshot.val() / 7) + 1;

      if (currentJournalChallengeCount < currentLevel) {
        await userRef.child('challenges/journal').set(currentJournalChallengeCount + 1);
        await userRef.child('completedChallenges').set(completedChallengesSnapshot.val() + 1);

        Toast.show({
          type: 'success',
          text1: 'Journal Challenge Completed!',
          text2: 'Great job on writing your journal entry!',
          visibilityTime: 3000,
          autoHide: true,
          topOffset: 30,
          bottomOffset: 40,
        });
      }

      // Save the journal entry to the user's journal
      const entriesRef = database().ref(`users/${user.uid}/entries`);
      const newEntryRef = entriesRef.push();
      await newEntryRef.set({
        date: new Date().toISOString().split('T')[0],
        content: journalEntry.trim(),
      });

      setStage('finished');
    } catch (error) {
      console.error('Failed to submit journal entry:', error);
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
          {Array.from({ length: 10 }).map((_, index) => (
            <View key={index} style={[styles.line, { borderColor: colors.text }]} />
          ))}
        </View>
        <TextInput
          style={[styles.journalInput, { color: colors.text }]}
          value={journalEntry + (partialResults.length > 0 ? ' ' + partialResults[0] : '')}
          onChangeText={setJournalEntry}
          placeholder="Write your thoughts..."
          placeholderTextColor={colors.text}
          multiline
        />
      </View>
    );
  };

  const renderContent = () => {
    switch (stage) {
      case 'instructions':
        return (
          <>
            <Text style={[styles.text, { color: colors.text }]}>{instructions}</Text>
            <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]} onPress={handleStart}>
              <Text style={styles.buttonText}>Start</Text>
            </TouchableOpacity>
          </>
        );
      case 'writing':
        return (
          <>
            <Text style={[styles.title, { color: colors.text }]}>Write Your Journal</Text>
            {renderJournalInput()}
            <View style={styles.buttonContainer}>
              <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]} onPress={handleSubmitJournal}>
                <Text style={styles.buttonText}>Submit Journal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.voiceButton, { backgroundColor: isRecording ? colors.error : colors.primary }]}
                onPress={isRecording ? stopVoiceRecording : startVoiceRecording}
              >
                <Icon name={isRecording ? "mic-off" : "mic"} size={24} color={colors.background} />
              </TouchableOpacity>
            </View>
          </>
        );
      case 'finished':
        return (
          <>
            <Text style={[styles.text, { color: colors.text }]}>{quotes[Math.floor(Math.random() * quotes.length)]}</Text>
            <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]} onPress={() => setStage('instructions')}>
              <Text style={styles.buttonText}>Do it Again</Text>
            </TouchableOpacity>
          </>
        );
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {renderContent()}
      <Toast />
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
  text: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  journalContainer: {
    borderWidth: 1,
    borderColor: '#d0d0d0',
    borderRadius: 8,
    marginBottom: 16,
    height: height * 0.3,
    width: '100%',
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
    width: '100%',
    marginTop: 16,
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
  voiceButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default JournalChallengeScreen;