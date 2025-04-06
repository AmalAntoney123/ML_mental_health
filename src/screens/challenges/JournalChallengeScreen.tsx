import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Dimensions, Animated } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../utils/auth';
import database from '@react-native-firebase/database';
import Toast from 'react-native-toast-message';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Voice, { SpeechResultsEvent } from '@react-native-voice/voice';
import LottieView from 'lottie-react-native';

const { width, height } = Dimensions.get('window');

const JournalChallengeScreen: React.FC = () => {
  const [stage, setStage] = useState<'instructions' | 'journal' | 'finished'>('instructions');
  const [showReflectionModal, setShowReflectionModal] = useState(false);
  const [journalEntry, setJournalEntry] = useState('');
  const { colors } = useTheme();
  const { user } = useAuth();
  const [isRecording, setIsRecording] = useState(false);
  const [partialResults, setPartialResults] = useState<string[]>([]);
  const animationRef = useRef<LottieView>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [pointsEarned, setPointsEarned] = useState<{
    base: number;
    levelBonus: number;
    total: number;
  } | null>(null);

  const instructions = "Take a moment to reflect on your day. We'll guide you through a journaling exercise to help you process your thoughts and emotions.";
  const quotes = [
    "The life of every man is a diary in which he means to write one story, and writes another.",
    "Journal writing is a voyage to the interior.",
    "Fill your paper with the breathings of your heart.",
  ];

  useEffect(() => {
    Voice.onSpeechResults = onSpeechResults;
    Voice.onSpeechPartialResults = onSpeechPartialResults;
    Voice.onSpeechError = onSpeechError;
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

  const onSpeechError = (e: any) => {
    console.error('Speech recognition error:', e);
    
    // Log additional details about the error
    console.log('Error code:', e.error.code);
    console.log('Error message:', e.error.message);
    console.log('Network info:', JSON.stringify(e.error.networkInfo));
    
    // Only stop recording and show error for certain error codes
    if (['2', '5', '11'].includes(e.error.code)) {
      setIsRecording(false);
      setPartialResults([]);
      
      let errorMessage = 'An error occurred with speech recognition.';
      switch (e.error.code) {
        case '2':
          errorMessage = 'Network error. Please check your internet connection and ensure the app has network permissions.';
          break;
        case '5':
          errorMessage = 'Speech recognition is not available at the moment. Please try again later.';
          break;
        case '11':
          errorMessage = 'Sorry, I didn\'t understand that. Please try again.';
          break;
      }

      Toast.show({
        type: 'error',
        text1: 'Speech Recognition Error',
        text2: errorMessage,
        visibilityTime: 5000,
        autoHide: true,
        topOffset: 30,
        bottomOffset: 40,
      });
    }
    // For error code '7' (No match), we'll just log it without interrupting the user
    else if (e.error.code === '7') {
      console.log('No match found, but continuing transcription');
    }
  };

  const startVoiceRecording = async () => {
    try {
      await Voice.start('en-US');
      setIsRecording(true);
      setPartialResults([]);
    } catch (error) {
      console.error('Error starting voice recording:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to start voice recording. Please try again.',
        visibilityTime: 3000,
        autoHide: true,
        topOffset: 30,
        bottomOffset: 40,
      });
    }
  };

  const stopVoiceRecording = async () => {
    try {
      await Voice.stop();
      setIsRecording(false);
      setPartialResults([]);
    } catch (error) {
      console.error('Error stopping voice recording:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to stop voice recording. Please try again.',
        visibilityTime: 3000,
        autoHide: true,
        topOffset: 30,
        bottomOffset: 40,
      });
    }
  };

  const handleStart = () => {
    setStage('journal');
  };

  const handleFinish = async () => {
    setShowReflectionModal(false);
    setStage('finished');
    animationRef.current?.play();

    if (!user) {
      console.error('No user found');
      return;
    }

    const userId = user.uid;
    const userRef = database().ref(`users/${userId}`);

    try {
      // Initialize points structure if it doesn't exist
      await initializePoints(userRef);

      const userSnapshot = await userRef.once('value');
      const userData = userSnapshot.val();

      if (!userData) {
        console.error('No user data found');
        return;
      }

      // Initialize challenges if they don't exist
      if (!userData.challenges) {
        await userRef.child('challenges').set({
          gratitude: 0,
          mindfulness: 0,
          breathing: 0,
          exercise: 0,
          sleep: 0,
          social: 0,
          journal: 0
        });
      }

      // Initialize completedChallenges if it doesn't exist
      if (typeof userData.completedChallenges !== 'number') {
        await userRef.child('completedChallenges').set(0);
      }

      const currentLevel = Math.floor((userData.completedChallenges || 0) / 7) + 1;
      const currentJournalCount = userData.challenges?.journal || 0;

      if (currentJournalCount < currentLevel) {
        const points = userData.points || { total: 0, weekly: 0, lastReset: new Date().toISOString() };
        
        // Check if points need to be reset
        const lastReset = new Date(points.lastReset);
        const now = new Date();
        const shouldReset = now.getTime() - lastReset.getTime() > 7 * 24 * 60 * 60 * 1000;
        
        if (shouldReset) {
          points.weekly = 0;
          points.lastReset = now.toISOString();
        }

        // Calculate new points
        const basePoints = 100;
        const levelBonus = currentLevel * 50;
        const pointsToAdd = basePoints + levelBonus;

        // Update points
        await userRef.child('points').set({
          total: (points.total || 0) + pointsToAdd,
          weekly: (points.weekly || 0) + pointsToAdd,
          lastReset: points.lastReset
        });

        // Update challenge counts
        await userRef.child('challenges/journal').set(currentJournalCount + 1);
        await userRef.child('completedChallenges').set((userData.completedChallenges || 0) + 1);

        // Set points earned for display
        setPointsEarned({
          base: basePoints,
          levelBonus: levelBonus,
          total: pointsToAdd
        });
      }
    } catch (error) {
      console.error('Error updating journal and completed challenges count:', error);
    }
  };

  const initializePoints = async (userRef: any) => {
    try {
      const pointsSnapshot = await userRef.child('points').once('value');
      if (!pointsSnapshot.exists()) {
        await userRef.child('points').set({
          total: 0,
          weekly: 0,
          lastReset: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error initializing points:', error);
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
      case 'journal':
        return (
          <>
            <Text style={[styles.title, { color: colors.text }]}>Write Your Journal</Text>
            {renderJournalInput()}
            <View style={styles.buttonContainer}>
              <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]} onPress={handleFinish}>
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
          <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.completionIcon, { backgroundColor: colors.primary + '20' }]}>
              <Icon name="checkmark-circle" size={80} color={colors.primary} />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>Great Job!</Text>
            <Text style={[styles.subtitle, { color: colors.text }]}>
              You've completed the journal challenge
            </Text>

            {pointsEarned && (
              <View style={[styles.pointsContainer, { backgroundColor: colors.surface }]}>
                <Text style={[styles.pointsTitle, { color: colors.text }]}>Points Earned</Text>
                <View style={styles.pointsBreakdown}>
                  <View style={styles.pointsRow}>
                    <Text style={[styles.pointsLabel, { color: colors.text }]}>Base Points</Text>
                    <Text style={[styles.pointsValue, { color: colors.primary }]}>+{pointsEarned.base}</Text>
                  </View>
                  <View style={styles.pointsRow}>
                    <Text style={[styles.pointsLabel, { color: colors.text }]}>Level Bonus</Text>
                    <Text style={[styles.pointsValue, { color: colors.primary }]}>+{pointsEarned.levelBonus}</Text>
                  </View>
                  <View style={[styles.totalRow, { borderTopColor: colors.border }]}>
                    <Text style={[styles.totalLabel, { color: colors.text }]}>Total</Text>
                    <Text style={[styles.totalValue, { color: colors.primary }]}>{pointsEarned.total}</Text>
                  </View>
                </View>
              </View>
            )}

            <Text style={[styles.text, { color: colors.text }]}>{quotes[Math.floor(Math.random() * quotes.length)]}</Text>
            <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]} onPress={() => setStage('instructions')}>
              <Text style={styles.buttonText}>Do it Again</Text>
            </TouchableOpacity>
          </View>
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
  completionIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  subtitle: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
  },
  pointsContainer: {
    width: '90%',
    borderRadius: 16,
    padding: 16,
    marginVertical: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  pointsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  pointsBreakdown: {
    width: '100%',
  },
  pointsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  pointsLabel: {
    fontSize: 16,
  },
  pointsValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    marginTop: 8,
    borderTopWidth: 1,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  totalValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
});

export default JournalChallengeScreen;
