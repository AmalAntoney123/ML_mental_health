import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../utils/auth';
import database from '@react-native-firebase/database';
import MusicPlayer, { MusicPlayerRef } from '../../components/MusicPlayer';

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
  const { colors } = useTheme();
  const { user } = useAuth();
  const playerRef = useRef<MusicPlayerRef>(null);

  useEffect(() => {
    fetchSleepMusic();
    return () => {
      // Cleanup the player when component unmounts
      if (playerRef.current) {
        playerRef.current.cleanup();
      }
    };
  }, []);

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

  const handleMusicSelect = (music: SleepMusic) => {
    setSelectedMusic(music);
  };

  const handleMusicComplete = async () => {
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
  };

  const handleSkip = () => {
    setStage('finished');
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
              Listen to relaxing sleep music for at least 10 minutes to complete this challenge.
            </Text>
            <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]} onPress={handleStart}>
              <Text style={styles.buttonText}>Start</Text>
            </TouchableOpacity>
          </>
        );
      case 'music':
        return (
          <>
            <FlatList
              data={sleepMusic}
              renderItem={renderMusicItem}
              keyExtractor={(item) => item.id}
              style={styles.musicList}
            />
            {selectedMusic && (
              <MusicPlayer
                ref={playerRef}
                music={selectedMusic}
                onComplete={handleMusicComplete}
                challengeCompleted={challengeCompleted}
              />
            )}
            <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]} onPress={handleSkip}>
              <Text style={styles.buttonText}>Skip Challenge</Text>
            </TouchableOpacity>
          </>
        );
      case 'finished':
        return (
          <>
            <Text style={[styles.text, { color: colors.text }]}>
              {challengeCompleted
                ? "Great job! You've completed the sleep challenge."
                : "You've skipped the sleep challenge. Remember, good sleep is essential for your well-being."}
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
    minWidth: 120,
    alignItems: 'center',
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
});

export default SleepScreen;
