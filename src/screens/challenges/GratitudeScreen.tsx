import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Animated, Modal } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import LottieView from 'lottie-react-native';
import { useAuth } from '../../utils/auth';
import database from '@react-native-firebase/database';
import { ProgressBar } from 'react-native-paper';

const GratitudeScreen: React.FC = () => {
  const [stage, setStage] = useState<'instructions' | 'gratitude' | 'finished'>('instructions');
  const [gratitudeEntries, setGratitudeEntries] = useState<string[]>([]);
  const [currentEntry, setCurrentEntry] = useState('');
  const [showReflectionModal, setShowReflectionModal] = useState(false);
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

  const handleFinish = async () => {
    setShowReflectionModal(false);
    setStage('finished');
    animationRef.current?.play();

    if (user) {
      const userId = user.uid;
      const userRef = database().ref(`users/${userId}`);

      try {
        const userSnapshot = await userRef.once('value');
        const userData = userSnapshot.val();

        const currentLevel = Math.floor(userData.completedChallenges / 7) + 1;

        if (userData.challenges.gratitude < currentLevel) {
          const newGratitudeCount = userData.challenges.gratitude + 1;
          await userRef.child('challenges/gratitude').set(newGratitudeCount);

          const newCompletedChallengesCount = userData.completedChallenges + 1;
          await userRef.child('completedChallenges').set(newCompletedChallengesCount);
        }

        const gratitudeRef = userRef.child('gratitudeEntries').push();
        await gratitudeRef.set({
          date: new Date().toISOString(),
          entries: gratitudeEntries
        });
      } catch (error) {
        console.error('Error updating gratitude and completed challenges count:', error);
      }
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
          <>
            <LottieView
              ref={animationRef}
              source={require('../../assets/lottie/gratitude-animation.json')}
              autoPlay={true}
              loop={true}
              style={styles.animation}
            />
            <Text style={[styles.title, { color: colors.text }]}>Congratulations!</Text>
            <Text style={[styles.text, { color: colors.text }]}>You've completed the gratitude exercise. Keep nurturing this positive mindset!</Text>
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
});

export default GratitudeScreen;