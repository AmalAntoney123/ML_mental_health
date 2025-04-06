import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Animated, Modal } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import LottieView from 'lottie-react-native';
import { useAuth } from '../../utils/auth';
import database from '@react-native-firebase/database';
import { ProgressBar } from 'react-native-paper';
import Icon from 'react-native-vector-icons/FontAwesome';

const GratitudeScreen: React.FC = () => {
  const [stage, setStage] = useState<'instructions' | 'gratitude' | 'finished'>('instructions');
  const [gratitudeEntries, setGratitudeEntries] = useState<string[]>([]);
  const [currentEntry, setCurrentEntry] = useState('');
  const [showReflectionModal, setShowReflectionModal] = useState(false);
  const [pointsEarned, setPointsEarned] = useState<{
    base: number;
    levelBonus: number;
    total: number;
  } | null>(null);
  const { colors } = useTheme();
  const { user } = useAuth();
  const animationRef = useRef<LottieView>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const totalEntries = 5;
  const instructions = `Take a moment to reflect on ${totalEntries} things you're grateful for. Let's start this journey of appreciation together!`;

  const handleStart = () => {
    setStage('gratitude');
    setGratitudeEntries([]);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  };

  const handleAddEntry = () => {
    if (currentEntry.trim()) {
      const newEntries = [...gratitudeEntries, currentEntry.trim()];
      setGratitudeEntries(newEntries);
      setCurrentEntry('');

      if (newEntries.length === totalEntries) {
        setShowReflectionModal(true);
      }
    }
  };
  const renderGratitudeList = () => (
    <ScrollView style={styles.modalEntriesContainer}>
      {gratitudeEntries.map((entry, index) => (
        <Text key={index} style={[styles.modalEntryText, { color: colors.text }]}>
          {index + 1}. {entry}
        </Text>
      ))}
    </ScrollView>
  );

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
      const currentGratitudeCount = userData.challenges?.gratitude || 0;

      if (currentGratitudeCount < currentLevel) {
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
        await userRef.child('challenges/gratitude').set(currentGratitudeCount + 1);
        await userRef.child('completedChallenges').set((userData.completedChallenges || 0) + 1);

        // Set points earned for display
        setPointsEarned({
          base: basePoints,
          levelBonus: levelBonus,
          total: pointsToAdd
        });
      }
    } catch (error) {
      console.error('Error updating gratitude entry and completed challenges count:', error);
    }
  };

  const renderContent = () => {
    switch (stage) {
      case 'instructions':
        return (
          <>
            <Text style={[styles.title, { color: colors.text }]}>Gratitude Exercise</Text>
            <Text style={[styles.text, { color: colors.text }]}>{instructions}</Text>
            <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]} onPress={handleStart}>
              <Text style={styles.buttonText}>Start</Text>
            </TouchableOpacity>
          </>
        );
      case 'gratitude':
        return (
          <Animated.View style={{ opacity: fadeAnim, width: '100%' }}>
            <Text style={[styles.subtitle, { color: colors.text }]}>
              {gratitudeEntries.length}/{totalEntries} Grateful Thoughts
            </Text>
            <ProgressBar
              progress={gratitudeEntries.length / totalEntries}
              color={colors.primary}
              style={styles.progressBar}
            />
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.text }]}
              placeholder="Enter something you're grateful for..."
              placeholderTextColor={colors.text}
              value={currentEntry}
              onChangeText={setCurrentEntry}
              onSubmitEditing={handleAddEntry}
            />
            <TouchableOpacity style={[styles.addButton, { backgroundColor: colors.primary }]} onPress={handleAddEntry}>
              <Text style={styles.buttonText}>Add</Text>
            </TouchableOpacity>
            <ScrollView style={styles.entriesContainer}>
              {gratitudeEntries.map((entry, index) => (
                <Text key={index} style={[styles.entryText, { color: colors.text }]}>
                  • {entry}
                </Text>
              ))}
            </ScrollView>
          </Animated.View>
        );
      case 'finished':
        return (
          <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.completionIcon, { backgroundColor: colors.primary + '20' }]}>
              <Icon name="check-circle" size={80} color={colors.primary} />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>Great Job!</Text>
            <Text style={[styles.subtitle, { color: colors.text }]}>
              You've completed your gratitude exercise
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

            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.primary }]}
              onPress={() => setStage('instructions')}
            >
              <Text style={styles.buttonText}>Do it Again</Text>
            </TouchableOpacity>
          </View>
        );
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {renderContent()}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showReflectionModal}
        onRequestClose={() => setShowReflectionModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Reflect on Your Gratitude</Text>
            <Text style={[styles.modalText, { color: colors.text }]}>
              Take a moment to reflect on all the things you're grateful for:
            </Text>
            {renderGratitudeList()}
            <Text style={[styles.modalText, { color: colors.text, marginTop: 10 }]}>
              How do these make you feel?
            </Text>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.primary }]}
              onPress={handleFinish}
            >
              <Text style={styles.buttonText}>Finish</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  text: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
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
  input: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 5,
    padding: 10,
    marginBottom: 10,
  },
  addButton: {
    padding: 10,
    borderRadius: 5,
    minWidth: 80,
    alignItems: 'center',
    marginBottom: 10,
  },
  entriesContainer: {
    width: '100%',
    maxHeight: 200,
    marginBottom: 20,
  },
  entryText: {
    fontSize: 16,
    marginBottom: 5,
  },
  progressBar: {
    width: '100%',
    height: 10,
    marginBottom: 20,
  },
  animation: {
    width: 200,
    height: 200,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    padding: 20,
    borderRadius: 10,
    width: '80%',
    maxHeight: '80%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 16,
    marginBottom: 10,
    textAlign: 'center',
  },
  modalEntriesContainer: {
    width: '100%',
    maxHeight: 200, // Limit the height of the entries list
  },
  modalEntryText: {
    fontSize: 16,
    marginBottom: 5,
    textAlign: 'left',
  },
  completionIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  pointsContainer: {
    padding: 20,
    borderRadius: 10,
    marginBottom: 20,
  },
  pointsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  pointsBreakdown: {
    width: '100%',
  },
  pointsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  pointsLabel: {
    fontSize: 16,
  },
  pointsValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
  },
  totalLabel: {
    fontSize: 16,
  },
  totalValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default GratitudeScreen;