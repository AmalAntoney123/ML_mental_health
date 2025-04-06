import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Animated } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../utils/auth';
import database from '@react-native-firebase/database';
import MusicPlayer, { MusicPlayerRef } from '../../components/MusicPlayer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LottieView from 'lottie-react-native';

interface SleepMusic {
  id: string;
  title: string;
  artist: string;
  fileUrl: string;
}

const SleepScreen: React.FC = () => {
  const [stage, setStage] = useState<'instructions' | 'music' | 'finished'>('instructions');
  const [sleepMusic, setSleepMusic] = useState<SleepMusic[]>([]);
  const [selectedMusic, setSelectedMusic] = useState<SleepMusic | null>(null);
  const [challengeCompleted, setChallengeCompleted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [lastPlayedMusic, setLastPlayedMusic] = useState<SleepMusic | null>(null);
  const [showReflectionModal, setShowReflectionModal] = useState(false);
  const [pointsEarned, setPointsEarned] = useState<{
    base: number;
    levelBonus: number;
    total: number;
  } | null>(null);
  const { colors } = useTheme();
  const { user } = useAuth();
  const playerRef = useRef<MusicPlayerRef>(null);
  const animationRef = useRef<LottieView>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchSleepMusic();
    loadLastPlayedMusic();
    return () => {
      if (playerRef.current) {
        playerRef.current.cleanup();
      }
    };
  }, []);

  const loadLastPlayedMusic = async () => {
    try {
      const lastPlayed = await AsyncStorage.getItem('lastPlayedMusic');
      if (lastPlayed) {
        const parsedMusic = JSON.parse(lastPlayed);
        setLastPlayedMusic(parsedMusic);
        setSelectedMusic(parsedMusic);
        setIsPlaying(true);
        setStage('music');
      }
    } catch (error) {
      console.error('Error loading last played music:', error);
    }
  };

  const fetchSleepMusic = async () => {
    const musicRef = database().ref('sleepMusic');
    const snapshot = await musicRef.once('value');
    const musicData = snapshot.val();
    if (musicData) {
      const musicList: SleepMusic[] = Object.entries(musicData).map(([id, data]: [string, any]) => ({
        id,
        title: data.title,
        artist: data.artist,
        fileUrl: data.fileUrl,
      }));
      setSleepMusic(musicList);
    }
  };

  const handleStart = () => {
    setStage('music');
  };

  const handleMusicSelect = async (music: SleepMusic) => {
    setSelectedMusic(music);
    setLastPlayedMusic(music);
    setIsPlaying(true);
    AsyncStorage.setItem('lastPlayedMusic', JSON.stringify(music)).catch(error => {
      console.error('Error saving last played music:', error);
    });
    await handleMusicComplete();
    // Reset the stop timer when selecting new music
    if (playerRef.current) {
      playerRef.current.setStopTimer(null);
    }
  };

  const handleMusicComplete = async () => {
    if (!challengeCompleted) {
      setChallengeCompleted(true);
      if (user) {
        const userRef = database().ref(`users/${user.uid}`);
        const snapshot = await userRef.once('value');
        const userData = snapshot.val();
        const currentLevel = Math.floor(userData.completedChallenges / 7) + 1;

        if (userData.challenges.sleep < currentLevel) {
          await userRef.child('challenges/sleep').set(userData.challenges.sleep + 1);
          await userRef.child('completedChallenges').set(userData.completedChallenges + 1);
        }
      }
    }
  };

  const handleStop = () => {
    setSelectedMusic(null);
    setIsPlaying(false);
    setLastPlayedMusic(null);
    AsyncStorage.removeItem('lastPlayedMusic').catch(error => {
      console.error('Error removing last played music:', error);
    });
    if (playerRef.current) {
      playerRef.current.cleanup();
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
      const currentSleepCount = userData.challenges?.sleep || 0;

      if (currentSleepCount < currentLevel) {
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
        await userRef.child('challenges/sleep').set(currentSleepCount + 1);
        await userRef.child('completedChallenges').set((userData.completedChallenges || 0) + 1);

        // Set points earned for display
        setPointsEarned({
          base: basePoints,
          levelBonus: levelBonus,
          total: pointsToAdd
        });
      }
    } catch (error) {
      console.error('Error updating sleep and completed challenges count:', error);
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

  const renderMusicItem = ({ item }: { item: SleepMusic }) => (
    <TouchableOpacity
      style={[styles.musicItem, { backgroundColor: colors.surface }]}
      onPress={() => handleMusicSelect(item)}
    >
      <Text style={[styles.musicTitle, { color: colors.text }]}>{item.title}</Text>
      <Text style={[styles.musicArtist, { color: colors.text }]}>{item.artist}</Text>
    </TouchableOpacity>
  );

  const renderContent = () => {
    switch (stage) {
      case 'instructions':
        return (
          <>
            <Text style={[styles.text, { color: colors.text }]}>
              Enhance your sleep quality with soothing audio designed to calm your mind before bedtime. Select and start a track to complete this challenge. You can stop the audio at any time once the challenge is marked as complete.
            </Text>
            <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]} onPress={handleStart}>
              <Text style={styles.buttonText}>Begin Sleep Challenge</Text>
            </TouchableOpacity>
          </>
        );
      case 'music':
        if (isPlaying || lastPlayedMusic) {
          const currentMusic = selectedMusic || lastPlayedMusic;
          return (
            <>
              {currentMusic && (
                <MusicPlayer
                  ref={playerRef}
                  music={currentMusic}
                  onComplete={handleMusicComplete}
                  challengeCompleted={challengeCompleted}
                  onStop={handleStop}
                />
              )}
              <View style={styles.buttonContainer}>
                <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]} onPress={handleFinish}>
                  <Text style={styles.buttonText}>Finish Challenge</Text>
                </TouchableOpacity>
              </View>
            </>
          );
        }
        return (
          <>
            <FlatList
              data={sleepMusic}
              renderItem={renderMusicItem}
              keyExtractor={(item) => item.id}
              style={styles.musicList}
            />
            <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]} onPress={handleFinish}>
              <Text style={styles.buttonText}>Finish Challenge</Text>
            </TouchableOpacity>
          </>
        );
      case 'finished':
        return (
          <>
            <Text style={[styles.text, { color: colors.text }]}>
              {challengeCompleted
                ? "Great job! You've completed the sleep challenge."
                : "You've finished the sleep challenge. Remember, good sleep is essential for your well-being."}
            </Text>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.primary }]}
              onPress={() => setStage('instructions')}
            >
              <Text style={styles.buttonText}>Do it Again</Text>
            </TouchableOpacity>
          </>
        );
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {renderContent()}
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
  button: {
    padding: 15,
    borderRadius: 25,
    minWidth: 200,
    alignItems: 'center',
    marginVertical: 10,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  musicList: {
    width: '100%',
    marginBottom: 20,
  },
  musicItem: {
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  musicTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  musicArtist: {
    fontSize: 14,
  },
  buttonContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    width: '100%',
  },
});

export default SleepScreen;
