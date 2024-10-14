import React, { useState, useEffect, forwardRef, useImperativeHandle, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import Icon from 'react-native-vector-icons/MaterialIcons';
import TrackPlayer, { useProgress, usePlaybackState, State } from 'react-native-track-player';

interface MusicPlayerProps {
  music: {
    id: string;
    title: string;
    artist: string;
    fileUrl: string;
  };
  onComplete: () => void;
  challengeCompleted: boolean;
}

export interface MusicPlayerRef {
  cleanup: () => Promise<void>;
}

const MusicPlayer: React.ForwardRefRenderFunction<MusicPlayerRef, MusicPlayerProps> = ({ music, onComplete, challengeCompleted }, ref) => {
  const { colors } = useTheme();
  const progress = useProgress();
  const playbackState = usePlaybackState();
  const trackSet = useRef(false);

  useImperativeHandle(ref, () => ({
    cleanup: async () => {
      await TrackPlayer.reset();
      trackSet.current = false;
    }
  }));

  useEffect(() => {
    const setupTrack = async () => {
      if (!trackSet.current) {
        try {
          await TrackPlayer.reset();
          
          // Use the fileUrl directly without fetching from Firebase Storage
          await TrackPlayer.add({
            id: music.id,
            url: music.fileUrl,  // Use the fileUrl directly
            title: music.title,
            artist: music.artist,
          });
          trackSet.current = true;
        } catch (error) {
          console.error('Error adding track:', error);
        }
      }
    };

    setupTrack();
  }, [music]);

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

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <Text style={[styles.title, { color: colors.text }]}>{music.title}</Text>
      <Text style={[styles.artist, { color: colors.text }]}>{music.artist}</Text>
      <TouchableOpacity style={styles.playButton} onPress={togglePlayback}>
        <Icon 
          name={playbackState.state === State.Playing ? 'pause' : 'play-arrow'} 
          size={48} 
          color={colors.primary} 
        />
      </TouchableOpacity>
      <View style={styles.progressContainer}>
        <View 
          style={[
            styles.progressBar, 
            { 
              backgroundColor: colors.primary, 
              width: `${(progress.position / progress.duration) * 100}%` 
            }
          ]} 
        />
      </View>
      <Text style={[styles.time, { color: colors.text }]}>
        {formatTime(progress.position)} / {formatTime(progress.duration)}
      </Text>
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
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  artist: {
    fontSize: 16,
    marginBottom: 15,
  },
  playButton: {
    marginBottom: 15,
  },
  progressContainer: {
    width: '100%',
    height: 4,
    backgroundColor: '#ddd',
    borderRadius: 2,
    marginBottom: 5,
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
  time: {
    fontSize: 14,
  },
});

export default forwardRef(MusicPlayer);
