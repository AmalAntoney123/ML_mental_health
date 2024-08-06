import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Modal } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import LottieView from 'lottie-react-native';
import { useAuth } from '../../utils/auth';
import database from '@react-native-firebase/database';
import { ProgressBar } from 'react-native-paper';

const yogaPoses = [
  { name: 'Mountain Pose', duration: 30, animation: require('../../assets/lottie/mountain-pose.json') },
  { name: 'Downward Dog', duration: 30, animation: require('../../assets/lottie/downward-dog.json') },
  { name: 'Warrior I', duration: 30, animation: require('../../assets/lottie/warrior.json') },
  { name: 'Tree Pose', duration: 30, animation: require('../../assets/lottie/tree-pose.json') },
  { name: 'Child\'s Pose', duration: 30, animation: require('../../assets/lottie/child-pose.json') },
];

const ExerciseScreen: React.FC = () => {
  const [stage, setStage] = useState<'instructions' | 'yoga' | 'finished'>('instructions');
  const [currentPose, setCurrentPose] = useState(0);
  const [timeLeft, setTimeLeft] = useState(yogaPoses[0].duration);
  const [isActive, setIsActive] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showReflectionModal, setShowReflectionModal] = useState(false);
  const [showCompleteButton, setShowCompleteButton] = useState(false);

  const { colors } = useTheme();
  const { user } = useAuth();
  const animationRef = useRef<LottieView>(null);
  const poseAnimationRef = useRef<LottieView>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const totalTime = yogaPoses.reduce((sum, pose) => sum + pose.duration, 0) + (yogaPoses.length - 1) * 5;

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((time) => time - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      if (!isTransitioning) {
        setShowCompleteButton(true);
      } else {
        moveToNextPose();
      }
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, timeLeft, isTransitioning]);

  const moveToNextPose = () => {
    if (currentPose < yogaPoses.length - 1) {
      setCurrentPose((prev) => prev + 1);
      setTimeLeft(yogaPoses[currentPose + 1].duration);
      setIsTransitioning(false);
      setShowCompleteButton(false);
      poseAnimationRef.current?.play();
    } else {
      setIsActive(false);
      setShowReflectionModal(true);
    }
  };

  const handleStart = () => {
    setStage('yoga');
    setIsActive(true);
    poseAnimationRef.current?.play();
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  };

  const handleCompletePose = () => {
    setShowCompleteButton(false);
    setTimeLeft(5);
    setIsTransitioning(true);
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
          const newYogaCount = userData.challenges.exercise + 1;
          await userRef.child('challenges/exercise').set(newYogaCount);

          const newCompletedChallengesCount = userData.completedChallenges + 1;
          await userRef.child('completedChallenges').set(newCompletedChallengesCount);
        }

      } catch (error) {
        console.error('Error updating yoga entry and completed challenges count:', error);
      }
    }
  };

  const renderContent = () => {
    switch (stage) {
      case 'instructions':
        return (
          <>
            <Text style={[styles.title, { color: colors.text }]}>5-Minute Yoga Session</Text>
            <Text style={[styles.text, { color: colors.text }]}>
              Get ready for a quick and relaxing yoga session! Complete 5 poses, each for 30 seconds, with 5 seconds of transition between.
            </Text>
            <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]} onPress={handleStart}>
              <Text style={styles.buttonText}>Start Yoga</Text>
            </TouchableOpacity>
          </>
        );
      case 'yoga':
        return (
          <Animated.View style={{ opacity: fadeAnim, width: '100%', alignItems: 'center' }}>
            <Text style={[styles.timer, { color: colors.text }]}>{timeLeft}s</Text>

            <Text style={[styles.text, { color: colors.text, marginBottom: 10 }]}>
              Pose {currentPose + 1} of {yogaPoses.length}
            </Text>

            {!isTransitioning && (
              <LottieView
                ref={poseAnimationRef}
                source={yogaPoses[currentPose].animation}
                style={styles.animation}
                loop={true}
                autoPlay={true}
              />
            )}

            <Text style={[styles.subtitle, { color: colors.text, marginTop: 20 }]}>
              {isTransitioning ? 'Transition' : yogaPoses[currentPose].name}
            </Text>

            <View style={{ borderWidth: 1,width: '100%' }}>
              <ProgressBar
              progress={(currentPose + (isTransitioning ? 1 : 0)) / yogaPoses.length}
              color={colors.primary}
                style={styles.progressBar}
              />
            </View>

            {showCompleteButton && (
              <TouchableOpacity
                style={[styles.button, { backgroundColor: colors.primary }]}
                onPress={handleCompletePose}
              >
                <Text style={styles.buttonText}>Complete Pose</Text>
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
            <Text style={[styles.title, { color: colors.text }]}>Namaste!</Text>
            <Text style={[styles.text, { color: colors.text }]}>You've completed the 5-minute yoga session. Great job on nurturing your mind and body!</Text>
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
            <Text style={[styles.modalTitle, { color: colors.text }]}>Yoga Session Complete!</Text>
            <Text style={[styles.modalText, { color: colors.text }]}>
              Great job on finishing your 5-minute yoga session!
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