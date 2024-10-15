import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Dimensions } from 'react-native';
import { AnimatedCircularProgress } from 'react-native-circular-progress';
import TrackPlayer, { Event, State, usePlaybackState, useProgress } from 'react-native-track-player';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../context/ThemeContext';
import { PanResponder, GestureResponderEvent } from 'react-native';

interface MusicPlayerProps {
  music: {
    id: string;
    title: string;
    artist: string;
    fileUrl: string;
  };
  onComplete: () => void;
  challengeCompleted: boolean;
  onStop: () => void;
}

export interface MusicPlayerRef {
  cleanup: () => Promise<void>;
}

const MusicPlayer: React.ForwardRefRenderFunction<MusicPlayerRef, MusicPlayerProps> = ({ music, onComplete, challengeCompleted, onStop }, ref) => {
  const { colors } = useTheme();
  const progress = useProgress();
  const playbackState = usePlaybackState();
  const trackSet = useRef(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentProgress, setCurrentProgress] = useState(0);

  useImperativeHandle(ref, () => ({
    cleanup: async () => {
      await TrackPlayer.reset();
      trackSet.current = false;
    }
  }));

  useEffect(() => {
    const setupTrack = async () => {
      if (!trackSet.current) {
        setIsLoading(true);
        try {
          await TrackPlayer.reset();
          await TrackPlayer.add({
            id: music.id,
            url: music.fileUrl,
            title: music.title,
            artist: music.artist,
          });
          trackSet.current = true;
          await TrackPlayer.play();
        } catch (error) {
          console.error('Error adding track:', error);
        }
      }
    };

    setupTrack();
  }, [music]);

  useEffect(() => {
    if (progress.position > 0 && progress.duration > 0) {
      setIsLoading(false);
      setCurrentProgress((progress.position / progress.duration) * 100);
    }
  }, [progress.position, progress.duration]);

  useEffect(() => {
    if (playbackState.state === State.Playing) {
      setIsLoading(false);
    }
  }, [playbackState.state]);

  useEffect(() => {
    if (progress.position >= 600 && !challengeCompleted) {
      onComplete();
    }
  }, [progress.position, challengeCompleted, onComplete]);

  const togglePlayback = async () => {
    try {
      if (playbackState.state === State.Playing) {
        await TrackPlayer.pause();
      } else {
        await TrackPlayer.play();
      }
    } catch (error) {
      console.error('Error toggling playback:', error);
    }
  };

  const seekTo = async (percentage: number) => {
    const duration = await TrackPlayer.getDuration();
    const position = (percentage / 100) * duration;
    await TrackPlayer.seekTo(position);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (event) => {
        // Only respond to touches outside the play button area
        const { locationX, locationY } = event.nativeEvent;
        const centerX = 100;
        const centerY = 100;
        const distance = Math.sqrt(Math.pow(locationX - centerX, 2) + Math.pow(locationY - centerY, 2));
        return distance > 40; // Adjust this value based on your play button size
      },
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (event: GestureResponderEvent) => handleSeek(event),
      onPanResponderMove: (event: GestureResponderEvent) => handleSeek(event),
    })
  ).current;

  const handleSeek = (event: GestureResponderEvent) => {
    const { locationX, locationY } = event.nativeEvent;
    const centerX = 100;
    const centerY = 100;
    const angle = Math.atan2(locationY - centerY, locationX - centerX);
    let percentage = ((angle + Math.PI) / (2 * Math.PI)) * 100;
    percentage = (percentage + 75) % 100; // Adjust for starting position (top)
    seekTo(percentage);
  };

  const handleStop = async () => {
    await TrackPlayer.stop();
    onStop();  // Call the onStop prop
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <Text style={[styles.title, { color: colors.text }]}>{music.title}</Text>
      <Text style={[styles.artist, { color: colors.text }]}>{music.artist}</Text>
      
      <View style={styles.progressWrapper}>
        <View {...panResponder.panHandlers} style={styles.panResponderView}>
          {isLoading ? (
            <ActivityIndicator size="large" color={colors.primary} />
          ) : (
            <AnimatedCircularProgress
              size={200}
              width={15}
              fill={currentProgress}
              tintColor={colors.primary}
              backgroundColor={colors.border}
              rotation={0}
              lineCap="round"
            />
          )}
        </View>
        <TouchableOpacity 
          style={styles.playButton} 
          onPress={togglePlayback}
        >
          <Icon 
            name={playbackState.state === State.Playing ? 'pause' : 'play-arrow'} 
            size={64} 
            color={colors.primary} 
          />
        </TouchableOpacity>
      </View>
      
      <View style={styles.timeContainer}>
        <Text style={[styles.timeText, { color: colors.text }]}>
          {formatTime(progress.position)} / {formatTime(progress.duration)}
        </Text>
      </View>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.button, { backgroundColor: colors.primary }]} 
          onPress={togglePlayback}
        >
          <Icon 
            name={playbackState.state === State.Playing ? 'pause' : 'play-arrow'} 
            size={32} 
            color="white" 
          />
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.button, { backgroundColor: colors.error }]} 
          onPress={handleStop}
        >
          <Icon name="stop" size={32} color="white" />
        </TouchableOpacity>
      </View>
      
      {challengeCompleted && (
        <Text style={[styles.completedText, { color: colors.success }]}>Challenge Completed!</Text>
      )}
    </View>
  );
};

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 20,
    width: Dimensions.get('window').width - 40,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  artist: {
    fontSize: 18,
    marginBottom: 24,
    textAlign: 'center',
    opacity: 0.8,
  },
  progressWrapper: {
    marginBottom: 24,
    position: 'relative',
  },
  panResponderView: {
    width: 200,
    height: 200,
  },
  playButton: {
    position: 'absolute',
    top: 60,
    left: 60,
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  time: {
    fontSize: 16,
    fontWeight: '500',
  },
  seekButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 20,
  },
  seekButton: {
    padding: 10,
    backgroundColor: '#e0e0e0',
    borderRadius: 5,
  },
  seekButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  completedText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    textAlign: 'center',
  },
  timeContainer: {
    marginTop: 10,
    alignItems: 'center',
  },
  timeText: {
    fontSize: 16,
    fontWeight: '500',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  button: {
    padding: 10,
    borderRadius: 25,
    marginHorizontal: 10,
  },
});

export default forwardRef(MusicPlayer);
