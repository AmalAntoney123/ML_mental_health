import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Modal } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import LottieView from 'lottie-react-native';
import { useAuth } from '../../utils/auth';
import database from '@react-native-firebase/database';
import { ProgressBar } from 'react-native-paper';

const exercises = [
  { name: 'Jumping Jacks', duration: 30, animation: require('../../assets/lottie/jumping-jacks.json') },
  { name: 'Push-ups', duration: 30, animation: require('../../assets/lottie/push-ups.json') },
  { name: 'Mountain Climbers', duration: 30, animation: require('../../assets/lottie/mountain-climbers.json') },
  { name: 'Squats', duration: 30, animation: require('../../assets/lottie/squats.json') },
  { name: 'Burpees', duration: 30, animation: require('../../assets/lottie/burpees.json') },
];

const ExerciseScreen: React.FC = () => {
  const [stage, setStage] = useState<'instructions' | 'workout' | 'finished'>('instructions');
  const [currentExercise, setCurrentExercise] = useState(0);
  const [timeLeft, setTimeLeft] = useState(exercises[0].duration);
  const [isActive, setIsActive] = useState(false);
  const [isResting, setIsResting] = useState(false);
  const [showReflectionModal, setShowReflectionModal] = useState(false);
  const [showCompleteButton, setShowCompleteButton] = useState(false);

  const { colors } = useTheme();
  const { user } = useAuth();
  const animationRef = useRef<LottieView>(null);
  const exerciseAnimationRef = useRef<LottieView>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const totalTime = exercises.reduce((sum, exercise) => sum + exercise.duration, 0) + (exercises.length - 1) * 10;

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((time) => time - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      if (!isResting) {
        setShowCompleteButton(true);
      } else {
        moveToNextExercise();
      }
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, timeLeft, isResting]);

  const moveToNextExercise = () => {
    if (currentExercise < exercises.length - 1) {
      setCurrentExercise((prev) => prev + 1);
      setTimeLeft(exercises[currentExercise + 1].duration);
      setIsResting(false);
      setShowCompleteButton(false);
      exerciseAnimationRef.current?.play();
    } else {
      setIsActive(false);
      setShowReflectionModal(true);
    }
  };

  const handleStart = () => {
    setStage('workout');
    setIsActive(true);
    exerciseAnimationRef.current?.play();
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  };

  const handleCompleteExercise = () => {
    setShowCompleteButton(false);
    setTimeLeft(10);
    setIsResting(true);
  };

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

        if (userData.challenges.exercise < currentLevel) {
          const newExerciseCount = userData.challenges.exercise + 1;
          await userRef.child('challenges/exercise').set(newExerciseCount);

          const newCompletedChallengesCount = userData.completedChallenges + 1;
          await userRef.child('completedChallenges').set(newCompletedChallengesCount);
        }

        const exerciseRef = userRef.child('exerciseEntries').push();
        await exerciseRef.set({
          date: new Date().toISOString(),
          duration: totalTime,
          type: 'HIIT Workout'
        });
      } catch (error) {
        console.error('Error updating exercise entry and completed challenges count:', error);
      }
    }
  };

  const renderContent = () => {
    switch (stage) {
      case 'instructions':
        return (
          <>
            <Text style={[styles.title, { color: colors.text }]}>5-Minute HIIT Workout</Text>
            <Text style={[styles.text, { color: colors.text }]}>
              Get ready for a quick and effective workout! Complete 5 exercises, each for 30 seconds, with 10 seconds of rest between.
            </Text>
            <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]} onPress={handleStart}>
              <Text style={styles.buttonText}>Start Workout</Text>
            </TouchableOpacity>
          </>
        );
        case 'workout':
          return (
            <Animated.View style={{ opacity: fadeAnim, width: '100%', alignItems: 'center' }}>
              <Text style={[styles.timer, { color: colors.text }]}>{timeLeft}s</Text>
              
              <Text style={[styles.text, { color: colors.text, marginBottom: 10 }]}>
                Exercise {currentExercise + 1} of {exercises.length}
              </Text>
              
              {!isResting && (
                <LottieView
                  ref={exerciseAnimationRef}
                  source={exercises[currentExercise].animation}
                  style={styles.exerciseAnimation}
                  loop={true}
                  autoPlay={true}
                />
              )}
              
              <Text style={[styles.subtitle, { color: colors.text, marginTop: 20 }]}>
                {isResting ? 'Rest' : exercises[currentExercise].name}
              </Text>
              
              <ProgressBar
                progress={(currentExercise + (isResting ? 1 : 0)) / exercises.length}
                color={colors.primary}
                style={styles.progressBar}
              />
              
              {showCompleteButton && (
                <TouchableOpacity
                  style={[styles.button, { backgroundColor: colors.primary }]}
                  onPress={handleCompleteExercise}
                >
                  <Text style={styles.buttonText}>Complete Exercise</Text>
                </TouchableOpacity>
              )}
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
            <Text style={[styles.text, { color: colors.text }]}>You've completed the 5-minute HIIT workout. Keep up the great work!</Text>
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
            <Text style={[styles.modalTitle, { color: colors.text }]}>Workout Complete!</Text>
            <Text style={[styles.modalText, { color: colors.text }]}>
              Great job on finishing your 5-minute HIIT workout!
            </Text>
            <Text style={[styles.modalText, { color: colors.text, marginTop: 10 }]}>
              How do you feel?
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
  timer: {
    fontSize: 48,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  exerciseAnimation: {
    width: 200,
    height: 200,
    marginVertical: 20,
  },
});

export default ExerciseScreen;